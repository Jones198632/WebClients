import { useRef, useState, useEffect, memo } from 'react';
import { c } from 'ttag';
import { useLocation } from 'react-router-dom';
import {
    Searchbox,
    useLabels,
    useFolders,
    PrivateHeader,
    FloatingButton,
    MainLogo,
    Tooltip,
    TopNavbarListItemSettingsDropdown,
    TopNavbarListItemContactsDropdown,
    Icon,
    DropdownMenuButton,
    useUserSettings,
    useMailSettings,
    MailShortcutsModal,
    MailDensityModal,
    MailViewLayoutModal,
    MailComposerModeModal,
    AppsDropdownWithDiscoverySpotlight,
    useModalState,
} from '@proton/components';
import { MAILBOX_LABEL_IDS, APPS, VIEW_LAYOUT, DENSITY, COMPOSER_MODE } from '@proton/shared/lib/constants';
import { Recipient } from '@proton/shared/lib/interfaces';
import { isFirefox } from '@proton/shared/lib/helpers/browser';
import AdvancedSearchDropdown from './AdvancedSearchDropdown';
import { extractSearchParameters, setParamsInUrl } from '../../helpers/mailboxUrl';
import { Breakpoints } from '../../models/utils';
import { getLabelName } from '../../helpers/labels';
import { useEncryptedSearchContext } from '../../containers/EncryptedSearchProvider';
import { useOnCompose, useOnMailTo } from '../../containers/ComposeProvider';
import { MESSAGE_ACTIONS } from '../../constants';
import MailDefaultHandlerModal from './MailDefaultHandlerModal';
import ClearBrowserDataModal from './ClearBrowserDataModal';

interface Props {
    labelID: string;
    elementID: string | undefined;
    breakpoints: Breakpoints;
    onSearch: (keyword?: string, labelID?: string) => void;
    expanded?: boolean;
    onToggleExpand: () => void;
}

