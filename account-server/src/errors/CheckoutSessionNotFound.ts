import * as mediator from "mouthwash-mediator";

export class CheckoutSessionNotFound extends mediator.TransactionError {
    constructor(public readonly id: string) { super("CHECKOUT_SESSION_NOT_FOUND") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.NotFound;
    }

    getMessage(): string {
        return "Could not find a checkout session by that identifier.";
    }

    getPublicDetails(): Record<string, any> {
        return { id: this.id };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}