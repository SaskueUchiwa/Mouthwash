import * as mediator from "mouthwash-mediator";

export class FailedToAwardBundles extends mediator.TransactionError {
    constructor(public readonly paymentIntentId: string) { super("FAILED_TO_AWARD_BUNDLES"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.InternalServerError;
    }

    getMessage(): string {
        return "That display name is already in use by a user.";
    }

    getPublicDetails(): Record<string, any> {
        return {
            
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return {
            stripe_payment_intent_id: this.paymentIntentId
        };
    }
}