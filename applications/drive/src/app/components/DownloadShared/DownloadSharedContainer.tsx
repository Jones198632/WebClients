import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { c } from 'ttag';

import { useLoading, LoaderPage, Icon, usePreventLeave, useNotifications } from '@proton/components';
import { getApiError } from '@proton/shared/lib/api/helpers/apiErrorHelper';
import { SRPHandshakeInfo, TransferStatePublic } from '@proton/shared/lib/interfaces/drive/sharing';
import { STATUS_CODE, SupportedMimeTypes } from '@proton/shared/lib/drive/constants';
import { getAppName } from '@proton/shared/lib/apps/helper';
import { APPS } from '@proton/shared/lib/constants';
import { LinkType } from '@proton/shared/lib/interfaces/drive/link';

import { hasCustomPassword, hasGeneratedPasswordIncluded } from '../../store';
import { reportError } from '../../store/utils';
import usePublicSharing, {
    ERROR_CODE_INVALID_SRP_PARAMS,
    SharedURLInfoDecrypted,
} from '../../hooks/drive/usePublicSharing';
import DownloadSharedInfo from './DownloadSharedInfo';
import EnterPasswordInfo from './EnterPasswordInfo';
import LinkError from './LinkError';

const REPORT_ABUSE_EMAIL = 'abuse@protonmail.com';
const ERROR_CODE_INVALID_TOKEN = 2501;

const calcTransferProgressPercentage = (progressInBytes?: number, transferSize?: number) => {
    if (progressInBytes === undefined || transferSize === undefined) {
        return 0;
    }

    return Math.round((progressInBytes / transferSize) * 100);
};

