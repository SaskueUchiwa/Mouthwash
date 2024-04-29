/**
 * Configuration for a Mediator HTTP server.
 */
export interface MediatorServerConfig {
    /**
     * Whether or not the server is in development mode, i.e., whether debugging
     * information is emitted to the console.
     */
    development: boolean;
    /**
     * A set of domains that can be allowed to make CORS requests to the server
     * on a user's browser.
     */
    crossDomains: string[];
    /**
     * A set of allowed headers that the client can pass to the server.
     */
    allowedHeaders: string[];
    /**
     * A path to prefix each path with. Useful if not in a NGINX environment to
     * prefix every path with a version indicator ("/v1", "/v2", etc);
     */
    pathPrefix: string;
}