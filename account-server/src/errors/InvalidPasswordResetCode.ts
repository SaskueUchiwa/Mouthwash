import * as mediator from "mouthwash-mediator";

export class InvalidPasswordResetCode extends mediator.TransactionError {
    constructor(public readonly resetId: string) { super("INVALID_PASSWORD_RESET_CODE") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.Unauthorized;
    }

    getMessage(): string {
        return "The code you entered to verify your password reset was invalid";
    }

    getPublicDetails(): Record<string, any> {
        return {
            reset_id: this.resetId
        };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}