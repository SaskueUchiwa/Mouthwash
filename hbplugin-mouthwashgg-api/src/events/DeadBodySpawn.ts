import { CancelableEvent } from "@skeldjs/events";
import { DeadBodyController } from "../services";

export class DeadBodySpawnEvent extends CancelableEvent {
    static eventName = "mwgg.deadbody.spawn" as const;
    eventName = "mwgg.deadbody.spawn" as const;

    constructor(
        public readonly deadBody: DeadBodyController
    ) {
        super();
    }
}