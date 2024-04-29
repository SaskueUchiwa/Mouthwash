import path from "path";
import fs from "fs/promises";

import { GameMap, PlayerData, Room } from "@skeldjs/hindenburg";
import { MouthwashAntiCheatPlugin } from "./plugin";

export interface Vec2 {
    x: number;
    y: number;
}

export interface DefinitiveColliderLine {
    ax: number;
    ay: number;
    bx: number;
    by: number;
}

export interface MiniDumpJsonOutputColliderLine {
    name: string;
    path: string;
}

export interface MiniDumpJsonOutputColliders {
    name: string;
    colliders: MiniDumpJsonOutputColliderLine[];
}

export interface MiniDumpJsonOutputPlayerInfo {
    name: string;
    color: number;
    positionX: number;
    positionY: number;
}

export interface MiniDumpJsonoutputTaskConsoleInfo {
    hudText: string;
    room: string;
    positionX: number;
    positionY: number;
    usableDistance: number;
}

export interface MiniDumpJsonOutputTaskInfo {
    taskType: string;
    hudText: string;
    length: string;
    consoles: MiniDumpJsonoutputTaskConsoleInfo[];
}

export interface MiniDumpJsonOutput {
    colliders: Record<"layers", Record<string, MiniDumpJsonOutputColliders>>;
    players: Record<"players", Record<string, MiniDumpJsonOutputPlayerInfo>>;
    tasks: Record<"tasks", Record<string, MiniDumpJsonOutputTaskInfo>>;
}

export function linesDoIntersect(
    aax: number,
    aay: number,
    abx: number,
    aby: number,
    bax: number,
    bay: number,
    bbx: number,
    bby: number
) {
    const det = (abx - aax) * (bby - bay) - (bbx - bax) * (aby - aay);
    if (det === 0) {
        return false;
    } else {
        const lambda = ((bby - bay) * (bbx - aax) + (bax - bbx) * (bby - aay)) / det;
        const gamma = ((aay - aby) * (bbx - aax) + (abx - aax) * (bby - aay)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
}

export class CollidersService {
    private definitiveColliders: Map<GameMap, DefinitiveColliderLine[]>;

    constructor(public readonly antiCheat: MouthwashAntiCheatPlugin) {
        this.definitiveColliders = new Map;
    }

    async initializeService() {
        await this.loadAllColliders();
    }

    async loadAllColliders() {
        const collidersPath = path.join(this.antiCheat.baseDirectory, "colliders");
        const filesInDir = await fs.readdir(collidersPath);

        for (const fileName of filesInDir) {
            const colliderLines: DefinitiveColliderLine[] = [];

            if (!fileName.endsWith(".json"))
                continue;

            const filePath = path.resolve(collidersPath, fileName);
            const fileData = await fs.readFile(filePath, "utf8");

            const fileJson = JSON.parse(fileData) as Vec2[][];

            for (const colliderShape of fileJson) {
                if (colliderShape.length < 1) {
                    return;
                }

                for (let i = 1; i < colliderShape.length; i++) {
                    colliderLines.push({
                        ax: colliderShape[i - 1].x,
                        ay: colliderShape[i - 1].y,
                        bx: colliderShape[i].x,
                        by: colliderShape[i].y
                    });
                }
            }

            /*
            for (const usefulLayer of Object.keys(fileJson.colliders.layers)) {
                if (usefulLayer === "2" || usefulLayer === "0")
                    continue;

                const mapLayerColliders = fileJson.colliders.layers[usefulLayer].colliders;

                for (const colliderInfo of mapLayerColliders) {
                    const allPoints = colliderInfo.path
                        .substring(2,
                            colliderInfo.path.endsWith("Z")
                                ? colliderInfo.path.length - 2
                                : colliderInfo.path.length - 1)
                        .split(" ")
                        .map(vecStr => {
                            const [ xStr, yStr ] = vecStr.split(",");

                            return {
                                x: parseFloat(xStr),
                                y: parseFloat(yStr)
                            };
                        });

                    for (let i = 1; i < allPoints.length; i++) {
                        const lastPoint = allPoints[i - 1];
                        const curPoint = allPoints[i];

                        if (!curPoint.x)
                            return;

                        colliderLines.push({
                            ax: lastPoint.x,
                            ay: lastPoint.y,
                            bx: curPoint.x,
                            by: curPoint.y
                        });
                    }

                    if (colliderInfo.path.endsWith(" Z")) {
                        const originX = allPoints[0].x;
                        const originY = allPoints[0].y;

                        const lastPoint = allPoints[allPoints.length - 1];

                        colliderLines.push({
                            ax: lastPoint.x,
                            ay: lastPoint.y,
                            bx: originX,
                            by: originY
                        });
                    }

                    //console.log(colliderLines);
                }
            }
            */
            this.definitiveColliders.set(
                parseInt(path.basename(fileName, ".json")),
                colliderLines
            );
        }
    }

    getCollidersByMap(map: GameMap) {
        return this.definitiveColliders.get(map);
    }

    getColliders() {
        return this.definitiveColliders;
    }

    countIntersections(colliders: DefinitiveColliderLine[], ax: number, ay: number, bx: number, by: number) {
        let numIntersectionsA = 0;

        for (let i = 0; i < colliders.length; i++) {
            const colliderInQuestion = colliders[i];

            if (linesDoIntersect(
                colliderInQuestion.ax,
                colliderInQuestion.ay,
                colliderInQuestion.bx,
                colliderInQuestion.by,
                ax,
                ay,
                bx,
                by
            )) {
                numIntersectionsA++;
            }
        }

        return numIntersectionsA;
    }

    isWithinColliderBounds(colliders: DefinitiveColliderLine[], px: number, py: number) {
        const numIntersectionsA = this.countIntersections(
            colliders,
            -49,
            49,
            px,
            py
        );

        const numIntersectionsB = this.countIntersections(
            colliders,
            49,
            49,
            px,
            py
        );

        const numIntersectionsC = this.countIntersections(
            colliders,
            49,
            -49,
            px,
            py
        );

        const isEvenA = numIntersectionsA % 2 === 0;
        const isEvenB = numIntersectionsB % 2 === 0;
        const isEvenC = numIntersectionsC % 2 === 0;

        const commonParity = (isEvenA && isEvenB) || (isEvenB && isEvenC) || (isEvenA && isEvenC);

        return !commonParity;
    }

    isWithinMapBounds(map: GameMap, px: number, py: number) {
        const mapColliderLines = this.getCollidersByMap(map);

        if (!mapColliderLines) {
            throw new Error("No colliders found for map: " + map);
        }

        return this.isWithinColliderBounds(mapColliderLines, px, py)
            || this.isWithinColliderBounds(mapColliderLines, px - 1, py)
            || this.isWithinColliderBounds(mapColliderLines, px + 1, py)
            || this.isWithinColliderBounds(mapColliderLines, px, py - 1)
            || this.isWithinColliderBounds(mapColliderLines, px, py + 1);
    }

    isPlayerInBounds(player: PlayerData<Room>) {
        if (!player.transform)
            return;

        if (this.antiCheat.room.lobbyBehaviour) {
            return this.isWithinMapBounds(-1 as number, player.transform.position.x, player.transform.position.y);
        }

        return this.isWithinMapBounds(this.antiCheat.room.settings.map, player.transform.position.x, player.transform.position.y);
    }
}
