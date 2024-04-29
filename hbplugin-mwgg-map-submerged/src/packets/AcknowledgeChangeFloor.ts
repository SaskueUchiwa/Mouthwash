import { BaseRpcMessage } from "@skeldjs/protocol";
import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SubmergedRpcMessageTag } from "../enums";

export class AcknowledgeChangeFloorMessage extends BaseRpcMessage {
    static messageTag = SubmergedRpcMessageTag.AcknowledgeChangeFloor as const;
    messageTag = SubmergedRpcMessageTag.AcknowledgeChangeFloor as const;

    constructor(
        public readonly physicsNetId: number,
        public readonly sequenceId: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const physicsNetId = reader.packed();
        const sequenceId = reader.int32();

        return new AcknowledgeChangeFloorMessage(physicsNetId, sequenceId);
    }

    Serialize(writer: HazelWriter) {
        writer.packed(this.physicsNetId);
        writer.int32(this.sequenceId);
    }

    clone() {
        return new AcknowledgeChangeFloorMessage(this.physicsNetId, this.sequenceId);
    }
}
