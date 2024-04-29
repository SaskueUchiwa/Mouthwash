import { AccountServer } from "../AccountServer";

export class BaseRoute {
    constructor(public readonly server: AccountServer) {}
}