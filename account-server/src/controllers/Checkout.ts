import * as crypto from "crypto";
import { AccountServer } from "../AccountServer";

export interface Checkout {
    id: string;
    user_id: string;
    stripe_price_id: string;
    bundle_id: string;
    created_at: Date;
    canceled_at: Date|null;
    stripe_payment_intent_id: string;
    completed_at: Date|null;
}

export interface StripeItem {
    id: string;
    stripe_price_id: string;
    stripe_product_id: string;
}

export class CheckoutController {
    constructor(public readonly server: AccountServer) {}

    async createCheckout(userId: string, stripePriceId: string, bundleId: string, paymentIntentId: string) {
        const { rows: createdCheckouts } = await this.server.postgresClient.query(`
            INSERT INTO checkout_session(id, user_id, stripe_price_id, bundle_id, created_at, canceled_at, stripe_payment_intent_id, completed_at)
            VALUES($1, $2, $3, $4, NOW(), NULL, $5, NULL)
            RETURNING *
        `, [ crypto.randomUUID(), userId, stripePriceId, bundleId, paymentIntentId ]);

        return createdCheckouts[0] as Checkout|undefined;
    }

    async getCheckoutById(id: string) {
        const { rows: foundCheckouts } = await this.server.postgresClient.query(`
            SELECT *
            FROM checkout_session
            WHERE id = $1
        `, [ id ]);

        return foundCheckouts[0] as Checkout|undefined;
    }

    async setCheckoutCancelled(id: string) {
        const { rows: updatedCheckouts } = await this.server.postgresClient.query(`
            UPDATE checkout_session
            SET canceled_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ id ]);

        return updatedCheckouts[0] as Checkout|undefined;
    }

    async setCheckoutCompleted(id: string) {
        const { rows: updatedCheckouts } = await this.server.postgresClient.query(`
            UPDATE checkout_session
            SET completed_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ id ]);

        return updatedCheckouts[0] as Checkout|undefined;
    }

    async getBundleStripeItem(bundleId: string) {
        const { rows: foundStripeItems } = await this.server.postgresClient.query(`
            SELECT *
            FROM stripe_item
            RIGHT JOIN bundle ON bundle.stripe_item_id = stripe_item.id
            WHERE bundle.id = $1
        `, [ bundleId ]);
        
        return foundStripeItems[0] as StripeItem|undefined;
    }
}