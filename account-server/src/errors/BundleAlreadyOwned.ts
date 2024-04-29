import * as mediator from "mouthwash-mediator";

export class BundleAlreadyOwnedError extends mediator.TransactionError {
    constructor(public readonly id: string) { super("BUNDLE_ALREADY_OWNED") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Conflict;
    }

    getMessage(): string {
        return "You already own a bundle by that identifier.";
    }

    getPublicDetails(): Record<string, any> {
        return { id: this.id };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}