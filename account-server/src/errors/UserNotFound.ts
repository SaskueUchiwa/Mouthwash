import * as mediator from "mouthwash-mediator";

export type TriedUserIdentifiers = {
    email?: string;
    display_name?: string;
    id?: string;
}

export class UserNotFoundError extends mediator.TransactionError {
    constructor(public readonly identifier: TriedUserIdentifiers) { super("USER_NOT_FOUND") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.NotFound;
    }

    getMessage(): string {
        return "Could not find user by that identifier";
    }

    getPublicDetails(): Record<string, any> {
        return this.identifier;
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}