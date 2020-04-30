import { Api } from 'proton-shared/lib/interfaces';
import { getMessage, markMessageAsRead } from 'proton-shared/lib/api/messages';

import { MessageExtended, MessageExtendedWithData, PartialMessageExtended } from '../../models/message';

export const loadMessage = async (message: MessageExtended, api: Api): Promise<MessageExtendedWithData> => {
    // If the Body is already there, no need to send a request
    if (!message.data?.Body) {
        const { Message } = await api(getMessage(message.data?.ID));
        return { ...message, data: Message };
    }
    return message as MessageExtendedWithData;
};

export const markAsRead = async (
    message: MessageExtendedWithData,
    api: Api,
    call: () => Promise<void>
): Promise<PartialMessageExtended> => {
    const markAsRead = async () => {
        await api(markMessageAsRead([message.data.ID]));
        await call();
    };

    if (message.data.Unread) {
        markAsRead(); // No await to not slow down the UX
        return { data: { Unread: 0 } };
    }

    return {};
};
