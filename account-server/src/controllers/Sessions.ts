import * as crypto from "crypto";
import { AccountServer } from "../AccountServer";
import { Unauthorized } from "../errors";
import { Transaction } from "mouthwash-mediator";

export interface Session {
    id: string;
    user_id: string;
    client_token: string;
    ip: string;
}

export class SessionsController {
    constructor(public readonly server: AccountServer) {}

    async getClientSession(authorization: string) {
        const [ tokenType, token ] = authorization.split(" ");
        if (tokenType !== "Bearer" || !token) throw new Unauthorized();

        const { rows: foundSessions } = await this.server.postgresClient.query(`
            SELECT *
            FROM session
            WHERE client_token = $1
        `, [ token ]);

        return foundSessions[0] as Session|undefined;
    }

    async getConnectionSession(userId: string) {
        const { rows: foundSessions } = await this.server.postgresClient.query(`
            SELECT *
            FROM session
            WHERE user_id = $1
        `, [ userId ]);

        return foundSessions[0] as Session|undefined;
    }

    async createSession(userId: string) {
        const randomBytes = crypto.randomBytes(20);
        const sha256Hash = crypto.createHash("sha256").update(randomBytes).digest("hex");

        const { rows: createdSessions } = await this.server.postgresClient.query(`
            INSERT INTO session(id, user_id, client_token)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [ crypto.randomUUID(), userId, sha256Hash ]);

        return createdSessions[0] as Session|undefined;
    }

    async validateAuthorization(transaction: Transaction<any>) {
        const authorization = transaction.req.header("Authorization");
        if (authorization === undefined) throw new Unauthorized();
        const session = await this.getClientSession(authorization);
        if (session === undefined) throw new Unauthorized();
        return session;
    }

    async deleteSession(id: string) {
        const { rows: deletedSessions } = await this.server.postgresClient.query(`
            DELETE
            FROM session
            WHERE id = $1
        `, [ id ]);

        return deletedSessions.length > 0;
    }
}