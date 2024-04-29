import * as mediator from "mouthwash-mediator";
import { BaseRoute } from "../../../routes/BaseRoute";
import { Unauthorized } from "../../../errors";
import { InternalController } from "../../../controllers";

export class SessionsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/internal/users/:user_id/session")
    @mediator.Middleware(InternalController.validateInternalAccess)
    async getUserSession(transaction: mediator.Transaction<{ user_id: string; }>) {
        const { user_id } = transaction.getParams();
        const session = await this.server.sessionsController.getConnectionSession(user_id);
        if (session === undefined) throw new Unauthorized();
        
        transaction.respondJson(session);
    }
}