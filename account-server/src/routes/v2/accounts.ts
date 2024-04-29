import * as mediator from "mouthwash-mediator";
import * as crypto from "crypto";
import * as ark from "arktype";
import * as express from "express";

import {
    BundleAlreadyOwnedError,
    BundleNotFoundError,
    EmailAlreadyInUseError,
    InvalidBodyError,
    TooManyVerificationEmailsError,
    UserNotFoundError,
    DisplayNameAlreadyInUse,
    CheckoutSessionNotFound,
    PaymentNotFinalised,
    CheckoutSessionAlreadyFinished,
    InvalidPasswordResetCode,
    PasswordResetIntentNotFoundError,
    EmailAlreadyVerifiedError,
    Unauthorized,
    
} from "../../errors";

import * as amongus from "@skeldjs/client";
import { updateCosmeticsRequestValidator } from "./internal/users";
import { BundleItem } from "../../controllers";
import { BaseRoute } from "../BaseRoute";

export const createUserRequestValidator = ark.type({
    email: "email",
    password: "8<=string<=128",
    display_name: /^[a-zA-Z0-9_\-]{3,24}$/
});

export const resendVerificationEmailRequestValidator = ark.type({
    email: "email"
});

export const checkoutBundleRequestValidator = ark.type({
    bundle_id: "uuid"
});

export const completeCheckoutRequestValidation = ark.type({
    checkout_session_id: "uuid"
});

export const resetPasswordRequestValidator = ark.type({
    email: "email"
});

export const resetPasswordVerifyRequestValidator = ark.type({
    email: "email",
    reset_id: "string",
    reset_code: "string",
    new_password: "8<=string<=128"
});
// typescript only does unidirection for string enums, so we'll reverse them here
// we use this to check if a cosmetic hat is in the game or not
const amongUsHatsOfficial: Set<string> = new Set(Object.values(amongus.Hat));
const amongUsPetsOfficial: Set<string> = new Set(Object.values(amongus.Pet));
const amongUsSkinsOfficial: Set<string> = new Set(Object.values(amongus.Skin));
const amongUsVisorsOfficial: Set<string> = new Set(Object.values(amongus.Visor));
const amongUsNameplatesOfficial: Set<string> = new Set(Object.values(amongus.Nameplate));

