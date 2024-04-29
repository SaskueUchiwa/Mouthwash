import * as mediator from "mouthwash-mediator";

export class PaymentNotFinalised extends mediator.TransactionError {
    constructor() { super("PAYMENT_NOT_FINALISED") }

    getHttpStatus(): mediator.HttpStatusCode {
        return mediator.HttpStatusCode.BadRequest;
    }

    getMessage(): string {
        return "The payment is still awaiting payment information from the user.";
    }

    getPublicDetails(): Record<string, any> {
        return { };
    }

    getPrivateDetails(): Record<string, string | number | boolean | null> {
        return { }
    }
}