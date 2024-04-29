import express from "express";
import * as kleur from "kleur";
import { DeclaredEndpointInformation, getAllEndpoints } from "./hooks";
import { Transaction } from "./Transaction";
import { InternalServerError, TransactionError } from "./error";
import { MediatorServerConfig } from "./MediatorServerConfig";
import { ImmanuelLogger } from "./logger";

/**
 * An instance of the Mediator server, a light wrapper over the express HTTP
 * server that allows for route-based declaratively defined endpoints.
 * 
 * @template RouteType A type of class as a basis for each route class which contains
 * a set of endpoints to be registered on the server. Helpful for giving endpoints
 * access to databases by passing instances of classes into them via the Mediator server
 * constructor.
 */
export class MediatorServer<RouteType extends { new(...args: any[]): any }> {
    /**
     * Arguments to be passed into the route class as defined by whichever class
     * extends this mediator server.
     */
    private _routeInitArgs: ConstructorParameters<RouteType>[];

    /**
     * The underlying express server that listens on a port and is used by mediator.
     */
    expressServer: express.Express;
    /**
     * A logger for debugging information for the Mediator server.
     */
    logger: ImmanuelLogger;

    /**
     * @param config Configuration for the server.
     * @param name A name for the server to use for logging.
     * @param args Arguments to pass into the route class.
     */
    constructor(public readonly config: MediatorServerConfig, name: string, ...args: ConstructorParameters<RouteType>) {
        this._routeInitArgs = args;
        this.expressServer = express();

        this.expressServer.use(express.json({ limit: "10mb" }));

        this.expressServer.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", config.crossDomains.join(", "));
            res.header("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

            if (req.method === "OPTIONS") return res.status(200).end();

            next();
        });

        this.logger = new ImmanuelLogger({ development: config.development }, name);
    }

    /**
     * Register a declared endpoint from a route onto the Mediator server, so that
     * clients can make requests to it.
     * 
     * @param route The route class instance that the endpoint is from.
     * @param declaredEndpoint Information about the endpoint to register on the server.
     */
    registerEndpoint(route: InstanceType<RouteType>, declaredEndpoint: DeclaredEndpointInformation) {
        const path = this.config.pathPrefix + declaredEndpoint.path;
        this.expressServer[declaredEndpoint.method](path, ...declaredEndpoint.middlewares, async (req, res) => {
            const transaction = new Transaction(req, res);
            const start = Date.now();
            try {
                await declaredEndpoint.handler.call(route, transaction);
            } catch (e) {
                if (e instanceof TransactionError) {
                    transaction.respondError(e);
                } else {
                    transaction.respondError(new InternalServerError(e as Error));
                }
            }
            const end = Date.now();
            this.logger.info("%s %s %sms", declaredEndpoint.method.toUpperCase(), path, end - start);
            const error = transaction.getErrorResponse();
            if (error) {
                if (error instanceof InternalServerError) {
                    this.logger.error("Exception @ %s %s: %s", kleur.yellow(declaredEndpoint.method.toUpperCase()), kleur.grey(path), error.error);
                    return;
                }
                this.logger.error("Error @ %s %s: %s", kleur.yellow(declaredEndpoint.method.toUpperCase()), kleur.grey(path), error);
            }
        });
        this.logger.info("Registered endpoint @ %s %s (%s middleware%s)",
            kleur.bgMagenta(declaredEndpoint.method.toUpperCase()), kleur.grey(path),
            declaredEndpoint.middlewares.length, declaredEndpoint.middlewares.length === 1 ? "" : "s");
    }

    /**
     * Register all endpoints from a route on the server.
     * 
     * @param routeCtr The route class which contains all of the declared endpoints.
     * Note that this is _not_ an instance of the route.
     * @returns The instance of the route.
     */
    registerRoute(routeCtr: RouteType): InstanceType<RouteType> {
        const route = new routeCtr(...this._routeInitArgs) as InstanceType<RouteType>;
        const endpoints = getAllEndpoints(Object.getPrototypeOf(route));

        for (const endpoint of endpoints) {
            this.registerEndpoint(route, endpoint);
        }

        return route;
    }

    /**
     * Begin listening for client requests on a specific port.
     * 
     * @param port The port number to begin listening on.
     */
    listen(port: number) {
        this.expressServer.listen(port);
        this.logger.info("Listening on *:%s", port);
    }
}