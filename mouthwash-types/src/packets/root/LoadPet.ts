import {
    BaseRootMessage,
    HazelReader,
    HazelWriter
} from "@skeldjs/hindenburg";

import { MouthwashRootMessageTag } from "../../enums";

export class LoadPetMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.LoadPet as const;
    messageTag = MouthwashRootMessageTag.LoadPet as const;

    constructor(
        public readonly petId: string,
        public readonly resourceId: number,
        public readonly isFree: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const petId = reader.string();
        const resourceId = reader.upacked();
        const isFree = reader.bool();
        return new LoadPetMessage(petId, resourceId, isFree);
    }

    Serialize(writer: HazelWriter) {
        writer.string(this.petId);
        writer.upacked(this.resourceId);
        writer.bool(this.isFree);
    }
}