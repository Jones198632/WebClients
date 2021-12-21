import React, { MutableRefObject, useEffect, useState } from 'react';
import { c } from 'ttag';
import { updateFontFace, updateFontSize } from '@proton/shared/lib/api/mailSettings';

import FontSizeSelect from '../../../containers/layouts/FontSizeSelect';
import { DEFAULT_FONT_FACE, DEFAULT_FONT_SIZE } from '../squireConfig';
import FontFaceSelect from '../../../containers/layouts/FontFaceSelect';
import { useMailSettings, useNotifications, useApi, useEventManager } from '../../../hooks';
import { TitleModal, FormModal } from '../../modal';
import { SquireType } from '../interface';

interface Props {
    onClose?: () => void;
    onChange: (nextFontFace: string, nextFontSize: number) => void;
    squireRef: MutableRefObject<SquireType>;
}

const UpdateFontModal = ({ onChange, squireRef, onClose, ...rest }: Props) => {
    const api = useApi();
    const [{ FontFace, FontSize } = { FontFace: undefined, FontSize: undefined }] = useMailSettings();
    const [fontFace, setFontFace] = useState(FontFace || DEFAULT_FONT_FACE);
    const [fontSize, setFontSize] = useState(FontSize || DEFAULT_FONT_SIZE);
    const [loading, setLoading] = useState(false);
    const { createNotification } = useNotifications();
    const { call } = useEventManager();

    const changedFontFace = fontFace !== FontFace;
    const changedFontSize = fontSize !== FontSize;
    const somethingChanged = changedFontFace || changedFontSize;

    useEffect(() => {
        setFontFace(FontFace || DEFAULT_FONT_FACE);
    }, [FontFace]);
    useEffect(() => {
        setFontSize(FontSize || DEFAULT_FONT_SIZE);
    }, [FontSize]);

    const notifyPreferenceSaved = () => createNotification({ text: c('Success').t`Preference saved` });

    const onSubmit = async () => {
        setLoading(true);

        if (changedFontFace) {
            await api(updateFontFace(fontFace));
            squireRef.current.setFontFace(fontFace);
        }

        if (changedFontSize) {
            await api(updateFontSize(fontSize));
            squireRef.current.setFontSize(fontSize.toString());
        }

        if (somethingChanged) {
            await call();
            notifyPreferenceSaved();
        }

        onChange(fontFace, fontSize);

        setLoading(false);
        onClose?.();
    };

    return (
        <FormModal
            {...rest}
            onSubmit={onSubmit}
            loading={loading}
            submitProps={{ disabled: !somethingChanged }}
            onClose={onClose}
            submit={c('Action').t`Update`}
            small
        >
            <div>
                <TitleModal id="update-font-modal" className="mb1">{c('Update font modal')
                    .t`Update default font and size`}</TitleModal>
                <div className="flex flex-row">
                    <div className="mr1">
                        <FontFaceSelect id="fontFace" fontFace={fontFace} onChange={setFontFace} loading={loading} />
                    </div>
                    <div>
                        <FontSizeSelect id="fontSize" fontSize={fontSize} onChange={setFontSize} loading={loading} />
                    </div>
                </div>

                <p>
                    <span className="color-weak">{c('Update font modal')
                        .t`Your default font will look like following:`}</span>
                    <br />
                    <span className="mt0" style={{ fontFamily: fontFace, fontSize: `${fontSize}px` }}>{c(
                        'Update font modal'
                    ).t`Today is a good day to write an email`}</span>
                </p>
            </div>
        </FormModal>
    );
};

export default UpdateFontModal;
