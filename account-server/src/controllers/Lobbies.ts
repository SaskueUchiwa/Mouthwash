import { AccountServer } from "../AccountServer";
import { DeclareSafeKeys } from "../types/DeclareSafeKeys";

export interface Game {
    id: string;
    lobby_id: string;
    started_by: string;
    game_settings: any;
    started_at: Date;
    ended_at: Date|null;
}

export interface GameLobbyInfo extends Game {
    total_players: number;
    game_code: string;
    lobby_destroyed_at: Date;
    did_win: boolean|null;
}

export interface Player {
    id: string;
    game_id: string;
    user_id: string;
    did_win: boolean|null;
    role_name: string|null;
    cosmetic_color: number|null;
    cosmetic_name: string|null;
    role_alignment: string|null;
}

export type AntiCheatPlayer = DeclareSafeKeys<Player, "id"|"game_id"|"user_id"|"cosmetic_color"|"cosmetic_name">;

export class LobbiesController {
    constructor(public readonly server: AccountServer) {}

    async getGameById(gameId: string) {
        const { rows: foundGames } = await this.server.postgresClient.query(`
            SELECT *
            FROM game
            WHERE id = $1
        `, [ gameId ]);

        return foundGames[0] as Game|undefined;
    }

    async getUserGames(userId: string, before: Date, limit: number) {
        const { rows: foundGames } = await this.server.postgresClient.query(`
            SELECT game.*, lobby.game_code, lobby.destroyed_at AS lobby_destroyed_at, bool_or(player.did_win) as did_win, COUNT(player.id) as total_players
            FROM lobby
            LEFT JOIN game ON game.lobby_id = lobby.id
            JOIN player ON game.id = player.game_id
            WHERE player.user_id = $1 AND game.started_at < $2
            GROUP BY game.id, game.started_at, lobby.id, lobby.game_code
            ORDER BY game.started_at DESC, lobby.id
            LIMIT $3;
        `, [ userId, before, limit ]);

        return foundGames as GameLobbyInfo[];
    }

    async getPlayersInGame(gameId: string) {
        const { rows: foundPlayers } = await this.server.postgresClient.query(`
            SELECT *
            FROM player
            WHERE game_id = $1
        `, [ gameId ]);

        return foundPlayers as Player[];
    }
}