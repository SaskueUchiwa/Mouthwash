import * as mediator from "mouthwash-mediator";
import * as express from "express";
import { BaseRoute } from "../BaseRoute";
import { FailedToAwardBundles } from "../../errors";

export class StripeRoute extends BaseRoute {
    // @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/webhook/stripe")
    @mediator.Middleware(express.text({ type: "application/json" }))
    async finaliseUserBundleCheckout(transaction: mediator.Transaction<{}>) {
        const signature = transaction.req.header("stripe-signature");
        if (!this.server.config.stripe || !this.server.stripe)
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));

        const event = this.server.stripe.webhooks.constructEvent(transaction.getBody(), signature || "", this.server.config.stripe.signing_secret);

        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntentSucceeded = event.data.object;
                break;
            case "checkout.session.completed":
                const checkoutSessionCompleted = event.data.object as any;
                if (checkoutSessionCompleted.payment_status === "paid") {
                    const mouthwashCheckoutSession = await this.server.checkoutController.getCheckoutById(checkoutSessionCompleted.client_reference_id);
                    if (mouthwashCheckoutSession === undefined)
                        throw new FailedToAwardBundles(checkoutSessionCompleted.payment_intent);

                    // await this.server.checkoutController.setCheckoutPaymentIntent(mouthwashCheckoutSession.id, checkoutSessionCompleted.payment_intent);
                    await this.server.cosmeticsController.addOwnedBundle(mouthwashCheckoutSession.user_id, mouthwashCheckoutSession.bundle_id);
                }
                break;
            case "checkout.session.expired":
                const mouthwashCheckoutSession = await this.server.checkoutController.getCheckoutById(checkoutSessionCompleted.client_reference_id);
                if (mouthwashCheckoutSession === undefined)
                    return;

                await this.server.checkoutController.setCheckoutCancelled(mouthwashCheckoutSession.id);
                break;
            default:
                this.server.mediatorServer.logger.warn(`Unhandled Stripe event type ${event.type}`);
        }

        transaction.respondRaw("", mediator.HttpStatusCode.OK);
    }
}