import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class ReportDeadBodyMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.ReportDeadBody as const;
    messageTag = MouthwashRpcMessageTag.ReportDeadBody as const;

    constructor(public readonly reporterNetId: number) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const reporterNetId = reader.upacked();
        return new ReportDeadBodyMessage(reporterNetId);
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.reporterNetId);
    }
}