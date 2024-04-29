import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class SetPlayerVisionModifierMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.SetPlayerVisionModifier as const;
    messageTag = MouthwashRpcMessageTag.SetPlayerVisionModifier as const;

    constructor(public readonly playerVision: number) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const playerVision = reader.float();
        return new SetPlayerVisionModifierMessage(playerVision);
    }

    Serialize(writer: HazelWriter) {
        writer.float(this.playerVision);
    }
}