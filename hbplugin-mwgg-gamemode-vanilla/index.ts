import {
    HindenburgPlugin,
    PreventLoad
} from "@skeldjs/hindenburg";

import {
    BaseGamemodePlugin,
    GamemodePlugin
} from "hbplugin-mouthwashgg-api";

@PreventLoad
@GamemodePlugin({
    id: "vanilla",
    name: "Vanilla",
    version: "1.0.0",
    description: "Good old classic Among Us.",
    author: "weakeyes"
})
@HindenburgPlugin("hbplugin-mwgg-gamemode-vanilla", "1.0.0", "none")
export default class extends BaseGamemodePlugin { }