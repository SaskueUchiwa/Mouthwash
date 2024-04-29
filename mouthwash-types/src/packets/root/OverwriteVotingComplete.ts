import { HazelReader, HazelWriter, BaseRpcMessage } from "@skeldjs/hindenburg";
import { MouthwashRpcMessageTag } from "../../enums";

export class OverwriteVoteState {
    constructor(
        public readonly playerId: number,
        public readonly votedForId: number
    ) {}

    static Deserialize(reader: HazelReader) {
        const [ playerId, mreader ] = reader.message();
        const votedForId = mreader.uint8();
        return new OverwriteVoteState(playerId, votedForId);
    }

    Serialize(writer: HazelWriter) {
        writer.begin(this.playerId);
        writer.uint8(this.votedForId);
        writer.end();
    }

    clone() {
        return new OverwriteVoteState(this.playerId, this.votedForId);
    }
}

export class OverwriteVotingCompleteMessage extends BaseRpcMessage {
    static messageTag = MouthwashRpcMessageTag.OverwriteVotingComplete as const;
    messageTag = MouthwashRpcMessageTag.OverwriteVotingComplete as const;

    constructor(
        public readonly voteStates: OverwriteVoteState[],
        public readonly exiledPlayerId: number,
        public readonly exiledImpostor: boolean,
        public readonly numImpostorsLeft: number,
        public readonly totalImpostors: number,
        public readonly wasTie: boolean
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const voteStates = reader.lread(reader.packed(), OverwriteVoteState);
        const exiledPlayerId = reader.uint8();
        const exiledImpostor = reader.bool();
        const numImpostorsLeft = reader.uint8();
        const totalImpostors = reader.uint8();
        const wasTie = reader.bool();

        return new OverwriteVotingCompleteMessage(voteStates, exiledPlayerId, exiledImpostor, numImpostorsLeft, totalImpostors, wasTie);
    }

    Serialize(writer: HazelWriter) {
        writer.lwrite(true, this.voteStates);
        writer.uint8(this.exiledPlayerId);
        writer.bool(this.exiledImpostor);
        writer.uint8(this.numImpostorsLeft);
        writer.bool(this.wasTie);
    }

    clone() {
        return new OverwriteVotingCompleteMessage(
            this.voteStates.map(state => state.clone()),
            this.exiledPlayerId,
            this.exiledImpostor,
            this.numImpostorsLeft,
            this.totalImpostors,
            this.wasTie
        );
    }
}
