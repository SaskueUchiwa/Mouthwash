import { Vector2 } from "@skeldjs/util";

export class Bounds {
    protected readonly min: Vector2;
    protected readonly max: Vector2;

    constructor(public readonly a: Vector2, public readonly b: Vector2) {
        this.min = new Vector2;
        this.max = new Vector2;

        if (a.x < b.x) {
            this.min.x = a.x;
            this.max.x = b.x;
        } else {
            this.min.x = b.x;
            this.max.x = a.x;
        }

        if (a.y < b.y) {
            this.min.y = a.y;
            this.max.y = b.y;
        } else {
            this.min.y = b.y;
            this.max.y = a.y;
        }
    }

    getMinMax() {
        return [ this.min, this.max ];
    }

    contains(position: Vector2) {
        return position.x > this.min.x &&
            position.x < this.max.x &&
            position.y > this.min.y &&
            position.y < this.max.y;
    }
}