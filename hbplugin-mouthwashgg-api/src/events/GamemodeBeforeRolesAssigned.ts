import { BasicEvent } from "@skeldjs/events";
import { RoleAssignment } from "../services/roles";

export class GamemodeBeforeRolesAssignedEvent extends BasicEvent {
    static eventName = "mwgg.gamemode.beforerolesassigned" as const;
    eventName = "mwgg.gamemode.beforerolesassigned" as const;

    protected _alteredRolesAssigned: RoleAssignment[];

    constructor(public readonly rolesAssigned: RoleAssignment[]) {
        super();
        
        this._alteredRolesAssigned = rolesAssigned;
    }

    get alteredRolesAssigned() {
        return this._alteredRolesAssigned;
    }

    setRolesAssigned(rolesAssigned: RoleAssignment[]) {
        this._alteredRolesAssigned = rolesAssigned;
    }
}