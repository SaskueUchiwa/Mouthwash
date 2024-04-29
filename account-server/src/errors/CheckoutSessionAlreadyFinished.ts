import * as mediator from "mouthwash-mediator";

export class CheckoutSessionAlreadyFinished extends mediator.TransactionError {
    constructor(public readonly id: string) { super("CHECKOUT_SESSION_ALREADY_FINISHED") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Conflict;
    }

    getMessage(): string {
        return "The checkout session has already been completed or canceled.";
    }

    getPublicDetails(): Record<string, any> {
        return { id: this.id };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}