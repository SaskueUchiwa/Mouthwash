import * as mediator from "mouthwash-mediator";
import * as bcrypt from "bcrypt";
import * as ark from "arktype";
import * as express from "express";
import { BaseRoute } from "../BaseRoute";
import { ForbiddenError, InvalidBodyError, MissingHeaderError, Unauthorized } from "../../errors";
import { SafeUser } from "../../controllers";

export const createTokenRequestValidator = ark.type({
    email: "email",
    password: "string"
});

export class AuthRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/auth/check")
    @mediator.Middleware(express.json())
    async onCheckAuth(transaction: mediator.Transaction<{}>) {
        const clientToken = transaction.req.header("Authorization");
        if (clientToken === undefined) throw new MissingHeaderError("Authorization");

        const session = await this.server.sessionsController.getClientSession(clientToken);
        if (session === undefined) throw new Unauthorized();

        const user = await this.server.accountsController.getUserById(session.user_id);
        if (user === undefined) throw new mediator.InternalServerError(new Error(`Failed to get user even though they have a session? (session_id=${session.id})`));

        transaction.respondJson<SafeUser & { client_token: string; preview_bundles_id_url_and_hash: undefined; bundle_previews: { id: string; url: string; hash: string; }[]; }>({
            ...user,
            bundle_previews: user.preview_bundles_id_url_and_hash === null
                ? []
                : [...new Set(user.preview_bundles_id_url_and_hash.split(","))].map(urlAndHash => {
                    const [ id, url, hash ] = urlAndHash.split("$$");
                    return { id, url, hash };
                }),
            stripe_customer_id: undefined,
            preview_bundles_id_url_and_hash: undefined,
            client_token: session.client_token,
            password_hash: undefined
        });
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/auth/logout")
    @mediator.Middleware(express.json())
    async onLogout(transaction: mediator.Transaction<{}>) {
        const clientToken = transaction.req.header("Authorization");
        if (clientToken === undefined) throw new MissingHeaderError("Authorization");

        const session = await this.server.sessionsController.getClientSession(clientToken);
        if (session === undefined) throw new Unauthorized();

        await this.server.sessionsController.deleteSession(session.id);

        transaction.respondJson({});
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/auth/token")
    @mediator.Middleware(express.json())
    async onCreateToken(transaction: mediator.Transaction<{}>) {
        const { data, problems } = createTokenRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const user = await this.server.accountsController.getUserByEmailWithCosmetics(data.email);
        if (user === undefined) throw new Unauthorized();

        const passwordMatches = await bcrypt.compare(data.password, user.password_hash);
        if (!passwordMatches) throw new Unauthorized();

        if (!user.email_verified) throw new ForbiddenError("NOT_VERIFIED");

        const existingSession = await this.server.sessionsController.getConnectionSession(user.id);
        const session = existingSession || await this.server.sessionsController.createSession(user.id);

        if (session === undefined) throw new mediator.InternalServerError(new Error(`Failed to create session (user_id=${user.id})`));

        transaction.respondJson<SafeUser & { client_token: string; preview_bundles_id_url_and_hash: undefined; bundle_previews: { id: string; url: string; hash: string; }[] }>({
            ...user,
            bundle_previews: user.preview_bundles_id_url_and_hash === null
                ? []
                : [...new Set(user.preview_bundles_id_url_and_hash.split(","))].map(urlAndHash => {
                    const [ id, url, hash ] = urlAndHash.split("$$");
                    return { id, url, hash };
                }),
            stripe_customer_id: undefined,
            preview_bundles_id_url_and_hash: undefined,
            client_token: session.client_token,
            password_hash: undefined
        });
    }
}