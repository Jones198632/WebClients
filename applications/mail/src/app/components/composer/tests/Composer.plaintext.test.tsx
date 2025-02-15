import { fireEvent } from '@testing-library/dom';
import { MIME_TYPES } from '@proton/shared/lib/constants';
import { clearAll, createDocument, waitForSpyCall } from '../../../helpers/test/helper';
import { render } from '../../../helpers/test/render';
import Composer from '../Composer';
import { ID, prepareMessage, props } from './Composer.test.helpers';
import * as useSaveDraft from '../../../hooks/message/useSaveDraft';

jest.setTimeout(20000);

// In this test, switching from plaintext to html will trigger autosave
// But encryption and save requests are not the point of this test so it's easier and faster to mock that logic
jest.mock('../../../hooks/message/useSaveDraft', () => {
    const saveSpy = jest.fn(() => Promise.resolve());
    return {
        saveSpy,
        useCreateDraft: () => () => Promise.resolve(),
        useSaveDraft: () => saveSpy,
        useDeleteDraft: () => () => Promise.resolve(),
    };
});

const saveSpy = (useSaveDraft as any).saveSpy as jest.Mock;

const mockSetContent = jest.fn();
jest.mock('@proton/components/components/editor/rooster/helpers/getRoosterEditorActions', () => {
    let content = '';
    return function () {
        return {
            getContent: () => {
                return content;
            },
            setContent: (nextContent: string) => {
                content = nextContent;
                mockSetContent(nextContent);
            },
            focus: () => {},
        };
    };
});

describe('Composer switch plaintext <-> html', () => {
    afterEach(clearAll);

    it('should switch from plaintext to html content without loosing content', async () => {
        const content = 'content';

        prepareMessage({
            localID: ID,
            data: {
                MIMEType: 'text/plain' as MIME_TYPES,
                ToList: [],
            },
            messageDocument: {
                plainText: content,
            },
        });

        const { findByTestId } = await render(<Composer {...props} messageID={ID} />);

        const toHtmlButton = await findByTestId('editor-to-html');
        fireEvent.click(toHtmlButton);

        await findByTestId('rooster-iframe');

        await waitForSpyCall(mockSetContent);

        expect(mockSetContent).toHaveBeenCalledWith(
            `<div style="font-family: arial; font-size: 14px;">${content}</div>`
        );

        // Wait for auto save
        await waitForSpyCall(saveSpy);
    });

    it('should switch from html to plaintext content without loosing content', async () => {
        const content = `
          <div>content line 1<br><div>
          <div>content line 2<br><div>
        `;

        prepareMessage({
            localID: ID,
            data: {
                MIMEType: 'text/html' as MIME_TYPES,
                ToList: [],
            },
            messageDocument: {
                document: createDocument(content),
            },
        });

        const { findByTestId } = await render(<Composer {...props} messageID={ID} />);

        const moreDropdown = await findByTestId('editor-toolbar-more');
        fireEvent.click(moreDropdown);

        const toHtmlButton = await findByTestId('editor-to-plaintext');
        fireEvent.click(toHtmlButton);

        const textarea = (await findByTestId('editor-textarea')) as HTMLTextAreaElement;

        expect(textarea.value).toBe('content line 1\ncontent line 2');

        // Wait for auto save
        await waitForSpyCall(saveSpy);
    });
});
