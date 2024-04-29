import "reflect-metadata";
import * as express from "express";
import { HttpMethod } from "../enum";
import { Transaction } from "../Transaction";
import { getMiddlewares } from "./Middleware";

/**
 * An object containing unparsed express-style path parameters as keys.
 */
export type ParsedPathParameters<T extends string> = T extends `${string}/:${infer Y}/${infer Z}`
    ? {
        [_ in Y]: string;
    } & ParsedPathParameters<Z>
    : T extends `${string}/:${infer Y}`
        ? {
            [_ in Y]: string;
        } : {};

/**
 * A function which can take in a Mediator HTTP transaction.
 */
export type RequestHandler<Params = any> = (transaction: Transaction<Params>) => any;

/**
 * Information about an endpoint as declared using {@link Endpoint}.
 */
export interface DeclaredEndpointInformation {
    /**
     * The method that the endpoint takes.
     */
    method: HttpMethod;
    /**
     * The path that the endpoint is available at, including the unparsed path
     * parameters.
     */
    path: string;
    /**
     * Any middlewares that need to be processed before the main handler can be
     * executed.
     * 
     * @see {@link Middleware}
     */
    middlewares: express.Handler[];
    /**
     * The handler that takes in the transaction and produces a response to the client.
     */
    handler: RequestHandler;
}

/**
 * A unique key for reflection, containing information about the endpoints declared
 * on a route.
 */
const raincodeEndpointsReflectKey = Symbol("raincode:endpoints");

/**
 * A decorator for declaring an endpoint on a route to be processed and used later
 * by the {@link MediatorServer}.
 * 
 * @param method The HTTP method that the endpoint takes.
 * @param path The unparsed express-style path that the endpoint is available at.
 * @returns The actual decorator. This function is a decorator factory.
 */
export function Endpoint<UnparsedPath extends string>(method: HttpMethod, path: UnparsedPath) {
    return function(target: any, propertyName: string, propertyDescriptor: TypedPropertyDescriptor<RequestHandler<ParsedPathParameters<UnparsedPath>>>) {
        const info = getAllEndpoints(target);
        const middlewares = getMiddlewares(target, propertyName) || [];
        info.push({
            method,
            path,
            middlewares,
            handler: propertyDescriptor.value!
        });
    }
}

/**
 * Get information about all endpoints declared on a route.
 * 
 * @param obj The route which has its endpoints declared.
 * @returns The declared endpoint information.
 */
export function getAllEndpoints(obj: any): DeclaredEndpointInformation[] {
    const cachedInfo = Reflect.getMetadata(raincodeEndpointsReflectKey, obj);
    const info = cachedInfo || [];
    if (!cachedInfo) {
        Reflect.defineMetadata(raincodeEndpointsReflectKey, info, obj);
    }
    return info;
}