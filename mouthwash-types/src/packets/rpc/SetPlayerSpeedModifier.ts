import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class SetPlayerSpeedModifierMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.SetPlayerSpeedModifier as const;
    messageTag = MouthwashRpcMessageTag.SetPlayerSpeedModifier as const;

    constructor(public readonly playerSpeed: number) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const playerSpeed = reader.float();
        return new SetPlayerSpeedModifierMessage(playerSpeed);
    }

    Serialize(writer: HazelWriter) {
        writer.float(this.playerSpeed);
    }
}