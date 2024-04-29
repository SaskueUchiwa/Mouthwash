import { Connection, SendChatMessage } from "@skeldjs/hindenburg";
import { InfractionSeverity, MouthwashAntiCheatPlugin } from "../plugin";
import { InfractionName } from "../enums";

export class ChatModule {
    protected lastMessages: WeakMap<Connection, Date>;

    constructor(public readonly plugin: MouthwashAntiCheatPlugin) {
        this.lastMessages = new WeakMap;
    }

    async onChatMessage(sender: Connection, chatRpcMessage: SendChatMessage) {
        const lastMessageTime = this.lastMessages.get(sender);
        if (lastMessageTime) {
            const delta = Date.now() - lastMessageTime.getTime();
            if (delta < 3000) {
                return this.plugin.createInfraction(sender, InfractionName.RateLimitedRpcSendChat, { delta },
                    delta < 1000 ? InfractionSeverity.Medium : InfractionSeverity.Low);
            }
        }

        this.lastMessages.set(sender, new Date);
        return undefined;
    }
}