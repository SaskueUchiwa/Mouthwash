import * as mediator from "mouthwash-mediator";

export class EmailAlreadyVerifiedError extends mediator.TransactionError {
    constructor(public readonly email: string) { super("EMAIL_ALREADY_VERIFIED"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Conflict;
    }

    getMessage(): string {
        return "That email is already verified.";
    }

    getPublicDetails(): Record<string, any> {
        return {
            email: this.email
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { };
    }
}