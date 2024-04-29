import * as express from "express";
import { HttpStatusCode } from "./enum";
import { TransactionError } from "./error";

/**
 * An abstraction of express' req/res model to provide endpoints with a standardised
 * way to handle request information and various types of responses.
 * 
 * A transaction is just an interaction between the server and client that needs
 * to be resolved through a HTTP response.
 * 
 * @template ParamType The object containing the path parameters as properties.
 */
export class Transaction<ParamType = any> {
    /**
     * Whether or not the transaction has been responded to.
     */
    protected _didRespond: boolean;
    /**
     * The error that was sent to the user, if any.
     */
    protected _errorResponse: TransactionError|undefined;

    /**
     * @param req The request object provided by express.
     * @param res The response object provided by express.
     */
    constructor(public readonly req: express.Request, public readonly res: express.Response) {
        this._didRespond = false;
        this._errorResponse = undefined;
    }

    /**
     * An object containing the path parameters and  their values as sent in the request.
     */
    getParams() {
        return this.req.params as ParamType;
    }
    
    /**
     * An object containing query values from the querystring part of the URL.
     */
    getQueryParams() {
        return this.req.query;
    }

    /**
     * The body of the request.
     * 
     * Note that by default this is in JSON, however middlewares are sometimes
     * needed in order to get another type of body sent by the user.
     */
    getBody() {
        return this.req.body;
    }

    /**
     * Throw an error if there has already been a response sent to the client.
     */
    assertNoResponse() {
        if (this._didRespond)
            throw new Error("HTTP headers already sent");
    }

    /**
     * Respond to the client with a redirection to another URL.
     * 
     * @param url The URL to redirect the client to.
     * @param permanent Whether or not the redirection is permanent and therefore
     * can be cached by the client.
     */
    respondRedirection(url: string, permanent = false) {
        this.assertNoResponse();

        this._didRespond = true;
        this.res.status(permanent ? HttpStatusCode.PermanentRedirect : HttpStatusCode.TemporaryRedirect);
        this.res.redirect(url);
    }

    /**
     * Respond to the client with a JSON body, including a "success" key that indicates
     * whether the request was successful, and a "data" key that contains the actual
     * response payload.
     * 
     * @see {@link Transaction.respondJsonRaw} to send JSON as it is without any
     * boilerplate.
     * 
     * @param json The body of the response in non-serialised JSON.
     * @param statusCode The status code to send back in the response.
     */
    respondJson<T>(json: T, statusCode = HttpStatusCode.OK) {
        this.assertNoResponse();

        this._didRespond = true;
        this.res.status(statusCode);
        this.res.json({ success: statusCode === HttpStatusCode.OK, data: json });
    }

    /**
     * Respond to the client with a JSON body.
     * 
     * @param json The body of the response in non-serialised JSON.
     * @param statusCode The status code to send back in the response.
     */
    respondJsonRaw(json: any, statusCode = HttpStatusCode.OK) {
        this.assertNoResponse();

        this._didRespond = true;
        this.res.status(statusCode);
        this.res.json(json);
    }

    /**
     * Respond to the client with a plain-text body.
     * 
     * @param text The body of the response in text.
     * @param statusCode The status code to send back in the response.
     */
    respondRaw(text: string, statusCode = HttpStatusCode.OK) {
        this.assertNoResponse();

        this._didRespond = true;
        this.res.status(statusCode);
        this.res.end(text);
    }

    /**
     * Respond to the client with no body.
     * 
     * Uses "204 No Content" as the status code.
     */
    respondNoContent() {
        this.assertNoResponse();
        
        this._didRespond = true;
        this.res.status(HttpStatusCode.NoContent).end("");
    }

    /**
     * Respond to the client with a transaction error.
     * 
     * @param error The error to respond with.
     */
    respondError(error: TransactionError) {
        this.assertNoResponse();
        
        const statusCode = error.getHttpStatus();

        if (statusCode >= 200 && statusCode < 400) {
            throw new Error("Transaction error status code 200 and 300 are not valid error statuses");
        }

        this._didRespond = true;
        this._errorResponse = error;

        this.res.status(statusCode);
        this.res.json({
            code: error.code,
            message: error.getMessage(),
            details: error.getPublicDetails()
        });
    }

    /**
     * Get the error that was sent to the client, if any.
     */
    getErrorResponse() {
        return (this._didRespond && this._errorResponse) || false;
    }
}