const DownloadSharedContainer = () => {
    const [error, setError] = useState<string | undefined>();
    const [loading, withLoading] = useLoading(false);
    const [handshakeInfo, setHandshakeInfo] = useState<SRPHandshakeInfo | null>();
    const [linkInfo, setLinkInfo] = useState<(SharedURLInfoDecrypted & { password: string }) | null>();
    const publicSharing = usePublicSharing();
    const { hash, pathname } = useLocation();
    const { preventLeave } = usePreventLeave();
    const { createNotification } = useNotifications();
    const appName = getAppName(APPS.PROTONDRIVE);

    const [progress, setProgress] = useState<number>();
    const [transferSize, setTransferSize] = useState<number | undefined>(undefined);
    const [transferState, setTransferState] = useState<TransferStatePublic>();

    const token = useMemo(() => pathname.replace(/\/urls\/?/, ''), [pathname]);
    const urlPassword = useMemo(() => hash.replace('#', ''), [hash]);
    const [password, setPassword] = useState(urlPassword);
    const [withCustomPassword, setWithCustomPassword] = useState(false);

    const getShareURLInfo = async (token: string, password: string) => {
        const urlInfo = await publicSharing.getSharedURLInfo(token, password);
        setLinkInfo({ ...urlInfo, password });
    };

    const downloadFile = async () => {
        if (!linkInfo) {
            return;
        }

        const { name, mimeType, linkID, size, linkType } = linkInfo;

        const transferListItem = {
            isFile: linkType === LinkType.FILE,
            name,
            mimeType: linkType === LinkType.FILE ? mimeType : SupportedMimeTypes.zip,
            size: linkType === LinkType.FILE ? size : 0,
            shareId: '',
            linkId: linkID,
            signatureAddress: '',
        };

        const controls = publicSharing.initDownload(
            token,
            password,
            linkType === LinkType.FILE ? name : `${name}.zip`,
            [transferListItem],
            {
                onInit: (size) => {
                    setTransferSize(size);
                },
                onNetworkError: () => {
                    controls.cancel();
                    setTransferState(TransferStatePublic.Error);
                    setError(c('Title').t`The file or folder failed to be downloaded`);
                },
                onProgress: (bytes) => {
                    setProgress((currentProgress) => {
                        return (currentProgress || 0) + bytes;
                    });
                },
            }
        );

        setTransferState(TransferStatePublic.Progress);

        return preventLeave(
            controls
                .start()
                .then(() => {
                    setTransferState(TransferStatePublic.Done);
                })
                .catch((error) => {
                    setTransferState(TransferStatePublic.Error);
                    setError(c('Title').t`The file or folder failed to be downloaded`);
                    reportError(error);
                })
        );
    };

    /**
     * handleInitialLoadError processes error from initializing handshake
     * or session. It provides custom message in case of not existing link,
     * otherwise it uses the message from API. Any non-structured error is
     * converted to general message about failure and is reported to Sentry.
     */
    const handleInitialLoadError = (error: any) => {
        const apiError = getApiError(error);

        setLinkInfo(null);

        if (apiError.status === STATUS_CODE.NOT_FOUND || apiError.code === ERROR_CODE_INVALID_TOKEN) {
            setError(c('Title').t`The link either does not exist or has expired`);
            return;
        }

        // Any other message from API, for example "Volume is not available".
        if (apiError.message) {
            setError(apiError.message);
            return;
        }

        setError(c('Title').t`The link failed to be loaded`);
        reportError(error);
    };

    const submitPassword = async (customPassword: string) => {
        let password = customPassword;
        if (handshakeInfo && hasGeneratedPasswordIncluded(handshakeInfo)) {
            password = urlPassword + customPassword;
        }

        await publicSharing
            .initHandshake(token)
            .then(async (handshakeInfoNew) => {
                return publicSharing
                    .initSession(token, password, handshakeInfoNew)
                    .then(() => {
                        setHandshakeInfo(handshakeInfoNew);
                        return getShareURLInfo(token, password);
                    })
                    .catch((error) => {
                        const apiError = getApiError(error);
                        if (apiError.code === ERROR_CODE_INVALID_SRP_PARAMS) {
                            setPassword('');
                            createNotification({
                                type: 'error',
                                text: c('Error').t`Incorrect password. Please try again.`,
                            });
                            return;
                        }

                        throw error;
                    });
            })
            .catch((error) => {
                handleInitialLoadError(error);
            });
    };

    useEffect(() => {
        if (token && !handshakeInfo) {
            setError(undefined);
        }
    }, [token, password, handshakeInfo]);

    const downloadLinkThumbnail = useMemo(async () => {
        if (!linkInfo?.linkID || !linkInfo?.thumbnailURLInfo.BareURL || !linkInfo.thumbnailURLInfo.Token) {
            return null;
        }

        const thumbnailData = await publicSharing.downloadThumbnail(linkInfo.linkID, linkInfo.thumbnailURLInfo);

        return URL.createObjectURL(new Blob(thumbnailData, { type: 'image/jpeg' }));
    }, [linkInfo]);

    useEffect(() => {
        void withLoading(
            publicSharing
                .initHandshake(token)
                .then((handshakeInfo) => {
                    setHandshakeInfo(handshakeInfo);
                    if (hasCustomPassword(handshakeInfo)) {
                        setWithCustomPassword(true);
                        return;
                    }

                    return publicSharing.initSession(token, password, handshakeInfo).then(() => {
                        return getShareURLInfo(token, password);
                    });
                })
                .catch((error) => {
                    handleInitialLoadError(error);
                })
        );
    }, []);

    if (loading) {
        return <LoaderPage />;
    }

    let content: ReactNode = null;
    if (error || (!token && !password)) {
        content = <LinkError error={error || c('Title').t`The link does not exist`} />;
    } else if (linkInfo) {
        const transferProgressPercentage = calcTransferProgressPercentage(progress, transferSize);

        content = (
            <DownloadSharedInfo
                name={linkInfo.name}
                size={linkInfo.linkType === LinkType.FILE ? linkInfo.size : null}
                MIMEType={linkInfo.mimeType}
                expirationTime={linkInfo.expirationTime}
                downloadThumbnail={downloadLinkThumbnail}
                downloadFile={downloadFile}
                progress={transferProgressPercentage}
                transferState={transferState}
            />
        );
    } else if (withCustomPassword) {
        content = <EnterPasswordInfo submitPassword={submitPassword} />;
    }

    const getAccountLabel = c('Label').t`Get your own ${appName}`;

    return (
        content && (
            <>
                <div className="ui-standard flex flex-column flex-nowrap flex-item-noshrink flex-align-items-center scroll-if-needed h100v p1">
                    <div className="bg-norm color-norm flex flex-align-items-center flex-item-noshrink w100 max-w37e mbauto mtauto border rounded">
                        <div className="flex flex-column flex-nowrap flex-align-items-center text-center p2 pb0 w100">
                            <h3>
                                <span className="flex flex-nowrap flex-align-items-center">
                                    <Icon name="brand-proton-drive" className="mr0-25" size={20} />
                                    <b>{appName}</b>
                                </span>
                            </h3>
                            {content}
                        </div>
                        <div className="flex flex-justify-center w100 m1-5">
                            <Link to="/" className="text-sm m0" title={getAccountLabel}>
                                {getAccountLabel}
                            </Link>
                        </div>
                    </div>
                    <div className="color-weak flex flex-item-noshrink flex-justify-self-end flex-align-items-end on-mobile-pt1">
                        <div className="text-center opacity-50 mb0-5 mt0-5">
                            <a
                                className="text-sm signup-footer-link"
                                href={`mailto:${REPORT_ABUSE_EMAIL}`}
                                title={c('Label').t`Report abuse`}
                            >
                                {c('Label').t`Report abuse`}
                            </a>
                        </div>
                    </div>
                </div>
            </>
        )
    );
};

export default DownloadSharedContainer;
