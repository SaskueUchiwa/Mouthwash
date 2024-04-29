import * as mediator from "mouthwash-mediator";
import { Problems } from "arktype";

export class InvalidBodyError extends mediator.TransactionError {
    constructor(public readonly problems: Problems) { super("INVALID_BODY") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.BadRequest;
    }

    getMessage(): string {
        return this.problems.summary;
    }

    getPublicDetails(): Record<string, any> {
        return this.problems;
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}