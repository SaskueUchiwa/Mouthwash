import { HttpStatusCode } from "../enum";
import { TransactionError } from "./TransactionError";

/**
 * Thrown when a JavaScript error (or other unexpected error) is encountered while
 * processing a transaction.
 */
export class InternalServerError extends TransactionError {
    /**
     * @param error The error that took place while processing the transaction.
     */
    public constructor(public readonly error: Error) {
        super("INTERNAL_SERVER_ERROR");
    }

    getHttpStatus(): HttpStatusCode {
        return HttpStatusCode.InternalServerError;
    }

    getMessage(): string {
        return "Internal server error.";
    }

    getPublicDetails(): Record<string, any> {
        return {};
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { message: this.error.message, stack: this.stack || null };
    }
    
}