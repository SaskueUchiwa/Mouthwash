import { v4 as uuidv4 } from "uuid";

import {
    Color,
    Connection,
    Hat,
    Pet,
    PlayerData,
    QuickChatMessageData,
    Room,
    SendQuickChatMessage,
    Skin,
    Visor
} from "@skeldjs/hindenburg";

import {
    ChatMessageAlignment,
    ChatPlayerAppearance,
    DeleteChatMessageMessage,
    Palette,
    RGBA,
    SetChatMessageMessage
} from "mouthwash-types";

import { MouthwashApiPlugin } from "../../plugin";

export class ChatMessage {
    deletedFor: WeakSet<Connection>;

    constructor(
        public readonly uuid: string,
        public readonly alignment: ChatMessageAlignment|undefined,
        public readonly playerAppearance: ChatPlayerAppearance,
        public readonly messageContent: QuickChatMessageData|string,
        public readonly sender: PlayerData<Room>|undefined,
        public readonly recipients: Connection[]|undefined
    ) {
        this.deletedFor = new WeakSet;
    }
}

export class ChatService {
    messages: Map<string, ChatMessage>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.messages = new Map;
    }

    getStandardAppearance(sender: PlayerData, isVote: boolean) {
        const playerColor = RGBA.playerBody(sender.playerInfo?.defaultOutfit.color ?? Color.Red);

        return new ChatPlayerAppearance(
            sender.playerInfo?.defaultOutfit.name ?? "???",
            sender.playerInfo?.isDead ?? false,
            isVote,
            sender.playerInfo?.defaultOutfit.hatId ?? Hat.NoHat,
            sender.playerInfo?.defaultOutfit.petId ?? Pet.EmptyPet,
            sender.playerInfo?.defaultOutfit.skinId ?? Skin.None,
            sender.playerInfo?.defaultOutfit.visorId ?? Visor.EmptyVisor,
            playerColor.dark,
            playerColor.light,
            Palette.playerVisor // standard visor colour
        );
    }

    getStandardRecipients(sender: PlayerData<Room>) {
        const recipients: Connection[] = [];

        if (!sender.playerInfo) {
            return recipients;
        }

        const fromIsDead = this.plugin.spoofInfoService.isDead(sender);

        if (fromIsDead) {
            for (const [ clientId, connection ] of sender.room.connections) {
                const player = sender.room.players.get(clientId);
    
                if (player?.playerInfo?.isDead) {
                    recipients.push(connection);
                }
            }
            
            return recipients;
        }

        return undefined;
    }

    createMessage(content: string|QuickChatMessageData, appearance: ChatPlayerAppearance, sender: PlayerData<Room>) {
        const uuid = uuidv4().replace(/-/g, "");

        const chatMessage = new ChatMessage(
            uuid,
            undefined,
            appearance,
            content,
            sender,
            undefined
        );

        this.messages.set(uuid, chatMessage);

        return chatMessage;
    }

    createMessageFor(content: string|QuickChatMessageData, appearance: ChatPlayerAppearance, sender: PlayerData<Room>, recipients: Connection[]|undefined) {
        const uuid = uuidv4().replace(/-/g, "");

        const chatMessage = new ChatMessage(
            uuid,
            undefined,
            appearance,
            content,
            sender,
            recipients
        );

        this.messages.set(uuid, chatMessage);

        return chatMessage;
    }

    async broadcastMessage(chatMessage: ChatMessage) {
        const senderConnnection = chatMessage.sender
            ? this.plugin.room.connections.get(chatMessage.sender.clientId)
            : undefined;

        if (senderConnnection) {
            await this.plugin.room.broadcastMessages([], [
                new SetChatMessageMessage(
                    chatMessage.uuid,
                    chatMessage.alignment || ChatMessageAlignment.Right,
                    chatMessage.playerAppearance,
                    0,
                    typeof chatMessage.messageContent === "string"
                        ? chatMessage.messageContent
                        : new SendQuickChatMessage(chatMessage.messageContent)
                )
            ], [ senderConnnection ]);
        }

        await this.plugin.room.broadcastMessages([], [
            new SetChatMessageMessage(
                chatMessage.uuid,
                chatMessage.alignment || ChatMessageAlignment.Left,
                chatMessage.playerAppearance,
                0,
                typeof chatMessage.messageContent === "string"
                    ? chatMessage.messageContent
                    : new SendQuickChatMessage(chatMessage.messageContent)
            )
        ], chatMessage.recipients, senderConnnection ? [ senderConnnection ] : undefined);
    }

    async deleteMessage(uuid: string, recipients?: Connection[]) {
        const chatMessage = this.messages.get(uuid);

        if (chatMessage) {
            if (recipients) {
                for (const recipient of recipients) {
                    chatMessage.deletedFor.add(recipient);
                }
            } else {
                for (const [ , connection ] of this.plugin.room.connections) {
                    chatMessage.deletedFor.add(connection);
                }
            }
        }

        await this.plugin.room.broadcastMessages([], [
            new DeleteChatMessageMessage(uuid)
        ], recipients);
    }

    getMessagesFor(recipient: Connection, includeDeleted = false) {
        const messages: ChatMessage[] = [];
        for (const [ , chatMessage ] of this.messages) {
            if (chatMessage.recipients && !chatMessage.recipients.find((r => recipient.clientId === r.clientId)))
                continue;

            if (chatMessage.deletedFor.has(recipient) && !includeDeleted)
                continue;

            messages.push(chatMessage);
        }
        return messages;
    }
}