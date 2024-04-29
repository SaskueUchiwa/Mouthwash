export enum InfractionName {
    /**
     * Player attempted to call an RPC for an object that doesn't exist. Possibly communicating
     * with another client discreetly - a medium infraction.
     */
    UnknownRpcInnernetObject = "UNKNOWN_RPC_INNERNET_OBJECT",
    /**
     * Player attempted to call an RPC for an object that they don't own - a critical infraction.
     */
    ForbiddenRpcInnernetObject = "FORBIDDEN_RPC_INNERNET_OBJECT",
    /**
     * Player attempted to call an RPC that they shouldn't be able to call - a critical infraction.
     */
    ForbiddenRpcCode = "FORBIDDEN_RPC_CODE",
    /**
     * Player attempted to call an RPC that doesn't exist on the server - a high infraction.
     */
    InvalidRpcCode = "INVALID_RPC_CODE",
    /**
     * Player attempted to update an object that did not exist in the room - a
     * high infraction.
     */
    UnknownDataInnernetObject = "UNKNOWN_DATA_INNERNET_OBJECT",
    /**
     * Player attempted to update an object that did not belong to them - a
     * critical infraction.
     */
    ForbiddenDataInnernetObject = "FORBIDDEN_DATA_INNERNET_OBJECT",
    /**
     * Player attempted to update an object that normally wouldn't get updated - a
     * critical infraction.
     */
    InvalidDataInnernetObject = "INVALID_DATA_INNERNET_OBJECT",
    /**
     * Player sent a vote in a meeting that was either not theirs - a critical infraction -
     * or belonged to an invalid player - a critical infraction.
     */
    FalseRpcMeetingVote = "FALSE_RPC_MEETING_VOTE",
    /**
     * Player sent a vote in a meeting when they aren't allowe to, e.g. they're
     * dead - a critical infraction.
     */
    ForbiddenRpcMeetingVote = "FORBIDDEN_RPC_MEETING_VOTE",
    /**
     * Player attempted to voted to eject a player more than once - a high infraction.
     */
    DuplicateRpcMeetingVote = "DUPLICATE_RPC_MEETING_VOTE",
    /**
     * Player voted to eject a player that doesn't exist in the meeting - a high
     * or medium infraction.
     */
    InvalidRpcMeetingVote = "INVALID_RPC_MEETING_VOTE",
    /**
     * Player requested a colour that isn't in the game - a critical infraction.
     */
    InvalidRpcColor = "INVALID_RPC_COLOR",
    /**
     * Player requested a name that doesn't match their user display name - a critical infraction.
     */
    InvalidRpcName = "INVALID_RPC_NAME",
    /**
     * Player set their skin to a cosmetic that isn't in the game, or that they don't own - a critical infraction.
     */
    InvalidRpcSkin = "INVALID_RPC_SKIN",
    /**
     * Player set their hat to a cosmetic that isn't in the game, or that they don't own - a critical infraction.
     */
    InvalidRpcHat = "INVALID_RPC_HAT",
    /**
     * Player set their pet to a cosmetic that isn't in the game, or that they don't own - a critical infraction.
     */
    InvalidRpcPet = "INVALID_RPC_PET",
    /**
     * Player vented despite not having permission to do so (i.e. being an impostor) - a
     * critical infraction.
     */
    ForbiddenRpcVent = "FORBIDDEN_RPC_VENT",
    /**
     * Player vented and had permission to do so, but the vent action was invalid, e.g. due to the player not being
     * in the right place - a medium infraction.
     */
    IllegalRpcVent = "ILLEGAL_RPC_VENT",
    /**
     * Player teleported to a location illegally, e.g. while not in a vent, or moving to
     * a vent not in the same vent network as the one they were in previously - a medium infraction.
     */
    InvalidRpcTeleport = "INVALID_RPC_TELEPORT",
    /**
     * Player attempted to report a dead body, that wasn't starting an emergency meeting -
     * a high infraction.
     */
    InvalidRpcReportDeadBody = "INVALID_RPC_REPORT_DEAD_BODY",
    /**
     * Player attempted to start a meeting in an invalid state, e.g. there is already a meeting
     * going on - a high infraction.
     */
    InvalidRpcMeetingStart = "INVALID_RPC_MEETING_START",
    /**
     * Player sent a message in chat too quickly before the last message - a low or medium infraction.
     */
    RateLimitedRpcSendChat = "RATE_LIMITED_RPC_SEND_CHAT",
    /**
     * Player attempted to repair a system but they lied about who they were - a critical infraction.
     */
    FalseRpcRepair = "FALSE_RPC_REPAIR",
    /**
     * Player attempted to repair a system but they weren't allowed to - a critical infraction.
     */
    ForbiddenRpcRepair = "FORBIDDEN_RPC_REPAIR",
    /**
     * Player attempted to repair a system that doesn't exist, or was otherwise unavailable to
     * repair - a high infraction.
     */
    InvalidRpcRepair = "INVALID_RPC_REPAIR",
    /**
     * Player attempted to sabotage a system but they lied about who they were - a critical infraction.
     */
    FalseRpcSabotage = "FALSE_RPC_SABOTAGE",
    /**
     * Player attempted to sabotage a system but they weren't allowed to - a critical infraction.
     */
    ForbiddenRpcSabotage = "FORBIDDEN_RPC_SABOTAGE",
    /**
     * Player attempted to sabotage a system that doesn't exist, or was otherwise unavailable to
     * sabotage, i.e. it was already sabotaged - a medium to high infraction.
     */
    InvalidRpcSabotage = "INVALID_RPC_SABOTAGE",
    /**
     * Player attempted to sabotage a system too quickly after sabotaging another one -
     * a low to medium infraction.
     */
    RateLimitedRpcSabotage = "RATE_LIMITED_RPC_SABOTAGE",
    /**
     * Player attempted to open the decontamination room when it wasn't ready to open -
     * a low infraction.
     */
    InvalidRpcOpenDecon = "INVALID_RPC_OPEN_DECON",
    /**
     * Player attempted to open a door on the map that was already open or doesn't exist
     * - a low to medium infraction.
     */
    InvalidRpcOpenDoor = "INVALID_RPC_OPEN_DOOR",
    /**
     * Player attempted to close a set of doors in a room when they weren't allowed to
     * - a critical infraction.
     */
    ForbiddenRpcCloseDoors = "FORBIDDEN_RPC_CLOSE_DOORS",
    /**
     * Player attempted to close a set of doors in a room when they were already closed
     * or they were otherwise unavailable to close - a high infraction.
     */
    InvalidRpcCloseDoors = "INVALID_RPC_CLOSE_DOORS",
    /**
     * Player attempted to close doors too quickly before the cooldown was finished
     * - a low-medium infraction.
     */
    RateLimitedRpcCloseDoors = "RATE_LIMITED_RPC_CLOSE_DOORS",
    /**
     * Player attempted to complete a task even though they weren't allowed to,
     * e.g. they weren't a Crewmate - a high infraction.
     */
    ForbiddenRpcCompleteTask = "FORBIDDEN_RPC_COMPLETE_TASK",
    /**
     * Player attempted to complete a task that wasn't valid, e.g. they didn't
     * have the task in question - a high infraction.
     */
    InvalidRpcCompleteTask = "INVALID_RPC_COMPLETE_TASK",
    /**
     * Player attempted to complete a task but they weren't near a console,
     * or were otherwise incapable of completing it - a high infraction.
     */
    UnableRpcCompleteTask = "UNABLE_RPC_COMPLETE_TASK",
    /**
     * Player attempted to spawn an object when they weren't allowed to - a
     * critical infraction.
     */
    ForbiddenSpawn = "FORBIDDEN_SPAWN",
    /**
     * Player attempted to despawn an object when they weren't allowed to -
     * a critical infraction.
     */
    ForbiddenDespawn = "FORBIDDEN_DESPAWN",
    /**
     * Player attempted to change scene for another player - a critical
     * infraction.
     */
    FalseSceneChange = "FALSE_SCENE_CHANGE",
    /**
     * Player attempted to change scene despite not being allowed to - a
     * critical infraction.
     */
    ForbiddenSceneChange = "FORBIDDEN_SCENE_CHANGE",
    /**
     * Player attempted to change scene in an invalid state, e.g. the scene
     * was invalid - a critical infraction.
     */
    InvalidSceneChange = "INVALID_SCENE_CHANGE",
    /**
     * Player attempted to change scene despite already being in a scene -
     * a high infraction.
     */
    DuplicateSceneChange = "DUPLICATE_SCENE_CHANGE",
    /**
     * Player attempted to ready up for another player - a critical
     * infraction.
     */
    FalseReady = "FALSE_READY",
    /**
     * Player attempted to ready in an invalid state, e.g. a game has
     * not started - a high infraction.
     */
    InvalidReady = "INVALID_READY"
}