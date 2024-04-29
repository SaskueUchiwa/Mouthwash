import * as mediator from "mouthwash-mediator";

export class PasswordResetIntentNotFoundError extends mediator.TransactionError {
    constructor(public readonly id: string) { super("PASSWORD_RESET_INTENT_NOT_FOUND") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.NotFound;
    }

    getMessage(): string {
        return "Could not ffind a password reset intent by that id, belonging to that user";
    }

    getPublicDetails(): Record<string, any> {
        return { id: this.id };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}