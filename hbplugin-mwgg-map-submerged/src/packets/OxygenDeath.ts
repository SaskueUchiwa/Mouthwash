import { BaseRpcMessage } from "@skeldjs/protocol";
import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SubmergedRpcMessageTag } from "../enums";

export class OxygenDeathMessage extends BaseRpcMessage {
    static messageTag = SubmergedRpcMessageTag.OxygenDeath as const;
    messageTag = SubmergedRpcMessageTag.OxygenDeath as const;

    victimNetId: number;

    constructor(victimNetId: number) {
        super();

        this.victimNetId = victimNetId;
    }

    static Deserialize(reader: HazelReader) {
        const victimNetId = reader.upacked();

        return new OxygenDeathMessage(victimNetId);
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.victimNetId);
    }

    clone() {
        return new OxygenDeathMessage(this.victimNetId);
    }
}
