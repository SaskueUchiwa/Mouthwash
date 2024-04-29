import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class AllowTaskInteractionMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.AllowTaskInteraction as const;
    messageTag = MouthwashRootMessageTag.AllowTaskInteraction as const;

    constructor(
        public readonly taskInteraction: boolean,
        public readonly forced: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const taskInteraction = reader.bool();
        const forced = reader.bool();
        return new AllowTaskInteractionMessage(taskInteraction, forced);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.taskInteraction);
        writer.bool(this.forced);
    }
}