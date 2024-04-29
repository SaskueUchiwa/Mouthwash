import * as mediator from "mouthwash-mediator";
import { BaseRoute } from "../BaseRoute";
import { UserNotFoundError } from "../../errors";
import { PublicUser } from "../../controllers";

export class UsersRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/users/:user_id")
    async getUser(transaction: mediator.Transaction<{ user_id: string }>) {
        const { user_id } = transaction.getParams();
        const user = await this.server.accountsController.getUserById(user_id);
        if (!user) throw new UserNotFoundError({ id: user_id });

        transaction.respondJson<PublicUser>({
            ...user,
            stripe_customer_id: undefined,
            password_hash: undefined,
            email: undefined,
            email_verified: undefined,
            banned_until: undefined,
            muted_until: undefined
        });
    }

    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/users/:user_id/games")
    async getUserGames(transaction: mediator.Transaction<{ user_id: string }>) {
        const { user_id } = transaction.getParams();
        const user = await this.server.accountsController.getUserById(user_id);
        if (!user) throw new UserNotFoundError({ id: user_id });

        const { limit, before } = transaction.getQueryParams();

        const resolvedLimit = typeof limit === "string"
            ? parseInt(limit) || 10
            : 10;
        const resolvedBefore = typeof before === "string"
            ? isNaN(new Date(before).getTime())
                ? new Date()
                : new Date(before)
            : new Date();

        const lobbies = await this.server.lobbiesController.getUserGames(user.id, resolvedBefore, Math.min(Math.max(resolvedLimit, 20)));
        transaction.respondJson(lobbies);
    }
}