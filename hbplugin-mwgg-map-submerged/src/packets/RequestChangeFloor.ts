import { BaseRpcMessage } from "@skeldjs/protocol";
import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SubmergedRpcMessageTag } from "../enums";
import { PlayerFloor } from "../systems";

export class RequestChangeFloorMessage extends BaseRpcMessage {
    static messageTag = SubmergedRpcMessageTag.RequestChangeFloor as const;
    messageTag = SubmergedRpcMessageTag.RequestChangeFloor as const;

    constructor(
        public readonly targetFloor: PlayerFloor,
        public readonly sequenceId: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const targetFloor = reader.uint8();
        const sequenceId = reader.int32();

        return new RequestChangeFloorMessage(targetFloor, sequenceId);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.targetFloor === PlayerFloor.UpperDeck);
        writer.int32(this.sequenceId);
    }

    clone() {
        return new RequestChangeFloorMessage(this.targetFloor, this.sequenceId);
    }
}
