import {
    HindenburgPlugin,
    WorkerPlugin,
    Worker,
    RegisterMessage
} from "@skeldjs/hindenburg";

import {
    AcknowledgeChangeFloorMessage,
    EngineVentMessage,
    OxygenDeathMessage,
    RequestChangeFloorMessage,
    SetCustomDataMessage
} from "hbplugin-mwgg-map-submerged";

export interface MwggMapSubmergedRegisterPluginConfig {

}

@HindenburgPlugin("hbplugin-map-mwgg-submerged-register")
@RegisterMessage(AcknowledgeChangeFloorMessage)
@RegisterMessage(EngineVentMessage)
@RegisterMessage(OxygenDeathMessage)
@RegisterMessage(RequestChangeFloorMessage)
@RegisterMessage(SetCustomDataMessage)
export class MwggMapSubmergedRegisterPlugin extends WorkerPlugin {
    constructor(public readonly worker: Worker, public config: MwggMapSubmergedRegisterPluginConfig) {
        super(worker, config);
    }
}