const MailHeader = ({ labelID, elementID, breakpoints, expanded, onToggleExpand, onSearch }: Props) => {
    const [{ Density }] = useUserSettings();
    const [{ Shortcuts, ComposerMode, ViewLayout } = { Shortcuts: 0, ComposerMode: 0, ViewLayout: 0 }] =
        useMailSettings();
    const location = useLocation();
    const { keyword = '' } = extractSearchParameters(location);
    const [value, updateValue] = useState(keyword);
    const oldLabelIDRef = useRef<string>(MAILBOX_LABEL_IDS.INBOX);
    const [labels = []] = useLabels();
    const [folders = []] = useFolders();
    const { cacheIndexedDB, getESDBStatus } = useEncryptedSearchContext();
    const { dbExists, esEnabled } = getESDBStatus();

    const onCompose = useOnCompose();
    const onMailTo = useOnMailTo();

    const [mailShortcutsProps, setMailShortcutsModalOpen] = useModalState();
    const [mailViewLayoutProps, setMailViewLayoutModalOpen] = useModalState();
    const [mailDensityProps, setMailDensityModalOpen] = useModalState();
    const [mailComposerModeProps, setMailComposerModeModalOpen] = useModalState();
    const [mailDefaultHandlerProps, setDefaultHandlerModalOpen] = useModalState();
    const [clearBrowserDataProps, setClearBrowserDataModalOpen] = useModalState();

    // Update the search input field when the keyword in the URL is changed
    useEffect(() => updateValue(keyword), [keyword]);

    const searchDropdown = <AdvancedSearchDropdown keyword={value} isNarrow={breakpoints.isNarrow} />;

    const searchBox = (
        <Searchbox
            delay={0}
            placeholder={c('Placeholder').t`Search messages`}
            onSearch={(keyword) => {
                if (keyword) {
                    oldLabelIDRef.current = labelID;
                }
                onSearch(keyword, keyword ? undefined : oldLabelIDRef.current);
            }}
            onChange={updateValue}
            value={value}
            advanced={searchDropdown}
            onFocus={() => cacheIndexedDB()}
        />
    );

    const handleContactsCompose = (emails: Recipient[], attachments: File[]) => {
        onCompose({
            action: MESSAGE_ACTIONS.NEW,
            referenceMessage: { data: { ToList: emails }, draftFlags: { initialAttachments: attachments } },
        });
    };

    const backUrl = setParamsInUrl(location, { labelID });
    const showBackButton = breakpoints.isNarrow && elementID;
    const labelName = getLabelName(labelID, labels, folders);
    const logo = <MainLogo to="/inbox" />;

    const clearDataButton =
        dbExists || esEnabled ? (
            <>
                <hr className="mt0-5 mb0-5" />
                <Tooltip
                    title={c('Info')
                        .t`Clears browser data related to message content search including downloaded messages`}
                >
                    <DropdownMenuButton
                        onClick={() => setClearBrowserDataModalOpen(true)}
                        className="flex flex-nowrap flex-justify-center"
                    >
                        <span className="color-weak">{c('Action').t`Clear browser data`}</span>
                    </DropdownMenuButton>
                </Tooltip>
            </>
        ) : null;

    return (
        <>
            <PrivateHeader
                logo={logo}
                backUrl={showBackButton && backUrl ? backUrl : undefined}
                title={labelName}
                settingsButton={
                    <TopNavbarListItemSettingsDropdown to="/mail" toApp={APPS.PROTONACCOUNT}>
                        <hr className="mt0-5 mb0-5" />
                        <DropdownMenuButton
                            onClick={() => setMailShortcutsModalOpen(true)}
                            className="flex flex-nowrap flex-justify-space-between flex-align-items-center"
                        >
                            <span className="flex-item-fluid text-left">{c('Action').t`Keyboard shortcuts`}</span>
                            <span className="color-primary ml0-5">
                                {Shortcuts
                                    ? c('Keyboard Shortcuts Enabled').t`On`
                                    : c('Keyboard Shortcuts Disabled').t`Off`}
                            </span>
                        </DropdownMenuButton>
                        <DropdownMenuButton
                            onClick={() => setMailViewLayoutModalOpen(true)}
                            className="flex flex-nowrap flex-justify-space-between flex-align-items-center no-mobile"
                        >
                            <span className="flex-item-fluid text-left">{c('Action').t`Mailbox layout`}</span>
                            <span className="color-primary ml0-5">
                                {ViewLayout === VIEW_LAYOUT.COLUMN
                                    ? c('Layout mode').t`Column`
                                    : c('Layout mode').t`Row`}
                            </span>
                        </DropdownMenuButton>
                        <DropdownMenuButton
                            onClick={() => setMailDensityModalOpen(true)}
                            className="flex flex-nowrap flex-justify-space-between flex-align-items-center"
                        >
                            <span className="flex-item-fluid text-left">{c('Action').t`Mailbox density`}</span>
                            <span className="color-primary flex-item-noshrink ml0-5">
                                {Density === DENSITY.COMFORTABLE
                                    ? c('Density mode').t`Comfortable`
                                    : c('Density mode').t`Compact`}
                            </span>
                        </DropdownMenuButton>
                        <DropdownMenuButton
                            onClick={() => setMailComposerModeModalOpen(true)}
                            className="flex flex-nowrap flex-justify-space-between flex-align-items-center no-mobile"
                        >
                            <span className="flex-item-fluid text-left">{c('Action').t`Composer size`}</span>
                            <span className="color-primary ml0-5">
                                {ComposerMode === COMPOSER_MODE.MAXIMIZED
                                    ? c('Composer size').t`Maximized`
                                    : c('Composer size').t`Normal`}
                            </span>
                        </DropdownMenuButton>
                        {isFirefox() && (
                            <DropdownMenuButton
                                onClick={() => setDefaultHandlerModalOpen(true)}
                                className="flex flex-nowrap flex-justify-space-between flex-align-items-center no-mobile"
                            >
                                <span className="flex-item-fluid text-left">{c('Action')
                                    .t`Default email application`}</span>
                            </DropdownMenuButton>
                        )}
                        {clearDataButton}
                    </TopNavbarListItemSettingsDropdown>
                }
                contactsButton={
                    <TopNavbarListItemContactsDropdown onCompose={handleContactsCompose} onMailTo={onMailTo} />
                }
                searchBox={searchBox}
                searchDropdown={searchDropdown}
                expanded={!!expanded}
                onToggleExpand={onToggleExpand}
                isNarrow={breakpoints.isNarrow}
                appsDropdown={<AppsDropdownWithDiscoverySpotlight />}
                floatingButton={
                    <FloatingButton onClick={() => onCompose({ action: MESSAGE_ACTIONS.NEW })}>
                        <Icon size={24} name="pen" className="mauto" />
                    </FloatingButton>
                }
            />
            <MailShortcutsModal {...mailShortcutsProps} />
            <MailViewLayoutModal {...mailViewLayoutProps} />
            <MailDensityModal {...mailDensityProps} />
            <MailComposerModeModal {...mailComposerModeProps} />
            <MailDefaultHandlerModal {...mailDefaultHandlerProps} />
            <ClearBrowserDataModal {...clearBrowserDataProps} />
        </>
    );
};

export default memo(MailHeader);
