import * as mediator from "mouthwash-mediator";

export class MissingHeaderError extends mediator.TransactionError {
    constructor(public readonly headerName: string) { super("MISSING_HEADER"); }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.BadRequest;
    }

    getMessage(): string {
        return "Request is missing a header.";
    }

    getPublicDetails(): Record<string, any> {
        return {
            header_name: this.headerName
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { };
    }
}