import { PlayerData, Room } from "@skeldjs/hindenburg";

export class TargettableService {
    nonTargettable: WeakSet<PlayerData<Room>>;

    constructor() {
        this.nonTargettable = new WeakSet;
    }

    setTargettable(player: PlayerData<Room>, targettable: boolean) {
        if (targettable) {
            this.nonTargettable.delete(player);
        } else {
            this.nonTargettable.add(player);
        }
    }

    isTargettable(player: PlayerData<Room>) {
        return !this.nonTargettable.has(player);
    }
}