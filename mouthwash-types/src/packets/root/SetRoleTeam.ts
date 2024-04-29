import { BaseRootMessage, HazelReader, HazelWriter, RoleTeamType } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class SetRoleTeamMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetRoleTeam as const;
    messageTag = MouthwashRootMessageTag.SetRoleTeam as const;

    constructor(
        public readonly roleTeam: RoleTeamType
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const roleTeam = reader.uint8();
        return new SetRoleTeamMessage(roleTeam);
    }

    Serialize(writer: HazelWriter) {
        writer.uint8(this.roleTeam);
    }
}