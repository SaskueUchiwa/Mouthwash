import { BaseRpcMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";
import { CameraAnimationKeyframe } from "./keyframes";

export class BeginCameraAnimationMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.BeginCameraAnimation as const;;
    messageTag = MouthwashRpcMessageTag.BeginCameraAnimation as const;

    constructor(
        public readonly keyframes: CameraAnimationKeyframe[],
        public readonly reset: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const reset = reader.bool();
        const keyframes: CameraAnimationKeyframe[] = [];
        while (reader.left) {
            const [ , kreader ] = reader.message();
            keyframes.push(kreader.read(CameraAnimationKeyframe));
        }

        return new BeginCameraAnimationMessage(keyframes, reset);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.reset);
        for (const keyframe of this.keyframes) {
            writer.begin(0);
            writer.write(keyframe);
            writer.end();
        }
    }
}