export class AccountsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts")
    @mediator.Middleware(express.json())
    async onCreateAccount(transaction: mediator.Transaction<{}>) {
        const { data, problems } = createUserRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const existingUserEmail = await this.server.accountsController.getUserByEmail(data.email);
        if (existingUserEmail) throw new EmailAlreadyInUseError(data.email, existingUserEmail.id);

        const existingUserDisplayName = await this.server.accountsController.getUserByDisplayName(data.display_name);
        if (existingUserDisplayName) throw new DisplayNameAlreadyInUse(data.display_name, existingUserDisplayName.id);

        const doVerifyEmail = this.server.accountsController.canSendEmailVerification();
        const user = await this.server.accountsController.createUser(data.display_name, data.email, data.password, !doVerifyEmail);
        if (user === undefined) throw new mediator.InternalServerError(new Error(`Failed to create user? (email=${data.email} display_name=${data.display_name})`));

        if (doVerifyEmail) {
            const emailVerification = await this.server.accountsController.createEmailVerificationIntent(user.id);
            if (emailVerification === undefined) throw new mediator.InternalServerError(new Error(`Failed to create email intent? (email=${data.email})`));
            await this.server.accountsController.sendEmailVerificationIntent(user.email, emailVerification.id);
            transaction.respondJson({ user, verify_email: true });
        } else {
            transaction.respondJson({ user, verify_email: false });
        }
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/resend_verification")
    @mediator.Middleware(express.json())
    async onResendEmailVerification(transaction: mediator.Transaction<{}>){ 
        const { data, problems } = resendVerificationEmailRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const foundUser = await this.server.accountsController.getUserByEmail(data.email);
        if (foundUser === undefined) throw new UserNotFoundError({ email: data.email });

        if (foundUser.email_verified) throw new EmailAlreadyVerifiedError(data.email);

        if (!this.server.accountsController.canSendEmailVerification())
            throw new mediator.InternalServerError(new Error("User sent email verification request, but email provider is not available on the server"));

        const foundExistingVerification = await this.server.accountsController.getEmailVerificationIntentForUser(foundUser.id);
        if (foundExistingVerification === undefined) {
            const emailVerification = await this.server.accountsController.createEmailVerificationIntent(foundUser.id);
            if (emailVerification === undefined) throw new mediator.InternalServerError(new Error(`Failed to create email intent? (email=${data.email})`));
            await this.server.accountsController.sendEmailVerificationIntent(foundUser.email, emailVerification.id);
        } else {
            if (foundExistingVerification.last_sent.getTime() > Date.now() - 2 * 60 * 1000)
                throw new TooManyVerificationEmailsError(foundUser.email, foundUser.id);

            await this.server.accountsController.sendEmailVerificationIntent(foundUser.email, foundExistingVerification.id);
        }

        transaction.respondJson({});
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/reset_password")
    @mediator.Middleware(express.json())
    async onResetPassword(transaction: mediator.Transaction<{}>){ 
        const { data, problems } = resetPasswordRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const foundUser = await this.server.accountsController.getUserByEmail(data.email);
        if (foundUser === undefined) {
            transaction.respondJson({ reset_id: crypto.randomUUID() }); // create fake reset id for user who uses a non-existent user email address
            return;
        }

        if (!this.server.accountsController.canValidatePasswordReset())
            throw new mediator.InternalServerError(new Error("User sent password reset request, but email provider is not available on the server"));

        const resetPasswordIntent = await this.server.accountsController.createResetPasswordIntent(foundUser.id);
        if (!resetPasswordIntent)
            throw new mediator.InternalServerError(new Error("User sent password reset request, but password intent was not created"));

        await this.server.accountsController.sendResetPasswordIntent(foundUser.email, foundUser.display_name, resetPasswordIntent.code);

        transaction.respondJson({ reset_id: resetPasswordIntent.id });
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/verify_reset_password")
    @mediator.Middleware(express.json())
    async onResetPasswordVerify(transaction: mediator.Transaction<{}>){ 
        const { data, problems } = resetPasswordVerifyRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const foundUser = await this.server.accountsController.getUserByEmail(data.email);
        if (foundUser === undefined)
            throw new InvalidPasswordResetCode(data.reset_id); // throw fake error for user who uses non-existent user email address

        const resetIntent = await this.server.accountsController.getResetPasswordIntentById(data.reset_id);
        if (!resetIntent || resetIntent.user_id !== foundUser.id)
            throw new PasswordResetIntentNotFoundError(data.reset_id);

        if (resetIntent.code !== data.reset_code)
            throw new InvalidPasswordResetCode(data.reset_id);

        await this.server.accountsController.acceptResetPasswordIntent(data.reset_id, foundUser.id, data.new_password);

        transaction.respondJson({});
    }

    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/accounts/owned_bundles")
    async getOwnedBundles(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedBundles = await this.server.cosmeticsController.getAllBundlesOwnedByUser(session.user_id);
        transaction.respondJson(ownedBundles);
    }

    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/accounts/owned_items")
    async getOwnedItems(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedItems = await this.server.cosmeticsController.getAllCosmeticItemsOwnedByUser(session.user_id);
        transaction.respondJson(ownedItems);
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/checkout_bundle")
    @mediator.Middleware(express.json())
    async createBundleCheckoutSession(transaction: mediator.Transaction<{}>) {
        if (!this.server.stripe) {
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));
        }
        
        const { data, problems } = checkoutBundleRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const bundle = await this.server.cosmeticsController.getAvailableBundleById(data.bundle_id);
        if (bundle === undefined)
            throw new BundleNotFoundError(data.bundle_id);

        const stripeItem = await this.server.checkoutController.getBundleStripeItem(data.bundle_id);
        if (stripeItem === undefined)
            throw new BundleNotFoundError(data.bundle_id);

        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const user = await this.server.accountsController.getUserById(session.user_id);
        if (!user)
            throw new mediator.InternalServerError(new Error(`User had session but no user existed in database (user_id=${session.user_id})`));

        const ownedItem = await this.server.cosmeticsController.doesUserOwnBundle(session.user_id, data.bundle_id);
        if (ownedItem)
            throw new BundleAlreadyOwnedError(data.bundle_id);

        if (!user.stripe_customer_id) {
            const customer = await this.server.stripe.customers.create();
            await this.server.accountsController.setUserStripeCustomer(session.user_id, customer.id);
            user.stripe_customer_id = customer.id;
        }
        
        const paymentIntent = await this.server.stripe.paymentIntents.create({
            amount: bundle.price_usd,
            currency: "USD",
            customer: user.stripe_customer_id
        });

        const mouthwashCheckoutSession = await this.server.checkoutController.createCheckout(
            session.user_id,
            stripeItem.stripe_price_id,
            data.bundle_id,
            paymentIntent.id
        );

        if (!mouthwashCheckoutSession)
            throw new mediator.InternalServerError(new Error("Failed to create checkout session."));

        transaction.respondJson({ checkout_session_id: mouthwashCheckoutSession.id, client_secret: paymentIntent.client_secret });
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/checkout_bundle/complete")
    @mediator.Middleware(express.json())
    async completeBundleCheckoutSession(transaction: mediator.Transaction<{}>) {
        if (!this.server.stripe) {
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));
        }

        const { data, problems } = completeCheckoutRequestValidation(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const checkoutSession = await this.server.checkoutController.getCheckoutById(data.checkout_session_id);
        if (!checkoutSession)
            throw new CheckoutSessionNotFound(data.checkout_session_id);

        if (checkoutSession.completed_at !== null || checkoutSession.canceled_at !== null)
            throw new CheckoutSessionAlreadyFinished(data.checkout_session_id);

        const paymentIntent = await this.server.stripe.paymentIntents.retrieve(checkoutSession.stripe_payment_intent_id);
        if (paymentIntent.status !== "succeeded")
            throw new PaymentNotFinalised;

        const ownership = await this.server.cosmeticsController.addOwnedBundle(checkoutSession.user_id, checkoutSession.bundle_id);
        if (!ownership)
            throw new mediator.InternalServerError(new Error("Could not grant bundles"));

        await this.server.checkoutController.setCheckoutCompleted(data.checkout_session_id);
        transaction.respondJson({});
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/checkout_bundle/cancel")
    @mediator.Middleware(express.json())
    async cancelBundleCheckoutSession(transaction: mediator.Transaction<{}>) {
        if (!this.server.stripe) {
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));
        }

        const { data, problems } = completeCheckoutRequestValidation(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const checkoutSession = await this.server.checkoutController.getCheckoutById(data.checkout_session_id);
        if (!checkoutSession)
            throw new CheckoutSessionNotFound(data.checkout_session_id);
        
        if (checkoutSession.completed_at !== null || checkoutSession.canceled_at !== null)
            throw new CheckoutSessionAlreadyFinished(data.checkout_session_id);

        await this.server.checkoutController.setCheckoutCancelled(data.checkout_session_id);
        transaction.respondJson({ });
    }

    assertHasItemOfType(ownedItemMap: Map<string, BundleItem>, itemAmongUsId: string, itemType: string) {
        const bundleItem = ownedItemMap.get(itemAmongUsId);
        if (bundleItem && bundleItem.type === itemType) return;

        throw new Unauthorized();
    }

    @mediator.Endpoint(mediator.HttpMethod.PUT, "/v2/accounts/cosmetics")
    @mediator.Middleware(express.json())
    async saveSelectedCosmetics(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedItems = await this.server.cosmeticsController.getAllCosmeticItemsOwnedByUser(session.user_id);
        
        const { data, problems } = updateCosmeticsRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const ownedItemMap: Map<string, BundleItem> = new Map;
        for (const item of ownedItems) {
            ownedItemMap.set(item.among_us_id, item);
        }

        if (!amongUsHatsOfficial.has(data.cosmetic_hat) && data.cosmetic_hat !== "missing") this.assertHasItemOfType(ownedItemMap, data.cosmetic_hat, "HAT");
        if (!amongUsPetsOfficial.has(data.cosmetic_pet) && data.cosmetic_pet !== "missing") this.assertHasItemOfType(ownedItemMap, data.cosmetic_pet, "PET");
        if (!amongUsSkinsOfficial.has(data.cosmetic_skin) && data.cosmetic_skin !== "missing") this.assertHasItemOfType(ownedItemMap, data.cosmetic_skin, "SKIN");
        if (!amongUsVisorsOfficial.has(data.cosmetic_visor) && data.cosmetic_visor !== "missing") this.assertHasItemOfType(ownedItemMap, data.cosmetic_visor, "VISOR");
        if (!amongUsNameplatesOfficial.has(data.cosmetic_nameplate) && data.cosmetic_nameplate !== "missing") this.assertHasItemOfType(ownedItemMap, data.cosmetic_nameplate, "NAMEPLATE");
    
        const success = await this.server.cosmeticsController.setPlayerCosmetics(session.user_id, data.cosmetic_hat, data.cosmetic_pet, data.cosmetic_skin, data.cosmetic_color, data.cosmetic_visor, data.cosmetic_nameplate);
        if (!success) throw new mediator.InternalServerError(new Error(`Failed to set player cosmetics? user_id=${session.user_id}`));

        transaction.respondJson({});
    }
}