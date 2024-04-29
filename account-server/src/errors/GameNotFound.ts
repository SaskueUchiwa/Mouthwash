import * as mediator from "mouthwash-mediator";

export class GameNotFoundError extends mediator.TransactionError {
    constructor(public readonly id: string) { super("GAME_NOT_FOUND") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.NotFound;
    }

    getMessage(): string {
        return "Could not find a game by that identifier";
    }

    getPublicDetails(): Record<string, any> {
        return { id: this.id };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}