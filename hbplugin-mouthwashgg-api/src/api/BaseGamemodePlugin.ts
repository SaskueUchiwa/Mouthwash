import { Room, RoomPlugin } from "@skeldjs/hindenburg";
import { GameOption, NumberValue } from "mouthwash-types";
import { BaseRole } from "./BaseRole";
import { MouthwashApiPlugin } from "../plugin";
import { AssetBundle, DefaultRoomOptionName, RoleCount } from "../services";

export interface GamemodeMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
}

export class BaseGamemodePlugin extends RoomPlugin {
    static gamemodeMetadata: GamemodeMetadata;
    gamemodeMetadata!: GamemodeMetadata;

    api: MouthwashApiPlugin;
    registeredRoles: typeof BaseRole[];
    registeredBundles: AssetBundle[];

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.api = room.loadedPlugins.get("hbplugin-mouthwashgg-api")?.pluginInstance as MouthwashApiPlugin;
        this.registeredRoles = [];
        this.registeredBundles = [];
    }

    onPluginLoad() {
        if (!this.api) {
            this.logger.warn("Loaded gamemode '" + this.meta.id + "' without mouthwash api loaded.");
            this.worker.pluginLoader.unloadPlugin(this, this.room);
        }
    }

    getGameOptions(): Map<string, GameOption> {
        return this.api.createDefaultOptions();
    }

    getAdjustedImpostorCount(): number {
        return this.api.roleService.adjustImpostorCount(
            this.api.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorCount)?.getValue<NumberValue>().value ?? 2
        );
    }

    getRoleCounts(): RoleCount[] {
        return [];
    }

    resolveChancePercentage(percent: number) {
        return Math.floor(percent / 100) + (Math.random() < ((percent % 100) / 100) ? 1 : 0);
    }
}