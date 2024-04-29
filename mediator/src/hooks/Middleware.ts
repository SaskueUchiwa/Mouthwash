import "reflect-metadata";
import * as express from "express";
import { RequestHandler } from "./Endpoint";

/**
 * A unique key for reflection, containing handlers for any middleware handlers that
 * need to be processed before the main handler as declared in the {@link Endpoint}
 * decorator.
 */
const raincodeMiddlewareKey = Symbol("raincode:middlewares");

/**
 * Declare an endpoint method to use a set of middlewares before the main handler
 * can be processed.
 * 
 * @param middlewares All middlewares to be processed before the main handler.
 * @returns The actual decorator. This function is a decorator factory. 
 */
export function Middleware(...middlewares: express.Handler[]) {
    return function(target: any, propertyName: string, propertyDescriptor: TypedPropertyDescriptor<RequestHandler>) {
        Reflect.defineMetadata(raincodeMiddlewareKey, middlewares, target, propertyName);
    }
}

/**
 * Get all middleware handlers for a given endpoint handler method on a route class.
 * 
 * @param obj The route class which contains the endpoint handler method.
 * @param key The endpoint handler method name.
 * @returns All middleware handlers for the given endpoint handler method on the
 * given route class.
 */
export function getMiddlewares(obj: any, key: string): express.Handler[]|undefined {
    return Reflect.getMetadata(raincodeMiddlewareKey, obj, key);
}