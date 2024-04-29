import * as mediator from "mouthwash-mediator";

export class Unauthorized extends mediator.TransactionError {
    constructor() { super("UNAUTHORIZED"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Unauthorized;
    }

    getMessage(): string {
        return "You are not authorized to access this resource. Check the request headers.";
    }

    getPublicDetails(): Record<string, any> {
        return { };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { };
    }
}