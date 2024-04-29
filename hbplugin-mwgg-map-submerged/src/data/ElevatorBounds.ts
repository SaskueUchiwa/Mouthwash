import { Vector2 } from "@skeldjs/util";
import { SubmergedSystemType } from "../enums";
import { Bounds } from "../util";

export interface ElevatorBounds {
    lower: Bounds;
    upper: Bounds;
}

export const ElevatorBounds: Partial<Record<SubmergedSystemType, ElevatorBounds>> = {
    [SubmergedSystemType.ElevatorLobbyLeft]: {
        lower: new Bounds(new Vector2(6.3, -41.3), new Vector2(9.3, -43.84)),
        upper: new Bounds(new Vector2(6.25, 6.68), new Vector2(9.3, 4.1)),
    },
    [SubmergedSystemType.ElevatorLobbyRight]: {
        lower: new Bounds(new Vector2(9.5, -37.31), new Vector2(11.7, -41.2)),
        upper: new Bounds(new Vector2(9.51, 10.79), new Vector2(11.27, 7.01)),
    },
    [SubmergedSystemType.ElevatorService]: {
        lower: new Bounds(new Vector2(11.3, -18.96), new Vector2(13, -22.7)),
        upper: new Bounds(new Vector2(11.18, 29.1), new Vector2(13, 25.4)),
    },
    [SubmergedSystemType.ElevatorHallwayLeft]: {
        lower: new Bounds(new Vector2(-8.1, -24.85), new Vector2(-5.15, -27.7)),
        upper: new Bounds(new Vector2(-8.1, 23.19), new Vector2(-5.2, 20.6)),
    },
    [SubmergedSystemType.ElevatorHallwayRight]: {
        lower: new Bounds(new Vector2(-5.1, -24.85), new Vector2(-2.17, -27.7)),
        upper: new Bounds(new Vector2(-5.08, 23.19), new Vector2(-2.22, 20.6)),
    }
};