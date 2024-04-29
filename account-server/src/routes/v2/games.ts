import * as mediator from "mouthwash-mediator";
import { BaseRoute } from "../BaseRoute";
import { GameNotFoundError } from "../../errors";
import { AntiCheatPlayer, Player } from "../../controllers";

export class GamesRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/games/:game_id/players")
    async getGamePlayers(transaction: mediator.Transaction<{ game_id: string }>) {
        const { game_id } = transaction.getParams();
        const game = await this.server.lobbiesController.getGameById(game_id);
        if (game === undefined) throw new GameNotFoundError(game_id);

        const players = await this.server.lobbiesController.getPlayersInGame(game_id);
        if (game.ended_at === null) {
            transaction.respondJson<AntiCheatPlayer[]>(players.map(player => ({
                ...player,
                did_win: undefined,
                role_name: undefined,
                role_alignment: undefined
            })));
            return;
        }

        transaction.respondJson<Player[]>(players);
    }
}