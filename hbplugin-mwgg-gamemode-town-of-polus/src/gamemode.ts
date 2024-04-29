import * as path from "path";
import * as fs from "fs/promises";

import { GameMap, HindenburgPlugin, PreventLoad, SystemType, Vector2 } from "@skeldjs/hindenburg";
import { GameOption, NumberValue, Priority } from "mouthwash-types";

import {
    RegisterBundle,
    BaseGamemodePlugin,
    DefaultRoomCategoryName,
    GamemodePlugin,
    RegisterRole
} from "hbplugin-mouthwashgg-api";

import {
    Detective,
    Engineer,
    Grenadier,
    IdentityThief,
    Jester,
    Poisoner,
    Sheriff,
    Swooper,
    Trapper
} from "./roles";
import { Bounds } from "./util/Bounds";

export const TownOfPolusOptionName = {
    EngineerProbability: `${Engineer.metadata.themeColor.text("Engineer")} Probability`,
    SheriffProbability: `${Sheriff.metadata.themeColor.text("Sheriff")} Probability`,
    IdentityThiefProbability: `${IdentityThief.metadata.themeColor.text("Identity Thief")} Probability`,
    JesterProbability: `${Jester.metadata.themeColor.text("Jester")} Probability`,
    PoisonerProbability: `${Poisoner.metadata.themeColor.text("Poisoner")} Probability`,
    GrenadierProbability: `${Grenadier.metadata.themeColor.text("Grenadier")} Probability`,
    SwooperProbability: `${Swooper.metadata.themeColor.text("Swooper")} Probability`,
    TrapperProbability: `${Trapper.metadata.themeColor.text("Trapper")} Probability`,
    DetectiveProbability: `${Detective.metadata.themeColor.text("Detective")} Probability`
} as const;

@PreventLoad
@GamemodePlugin({
    id: "town-of-polus",
    name: "Town of Polus",
    version: "1.0.0",
    description: "A spin on the orignial Town of Us game, available to play on Mouthwash.gg.",
    author: "weakeyes"
})
@RegisterRole(Poisoner)
@RegisterRole(IdentityThief)
@RegisterRole(Jester)
@RegisterRole(Sheriff)
@RegisterRole(Engineer)
@RegisterRole(Grenadier)
@RegisterRole(Swooper)
@RegisterRole(Trapper)
@RegisterRole(Detective)
@RegisterBundle("PggResources/TownOfPolus")
@HindenburgPlugin("hbplugin-mwgg-gamemode-town-of-polus", "1.0.0", "none")
export class TownOfPolusGamemodePlugin extends BaseGamemodePlugin {
    static MapRoomBounds: Partial<Record<GameMap, { systemId: SystemType, bounds: Bounds }[]>> = {};

    async onPluginLoad() {
        const dataDirectory = path.join(this.baseDirectory, "data");
        const mapIds = [ GameMap.TheSkeld, GameMap.MiraHQ, GameMap.Polus, GameMap.Airship, 5 /* submerged */ ];
        
        for (const mapId of mapIds) {
            TownOfPolusGamemodePlugin.MapRoomBounds[mapId as GameMap] = [];
            const mapDataFile = path.join(dataDirectory, mapId + ".json");
            try {
                const mapDataText = await fs.readFile(mapDataFile, "utf8");
                const mapDataJson = JSON.parse(mapDataText) as { systemType: number, min: { x: number; y: number; }; max: { x: number; y: number; } }[];
                for (const systemBounds of mapDataJson) {
                    if (systemBounds.systemType === SystemType.Hallway)
                        continue;

                    TownOfPolusGamemodePlugin.MapRoomBounds[mapId as GameMap]!.push({
                        systemId: systemBounds.systemType,
                        bounds: new Bounds(
                            new Vector2(systemBounds.min.x, systemBounds.min.y),
                            new Vector2(systemBounds.max.x, systemBounds.max.y)
                        )
                    });
                }
            } catch (e: any) {
                this.logger.error("Failed to load room data about map with ID %s", mapId);
            }
        }
    }

    getGameOptions() {
        return new Map<any, any>([
            ...this.api.createDefaultOptions().entries(),
            [TownOfPolusOptionName.EngineerProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.EngineerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.E)],
            [TownOfPolusOptionName.SheriffProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.SheriffProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.E + 1)],
            [TownOfPolusOptionName.DetectiveProbability, new GameOption(DefaultRoomCategoryName.CrewmateRoles, TownOfPolusOptionName.DetectiveProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.E + 2)],
            [TownOfPolusOptionName.IdentityThiefProbability, new GameOption(DefaultRoomCategoryName.NeutralRoles, TownOfPolusOptionName.IdentityThiefProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.F)],
            [TownOfPolusOptionName.JesterProbability, new GameOption(DefaultRoomCategoryName.NeutralRoles, TownOfPolusOptionName.JesterProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.F + 1)],
            [TownOfPolusOptionName.PoisonerProbability, new GameOption(DefaultRoomCategoryName.ImpostorRoles, TownOfPolusOptionName.PoisonerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.G)],
            [TownOfPolusOptionName.GrenadierProbability, new GameOption(DefaultRoomCategoryName.ImpostorRoles, TownOfPolusOptionName.GrenadierProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.G + 1)],
            [TownOfPolusOptionName.SwooperProbability, new GameOption(DefaultRoomCategoryName.ImpostorRoles, TownOfPolusOptionName.SwooperProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.G + 2)],
            [TownOfPolusOptionName.TrapperProbability, new GameOption(DefaultRoomCategoryName.ImpostorRoles, TownOfPolusOptionName.TrapperProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), Priority.G + 3)]
        ]);
    }

    getRoleCounts() {
        return [
            {
                role: Engineer,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.EngineerProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Sheriff,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.SheriffProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Detective,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.DetectiveProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: IdentityThief,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.IdentityThiefProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Jester,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.JesterProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Poisoner,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.PoisonerProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Grenadier,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.GrenadierProbability)?.getValue<NumberValue>().value || 0)
            },
            {
                role: Swooper,
                playerCount: this.resolveChancePercentage(this.api.gameOptions.gameOptions.get(TownOfPolusOptionName.SwooperProbability)?.getValue<NumberValue>().value || 0)
            }
        ];
    }
}