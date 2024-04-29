import { BasicEvent } from "@skeldjs/events";
import { ClickMessage } from "../../packets";
import { ClickBehaviour } from "../ClickBehaviour";
import { Room } from "@skeldjs/hindenburg";

export class ClickBehaviourClickEvent extends BasicEvent {
    static eventName = "mwgg.clickbehaviour.click" as const;
    eventName = "mwgg.clickbehaviour.click" as const;

    constructor(
        public readonly room: Room,
        public readonly clickBehaviour: ClickBehaviour,
        public readonly message: ClickMessage|undefined
    ) {
        super();
    }
}