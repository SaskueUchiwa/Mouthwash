import * as mediator from "mouthwash-mediator";

export class EmailAlreadyInUseError extends mediator.TransactionError {
    constructor(public readonly email: string, public readonly existingUserId: string) { super("EMAIL_ALREADY_IN_USE"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Conflict;
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
            existingUserId: this.existingUserId
        };
    }
}