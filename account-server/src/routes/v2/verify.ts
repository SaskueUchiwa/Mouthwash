import * as mediator from "mouthwash-mediator";
import { BaseRoute } from "../BaseRoute";

export class VerifyRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/verify")
    async onVerifyEmail(transaction: mediator.Transaction<{}>) {
        const { t } = transaction.getQueryParams();
        if (typeof t !== "string") {
            transaction.respondRaw("Failed to verify email address, try requesting the email again.")
            return;
        }

        const verification = await this.server.accountsController.getEmailVerificationIntentById(t);
        if (verification === undefined) {
            transaction.respondRaw("Failed to verify email address, try requesting the email again.")
            return;
        }

        const success = await this.server.accountsController.setUserEmailVerified(verification.user_id, verification.id);
        if (!success) {
            transaction.respondRaw("Failed to verify email address, try requesting the email again.")
            return;
        }
        
        transaction.respondRaw("Successfully verified email address, you can close this tab and return back to the launcher now.");
    }
}