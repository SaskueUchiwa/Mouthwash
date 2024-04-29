import * as mediator from "mouthwash-mediator";

export class DisplayNameAlreadyInUse extends mediator.TransactionError {
    constructor(public readonly display_name: string, public readonly existingUserId: string) { super("DISPLAY_NAME_ALREADY_IN_USE"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Conflict;
    }

    getMessage(): string {
        return "That display name is already in use by a user.";
    }

    getPublicDetails(): Record<string, any> {
        return {
            display_name: this.display_name
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return {
            existingUserId: this.existingUserId
        };
    }
}