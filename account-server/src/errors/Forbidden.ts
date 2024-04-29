import * as mediator from "mouthwash-mediator";

export class ForbiddenError extends mediator.TransactionError {
    constructor(public readonly reason: string) { super("FORBIDDEN") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Forbidden;
    }

    getMessage(): string {
        return "You are forbidden from accessing this resource due to your permissions.";
    }

    getPublicDetails(): Record<string, any> {
        return {
            reason: this.reason
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}