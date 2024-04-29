import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class SetTaskCountsMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetTaskCounts as const;
    messageTag = MouthwashRootMessageTag.SetTaskCounts as const;

    constructor(
        public readonly totalTasks: number,
        public readonly tasksCompleted: number,
        public readonly numPlayersWithTasks: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const totalTasks = reader.upacked();
        const tasksCompleted = reader.upacked();
        const numPlayersWithTasks = reader.upacked();
        return new SetTaskCountsMessage(totalTasks, tasksCompleted, numPlayersWithTasks);
    }

    Serialize(writer: HazelWriter) {
        writer.upacked(this.totalTasks);
        writer.upacked(this.tasksCompleted);
        writer.upacked(this.numPlayersWithTasks);
    }
}