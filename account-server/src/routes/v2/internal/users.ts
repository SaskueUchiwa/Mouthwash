import * as mediator from "mouthwash-mediator";
import * as ark from "arktype";
import * as express from "express";
import { BaseRoute } from "../../BaseRoute";
import { InvalidBodyError, UserNotFoundError } from "../../../errors";
import { InternalController } from "../../../controllers";

export const updateCosmeticsRequestValidator = ark.type({
    cosmetic_hat: "string",
    cosmetic_pet: "string",
    cosmetic_skin: "string",
    cosmetic_color: "number",
    cosmetic_visor: "string",
    cosmetic_nameplate: "string"
});

export class UsersRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/internal/users/:user_id")
    @mediator.Middleware(InternalController.validateInternalAccess)
    async onGetUser(transaction: mediator.Transaction<{ user_id: string }>) {
        const { user_id } = transaction.getParams();
        const user = await this.server.accountsController.getUserById(user_id);
        if (user === undefined) throw new UserNotFoundError({ id: user_id });

        const cosmetics = await this.server.cosmeticsController.getAllCosmeticItemsOwnedByUser(user.id);
        const perks = await this.server.cosmeticsController.getUserPerks(user_id);

        transaction.respondJson({
            ...user,
            owned_cosmetics: cosmetics,
            perks,
            password_hash: undefined
        });
    }

    @mediator.Endpoint(mediator.HttpMethod.PUT, "/v2/internal/users/:user_id/cosmetics")
    @mediator.Middleware(express.json(), InternalController.validateInternalAccess)
    async updateCosmetics(transaction: mediator.Transaction<{ user_id: string; }>) {
        const { user_id } = transaction.getParams();
        const { data, problems } = updateCosmeticsRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const success = await this.server.cosmeticsController.setPlayerCosmetics(user_id, data.cosmetic_hat, data.cosmetic_pet, data.cosmetic_skin, data.cosmetic_color, data.cosmetic_visor, data.cosmetic_nameplate);
        if (!success) throw new UserNotFoundError({ id: user_id });

        transaction.respondJson({});
    }

    @mediator.Endpoint(mediator.HttpMethod.PUT, "/v2/internal/users/:user_id/game_settings")
    @mediator.Middleware(express.json(), InternalController.validateInternalAccess)
    async updateGameSettings(transaction: mediator.Transaction<{ user_id: string }>) {
        const { user_id } = transaction.getParams();
        const success = await this.server.accountsController.setPlayerGameSettings(user_id, transaction.getBody().game_settings);
        if (!success) throw new UserNotFoundError({ id: user_id });

        transaction.respondJson({});
    }
}