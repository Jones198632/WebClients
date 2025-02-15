import { useCallback } from 'react';
import { noop } from '@proton/shared/lib/helpers/function';
import { MailSettings } from '@proton/shared/lib/interfaces';

import { classnames } from '../../helpers';

import EditorToolbar from './toolbar/Toolbar';
import { EditorActions, EditorMetadata } from './interface';
import { EDITOR_DEFAULT_METADATA } from './constants';
import useToolbarConfig from './hooks/useToolbarConfig';
import useModalDefaultFont from './hooks/useModalDefaultFont';
import useModalImage from './hooks/useModalImage';
import useModalLink from './hooks/useModalLink';
import RoosterEditor from './rooster/RoosterEditor';
import PlainTextEditor from './plainTextEditor/PlainTextEditor';

interface Props {
    className?: string;
    placeholder?: string;
    metadata?: Partial<EditorMetadata>;
    onChange: (value: string) => void;
    onChangeMetadata?: (metadataChange: Partial<EditorMetadata>) => void;
    showBlockquoteToggle?: boolean;
    onBlockquoteToggleClick?: () => void;
    disabled?: boolean;
    onReady: (editorActions: EditorActions) => void;
    simple?: boolean;
    onFocus?: () => void;
    onAddAttachments?: (files: File[]) => void;
    /**
     * Are used for editor default font value
     * It's optionnal but if passed it should be passed
     * at same time component is first rendered
     */
    mailSettings?: MailSettings;
}

const Editor = ({
    className,
    placeholder,
    metadata: metadataProp,
    onChange = noop,
    onChangeMetadata = noop,
    simple,
    onFocus = noop,
    disabled = false,
    onReady = noop,
    showBlockquoteToggle,
    onBlockquoteToggleClick = noop,
    onAddAttachments,
    mailSettings,
}: Props) => {
    /**
     * Set to true when editor setContent is called by parent components
     * in order to prevent onChange callback
     */
    const metadata: EditorMetadata = { ...EDITOR_DEFAULT_METADATA, ...metadataProp };

    const showModalLink = useModalLink();
    const showModalImage = useModalImage();
    const showModalDefaultFont = useModalDefaultFont();

    const [toolbarConfig, setToolbarConfig] = useToolbarConfig({
        showModalImage,
        showModalLink,
        showModalDefaultFont,
        onChangeMetadata,
        onAddAttachments,
    });

    const onPasteImage = useCallback(
        (imageFile: File) => {
            if (metadata.supportImages) {
                onAddAttachments?.([imageFile]);
            }
        },
        [onAddAttachments, metadata.supportImages]
    );

    return (
        <div
            className={classnames([
                className,
                simple && 'simple-editor',
                'editor w100 h100 rounded flex flex-column-reverse flex-item-fluid',
            ])}
        >
            <div
                className={classnames([
                    'w100 h100 flex-item-fluid flex flex-column relative',
                    disabled && 'editor--disabled',
                ])}
            >
                {metadata.isPlainText ? (
                    <PlainTextEditor
                        onChange={onChange}
                        placeholder={placeholder}
                        onReady={onReady}
                        onFocus={onFocus}
                    />
                ) : (
                    <RoosterEditor
                        placeholder={placeholder}
                        onChange={onChange}
                        onReady={onReady}
                        showBlockquoteToggle={showBlockquoteToggle}
                        onBlockquoteToggleClick={onBlockquoteToggleClick}
                        setToolbarConfig={setToolbarConfig}
                        showModalLink={showModalLink}
                        onFocus={onFocus}
                        mailSettings={mailSettings}
                        onPasteImage={onPasteImage}
                    />
                )}
            </div>

            <EditorToolbar
                config={toolbarConfig}
                metadata={metadata}
                onChangeMetadata={onChangeMetadata}
                mailSettings={mailSettings}
            />
        </div>
    );
};

export default Editor;
