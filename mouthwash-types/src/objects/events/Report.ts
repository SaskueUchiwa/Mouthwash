import { CancelableEvent } from "@skeldjs/events";
import { ReportDeadBodyMessage } from "../../packets";
import { DeadBody } from "../DeadBody";
import { PlayerData, Room } from "@skeldjs/hindenburg";

export class DeadBodyReportEvent extends CancelableEvent {
    static eventName = "mwgg.deadbody.report" as const;
    eventName = "mwgg.deadbody.report" as const;

    constructor(
        public readonly room: Room,
        public readonly deadBody: DeadBody,
        public readonly message: ReportDeadBodyMessage|undefined,
        public readonly reporterPlayer: PlayerData<Room>
    ) {
        super();
    }
}