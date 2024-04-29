import { BaseRpcMessage } from "@skeldjs/protocol";
import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SubmergedRpcMessageTag } from "../enums";

export class SetCustomDataMessage extends BaseRpcMessage {
    static messageTag = SubmergedRpcMessageTag.SetCustomData as const;
    messageTag = SubmergedRpcMessageTag.SetCustomData as const;

    constructor(
        public readonly mapLoaded: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const mapLoaded = reader.bool();

        return new SetCustomDataMessage(mapLoaded);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.mapLoaded);
    }

    clone() {
        return new SetCustomDataMessage(this.mapLoaded);
    }
}
