import { BaseRole, Hostable, RoleTeamType, RoleType } from "@skeldjs/hindenburg";

export function BasicMouthwashRole() {
    /**
     * Among Us role with configurable team type
     */
    return class<RoomType extends Hostable = Hostable> extends BaseRole<RoomType> {
        static roleMetadata = {
            roleType: RoleType.Crewmate,
            roleTeam: RoleTeamType.Crewmate,
            isGhostRole: false
        };
    }
}