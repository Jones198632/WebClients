import { AES256 } from '../constants';
import { base64StringToUint8Array } from '../helpers/encoding';

export const toSessionKey = (decryptedKeyPacket: string) => {
    return { algorithm: AES256, data: base64StringToUint8Array(decryptedKeyPacket) };
};
