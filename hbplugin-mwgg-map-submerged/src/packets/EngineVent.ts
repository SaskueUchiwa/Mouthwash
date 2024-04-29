import { BaseRpcMessage } from "@skeldjs/protocol";
import { HazelReader } from "@skeldjs/util";
import { SubmergedRpcMessageTag } from "../enums";

export class EngineVentMessage extends BaseRpcMessage {
    static messageTag = SubmergedRpcMessageTag.EngineVent as const;
    messageTag = SubmergedRpcMessageTag.EngineVent as const;

    constructor() {
        super();
    }

    static Deserialize(reader: HazelReader) {
        return new EngineVentMessage;
    }

    clone() {
        return new EngineVentMessage;
    }
}
