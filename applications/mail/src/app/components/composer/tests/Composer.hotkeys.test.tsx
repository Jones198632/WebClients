import { MIME_TYPES } from '@proton/shared/lib/constants';
import { fireEvent } from '@testing-library/dom';
import {
    clearAll,
    createDocument,
    addApiKeys,
    addApiMock,
    waitForNotification,
    generateKeys,
    addKeysToAddressKeysCache,
    GeneratedKey,
    tick,
} from '../../../helpers/test/helper';
import { ID, prepareMessage, renderComposer, toAddress, AddressID, fromAddress } from './Composer.test.helpers';

describe('Composer hotkeys', () => {
    let fromKeys: GeneratedKey;

    beforeAll(async () => {
        fromKeys = await generateKeys('me', fromAddress);
    });

    beforeEach(clearAll);

    const setup = async () => {
        addKeysToAddressKeysCache(AddressID, fromKeys);

        const message = prepareMessage({
            messageDocument: { document: createDocument('test') },
            data: { MIMEType: MIME_TYPES.DEFAULT },
        });

        addApiKeys(false, toAddress, []);

        const result = await renderComposer(message.localID);

        const iframe = result.container.querySelector('iframe') as HTMLIFrameElement;

        return {
            ...result,
            iframe,
            esc: () => fireEvent.keyDown(iframe, { key: 'Escape' }),
            ctrlEnter: () => fireEvent.keyDown(iframe, { key: 'Enter', ctrlKey: true }),
            ctrlAltBackspace: () => fireEvent.keyDown(iframe, { key: 'Backspace', ctrlKey: true, altKey: true }),
            ctrlS: () => fireEvent.keyDown(iframe, { key: 'S', ctrlKey: true }),
            ctrlM: () => fireEvent.keyDown(iframe, { key: 'M', ctrlKey: true }),
            ctrlShftM: () => fireEvent.keyDown(iframe, { key: 'M', ctrlKey: true, shiftKey: true }),
            ctrlShftA: () => fireEvent.keyDown(iframe, { key: 'A', ctrlKey: true, shiftKey: true }),
            ctrlShftE: () => fireEvent.keyDown(iframe, { key: 'E', ctrlKey: true, shiftKey: true }),
            ctrlShftX: () => fireEvent.keyDown(iframe, { key: 'X', ctrlKey: true, shiftKey: true }),
        };
    };

    it('should close composer on escape', async () => {
        const { container, esc } = await setup();

        esc();

        const composer = container.querySelector('.composer-container');

        expect(composer).toBe(null);
    });

    it('should send on meta + enter', async () => {
        const { ctrlEnter } = await setup();

        const sendSpy = jest.fn(() => Promise.resolve({ Sent: {} }));
        addApiMock(`mail/v4/messages/${ID}`, sendSpy, 'post');

        ctrlEnter();

        await waitForNotification('Message sent');

        expect(sendSpy).toHaveBeenCalled();
    });

    it('should delete on meta + alt + enter', async () => {
        const deleteSpy = jest.fn(() => Promise.resolve({}));
        addApiMock(`mail/v4/messages/delete`, deleteSpy, 'put');

        const { ctrlAltBackspace } = await setup();

        await tick();

        ctrlAltBackspace();

        await waitForNotification('Draft discarded');

        expect(deleteSpy).toHaveBeenCalled();
    });

    it('should save on meta + S', async () => {
        const saveSpy = jest.fn(() => Promise.resolve({}));
        addApiMock(`mail/v4/messages/${ID}`, saveSpy, 'put');

        const { ctrlS } = await setup();

        ctrlS();

        await waitForNotification('Draft saved');

        expect(saveSpy).toHaveBeenCalled();
    });

    it('should open attachment on meta + shift + A', async () => {
        const { getByTestId, ctrlShftA } = await setup();

        const attachmentsButton = getByTestId('composer:attachment-button');
        const attachmentSpy = jest.fn();
        attachmentsButton.addEventListener('click', attachmentSpy);

        ctrlShftA();

        expect(attachmentSpy).toHaveBeenCalled();
    });

    it('should open encryption modal on meta + shift + E', async () => {
        const { getByText, ctrlShftE } = await setup();

        ctrlShftE();

        getByText('Encrypt for non-Proton users');
    });

    it('should open encryption modal on meta + shift + X', async () => {
        const { getByText, ctrlShftX } = await setup();

        ctrlShftX();

        getByText('Expiration Time');
    });
});
