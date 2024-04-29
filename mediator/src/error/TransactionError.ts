import { HttpStatusCode } from "../enum";

/**
 * A base error that occurs while processing a HTTP transaction.
 */
export abstract class TransactionError extends Error {
    /**
     * @param code The error code for the client to quickly identify the issue.
     */
    constructor(public readonly code: string) {
        super();
    }
    
    /**
     * Get the HTTP status code that this error represents.
     */
    abstract getHttpStatus(): HttpStatusCode;
    /**
     * Get the message for this error to display to the client in the error response
     * object.
     */
    abstract getMessage(): string;
    /**
     * Get public information that can be sent to the client in the error response
     * object.
     */
    abstract getPublicDetails(): Record<string, any>;
    /**
     * Get private information that can only be emitted on the server and can't
     * be sent to the user due to containing sensitive information.
     */
    abstract getPrivateDetails(): Record<string, number|string|null|boolean>;
}