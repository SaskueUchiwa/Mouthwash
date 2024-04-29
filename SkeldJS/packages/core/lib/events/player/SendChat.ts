import { BasicEvent } from "@skeldjs/events";
import { RoomEvent } from "../RoomEvent";
import { ProtocolEvent } from "../ProtocolEvent";
import { PlayerEvent } from "./PlayerEvent";
import { Hostable } from "../../Hostable";
import { PlayerData } from "../../PlayerData";
import { SendChatMessage } from "@skeldjs/protocol";

/**
 * Emitted when a player sends a free chat message. See {@link PlayerSendQuickChatEvent}
 * to listen for quick chat messages.
 *
 * Due to technical impossibilities, this event cannot be canceled or reverted.
 */
export class PlayerSendChatEvent<RoomType extends Hostable = Hostable> extends BasicEvent implements RoomEvent, PlayerEvent, ProtocolEvent {
    static eventName = "player.chat" as const;
    eventName = "player.chat" as const;

    constructor(
        public readonly room: RoomType,
        public readonly player: PlayerData<RoomType>,
        public readonly message: SendChatMessage|undefined,
        /**
         * The message that the player sent.
         */
        public readonly chatMessage: string
    ) {
        super();
    }
}
