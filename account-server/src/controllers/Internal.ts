import { ForbiddenError } from "../errors";
import * as express from "express";

export class InternalController {
    static validateInternalAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
        const authHeader = req.header("Authorization");
        if (authHeader === undefined) throw new ForbiddenError("INTERNAL_ACCESS");

        const [ tokenType, token ] = authHeader.split(" ");
        if (tokenType !== "Service" || token !== process.env.INTERNAL_ACCESS_KEY) {
            throw new ForbiddenError("INTERNAL_ACCESS");
        }

        next();
    }
}