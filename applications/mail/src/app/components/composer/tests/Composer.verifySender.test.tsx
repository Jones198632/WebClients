import loudRejection from 'loud-rejection';
import { getByText as getByTextDefault } from '@testing-library/react';
import { Address, Recipient } from '@proton/shared/lib/interfaces';
import { MIME_TYPES } from '@proton/shared/lib/constants';

import {
    addApiKeys,
    addApiMock,
    addKeysToAddressKeysCache,
    clearAll,
    GeneratedKey,
    generateKeys,
    getModal,
    render,
} from '../../../helpers/test/helper';
import { ID, prepareMessage, props, saveNow, toAddress } from './Composer.test.helpers';
import { addToCache, minimalCache } from '../../../helpers/test/cache';
import Composer from '../Composer';
import { messageID } from '../../message/tests/Message.test.helpers';

loudRejection();

const name1 = 'Address 1';
const name2 = 'Address 2';

const address1 = 'address1@protonmail.com';
const address2 = 'address2@protonmail.com';

const addressID1 = 'AddressID1';
const addressID2 = 'AddressID2';

const addresses: Address[] = [
    {
        DisplayName: name1,
        Email: address1,
        ID: addressID1,
        Send: 1,
        Receive: 1,
        Status: 1,
        Order: 1,
    } as Address,
    {
        DisplayName: name2,
        Email: address2,
        ID: addressID2,
        Send: 0,
        Receive: 0,
        Status: 0,
        Order: 2,
    } as Address,
];

const user = {
    Email: address1,
    DisplayName: name1,
    Name: name1,
    hasPaidMail: true,
    UsedSpace: 10,
    MaxSpace: 100,
};

describe('Composer verify sender', () => {
    let fromKeys: GeneratedKey;

    beforeAll(async () => {
        fromKeys = await generateKeys('me', address1);
    });

    beforeEach(() => {
        addKeysToAddressKeysCache(addressID1, fromKeys);
    });

    afterEach(clearAll);

    const setup = (sender: Recipient) => {
        minimalCache();
        addToCache('Addresses', addresses);
        addToCache('User', user);

        addApiKeys(false, toAddress, []);
        addApiKeys(false, sender.Address, []);

        prepareMessage({
            localID: ID,
            data: {
                ID: messageID,
                MIMEType: MIME_TYPES.PLAINTEXT,
                Sender: sender,
                Flags: 12,
            },
            draftFlags: { isSentDraft: false, openDraftFromUndo: false },
            messageDocument: { plainText: '' },
        });
    };

    it('should display the sender address if the address is valid', async () => {
        const sender = { Name: name1, Address: address1 } as Recipient;
        setup(sender);

        const { findByTestId } = await render(<Composer {...props} />, false);

        const fromField = await findByTestId('composer:from');
        getByTextDefault(fromField, address1);
    });

    it('should display a modal and switch to default address when address is disabled', async () => {
        addApiMock(`mail/v4/messages/${messageID}`, () => ({}));

        const sender = { Name: name2, Address: address2 } as Recipient;
        setup(sender);

        const { findByTestId, container } = await render(<Composer {...props} />, false);

        await saveNow(container);

        // Sender is invalid, so we should see a modal
        const { modal } = await getModal();
        getByTextDefault(modal, 'Sender changed');

        // Then, the from field must have been replaced by the default address
        const fromField = await findByTestId('composer:from');
        getByTextDefault(fromField, address1);
    });

    it("should display a modal and switch to default address when address does not exist in user's addresses", async () => {
        addApiMock(`mail/v4/messages/${messageID}`, () => ({}));

        const sender = { Name: 'Address 3', Address: 'address3@protonmail.com' } as Recipient;
        setup(sender);

        const { findByTestId, container } = await render(<Composer {...props} />, false);

        await saveNow(container);

        // Sender is invalid, so we should see a modal
        const { modal } = await getModal();
        getByTextDefault(modal, 'Sender changed');

        // Then, the from field must have been replaced by the default address
        const fromField = await findByTestId('composer:from');
        getByTextDefault(fromField, address1);
    });
});
