import * as mediator from "mouthwash-mediator";

export class TooManyVerificationEmailsError extends mediator.TransactionError {
    constructor(public readonly email: string, public readonly userId: string) { super("TOO_MANY_VERIFICATION_EMAILS"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.TooManyRequests;
    }

    getMessage(): string {
        return "That email is already in use by a user.";
    }

    getPublicDetails(): Record<string, any> {
        return {
            email: this.email
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return {
            user_d: this.userId
        };
    }
}