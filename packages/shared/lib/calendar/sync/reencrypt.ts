import { SessionKey } from 'pmcrypto';
import { upgradeP2PInvite } from '../../api/calendars';
import { uint8ArrayToBase64String } from '../../helpers/encoding';
import { Api } from '../../interfaces';
import { CalendarEvent, DecryptedCalendarKey } from '../../interfaces/calendar';
import { getEncryptedSessionKey } from '../encrypt';
import { getPrimaryCalendarKey } from '../../keys/calendarKeys';

export const reencryptCalendarSharedEvent = async ({
    calendarEvent,
    sharedSessionKey,
    calendarKeys,
    api,
}: {
    calendarEvent: CalendarEvent;
    sharedSessionKey: SessionKey;
    calendarKeys: DecryptedCalendarKey[];
    api: Api;
}): Promise<CalendarEvent> => {
    const { publicKey } = getPrimaryCalendarKey(calendarKeys);

    const SharedKeyPacket = uint8ArrayToBase64String(await getEncryptedSessionKey(sharedSessionKey, publicKey));

    await api(upgradeP2PInvite(calendarEvent.CalendarID, calendarEvent.ID, { SharedKeyPacket }));

    return {
        ...calendarEvent,
        SharedKeyPacket,
        AddressKeyPacket: null,
        AddressID: null,
    };
};
