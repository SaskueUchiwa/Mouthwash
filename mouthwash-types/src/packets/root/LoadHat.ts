import {
    BaseRootMessage,
    HazelReader,
    HazelWriter
} from "@skeldjs/hindenburg";

import { MouthwashRootMessageTag } from "../../enums";

export class LoadHatMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.LoadHat as const;
    messageTag = MouthwashRootMessageTag.LoadHat as const;

    constructor(
        public readonly hatId: string,
        public readonly resourceId: number,
        public readonly isFree: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const hatId = reader.string();
        const resourceId = reader.upacked();
        const isFree = reader.bool();
        return new LoadHatMessage(hatId, resourceId, isFree);
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.hatId);
        writer.upacked(this.resourceId);
        writer.bool(this.isFree);
    }
}