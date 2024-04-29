import * as mediator from "mouthwash-mediator";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { AccountServer } from "../AccountServer";
import { DeclareSafeKeys } from "../types/DeclareSafeKeys";
import { MailgunEmailProvider, MailjetEmailProvider } from "./email";

export interface User {
    id: string;
    email: string;
    password_hash: string;
    created_at: string;
    banned_until: string;
    muted_until: string;
    game_settings: any;
    email_verified: boolean;
    display_name: string;
    cosmetic_hat: string;
    cosmetic_pet: string;
    cosmetic_skin: string;
    cosmetic_color: number;
    cosmetic_visor: string;
    cosmetic_nameplate: string;
    stripe_customer_id: string;
}

export type SafeUser = DeclareSafeKeys<User, "id"|"email"|"created_at"|"banned_until"|"muted_until"|"email_verified"|"display_name"|"cosmetic_hat"|"cosmetic_pet"|"cosmetic_skin"|"cosmetic_color"|"cosmetic_visor"|"cosmetic_nameplate">;
export type PublicUser = DeclareSafeKeys<SafeUser, "id"|"created_at"|"display_name"|"cosmetic_hat"|"cosmetic_pet"|"cosmetic_skin"|"cosmetic_color"|"cosmetic_visor"|"cosmetic_nameplate">;

export interface EmailVerification {
    id: string;
    user_id: string;
    last_sent: Date;
    num_retries: string;
    verified_at: Date|null;
}

export interface PasswordReset {
    id: string;
    user_id: string;
    code: string;
    sent_at: Date;
    accepted_at: Date|null;
}

export class AccountsController {
    mailgunProvider: MailgunEmailProvider;
    mailjetProvider: MailjetEmailProvider;

    constructor(public readonly server: AccountServer) {
        this.mailgunProvider = new MailgunEmailProvider(this.server);
        this.mailjetProvider = new MailjetEmailProvider(this.server);
    }

    getEmailProvider() {
        if (this.mailgunProvider.isAvailable()) return this.mailgunProvider;
        if (this.mailjetProvider.isAvailable()) return this.mailjetProvider;

        return undefined;
    }

    async getUserByEmail(email: string) {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT *
            FROM users
            WHERE email = $1
        `, [ email ]);

        return foundUsers[0] as User|undefined;
    }

    async getUserByEmailWithCosmetics(email: string): Promise<(User & { preview_bundles_id_url_and_hash: string; })|undefined> {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT users.*, string_agg(bundle.id || '$$' || asset_bundle.preview_contents_url::character varying || '$$' || asset_bundle.preview_contents_hash, ',') AS preview_bundles_id_url_and_hash
            FROM asset_bundle
            LEFT JOIN bundle ON bundle.asset_bundle_id = asset_bundle.id
            LEFT JOIN bundle_item ON bundle_item.bundle_id = bundle.id
            RIGHT JOIN users ON bundle_item.among_us_id = users.cosmetic_hat OR bundle_item.among_us_id = users.cosmetic_skin OR bundle_item.among_us_id = users.cosmetic_visor
            WHERE users.email = $1
            GROUP BY users.id
        `, [ email ]);

        return foundUsers[0] as (User & { preview_bundles_id_url_and_hash: string; })|undefined;
    }

    async getUserByDisplayName(displayName: string) {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT *
            FROM users
            WHERE display_name = $1
        `, [ displayName ]);

        return foundUsers[0] as User|undefined;
    }

    async getUserById(userId: string): Promise<(User & { preview_bundles_id_url_and_hash: string; })|undefined> {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT users.*, string_agg(bundle.id || '$$' || asset_bundle.preview_contents_url::character varying || '$$' || asset_bundle.preview_contents_hash, ',') AS preview_bundles_id_url_and_hash
            FROM asset_bundle
            LEFT JOIN bundle ON bundle.asset_bundle_id = asset_bundle.id
            LEFT JOIN bundle_item ON bundle_item.bundle_id = bundle.id
            RIGHT JOIN users ON bundle_item.among_us_id = users.cosmetic_hat OR bundle_item.among_us_id = users.cosmetic_skin OR bundle_item.among_us_id = users.cosmetic_visor
            WHERE users.id = $1
            GROUP BY users.id
        `, [ userId ]);

        return foundUsers[0] as (User & { preview_bundles_id_url_and_hash: string; })|undefined;
    }

    async createUser(displayName: string, email: string, password: string, emailVerified: boolean) {
        const passwordHash = await bcrypt.hash(password, 12);
        const { rows: createdUsers } = await this.server.postgresClient.query(`
            INSERT INTO users(id, email, password_hash, created_at, banned_until, muted_until, game_settings, email_verified, display_name, cosmetic_color, cosmetic_hat, cosmetic_pet, cosmetic_skin, cosmetic_visor, cosmetic_nameplate, stripe_customer_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [ crypto.randomUUID(), email, passwordHash, new Date(), null, null, {}, emailVerified, displayName, 0, "hat_NoHat", "pet_EmptyPet", "skin_None", "visor_EmptyVisor", "nameplate_NoPlate", null ]);

        return createdUsers[0] as User|undefined;
    }

    async sendEmailVerificationIntent(email: string, verificationId: string) {
        const provider = this.getEmailProvider();
        if (!provider) throw new Error("Email verification not set up on this server.");

        await this.server.postgresClient.query(`
            UPDATE email_verification
            SET last_sent = NOW()
            WHERE id = $1
        `, [ verificationId ]);
        try {
            const verifyUrl = this.server.config.base_account_server_url + "/api/v2/verify?t=" + verificationId;
            await provider.sendVerificationEmail(email, verifyUrl);
        } catch (e: any) {
            this.server.mediatorServer.logger.error(e);
            throw new mediator.InternalServerError(new Error("Failed to send verification e-mail"));
        }
    }

    canSendEmailVerification() {
        return !!this.getEmailProvider();
    }

    async createEmailVerificationIntent(userId: string) {
        const randomBytes = crypto.randomBytes(20);
        const sha256Hash = crypto.createHash("sha256").update(randomBytes).digest("hex");
    
        const { rows: createdEmailVerifications } = await this.server.postgresClient.query(`
            INSERT INTO email_verification(id, user_id, last_sent, num_retries, verified_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [ sha256Hash, userId, new Date, 0, null ]);

        return createdEmailVerifications?.[0] as EmailVerification|undefined;
    }

    async getEmailVerificationIntentForUser(userId: string) {
        const { rows: foundEmailVerifications } = await this.server.postgresClient.query(`
            SELECT * 
            FROM email_verification
            WHERE user_id = $1
        `, [ userId ]);

        return foundEmailVerifications?.[0] as EmailVerification|undefined;
    }

    async getEmailVerificationIntentById(verificationId: string) {
        const { rows: foundEmailVerifications } = await this.server.postgresClient.query(`
            SELECT * 
            FROM email_verification
            WHERE id = $1
        `, [ verificationId ]);

        return foundEmailVerifications?.[0] as EmailVerification|undefined;
    }

    async setUserEmailVerified(userId: string, verificationId: string) {
        const { rows: updatedUsers } = await this.server.postgresClient.query(`
            UPDATE users
            SET email_verified = TRUE
            WHERE id = $1
            RETURNING *
        `, [ userId ]);
        if (updatedUsers.length === 0) return false;
        const { rows: updatedVerifications } = await this.server.postgresClient.query(`
            UPDATE email_verification
            SET verified_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ verificationId ]);
        return updatedVerifications.length > 0;
    }

    async setPlayerGameSettings(userId: string, gameSettings: any) {
        const rowsUpdated = await this.server.postgresClient.query(`
            UPDATE users
            SET game_settings = $1
            WHERE id = $2
            RETURNING *
        `, [ gameSettings, userId ]);

        return rowsUpdated.rowCount > 0;
    }

    canValidatePasswordReset() {
        return !!this.getEmailProvider();
    }

    static codeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    generateResetPasswordCode() {
        let str = "";
        for (let i = 0; i < 5; i++) {
            str += AccountsController.codeChars[Math.floor(Math.random() * AccountsController.codeChars.length)];
        }
        return str;
    }

    async getResetPasswordIntentById(id: string) {
        const { rows: foundResetPasswordIntents } = await this.server.postgresClient.query(`
            SELECT *
            FROM password_reset
            WHERE id = $1
        `, [ id ]);

        return foundResetPasswordIntents[0] as PasswordReset|undefined;
    }

    async getResetPasswordIntents(userId: string) {
        const { rows: foundResetPasswordIntents } = await this.server.postgresClient.query(`
            SELECT *
            FROM password_reset
            WHERE user_id = $1
        `, [ userId ]);

        return foundResetPasswordIntents as PasswordReset[];
    }

    async sendResetPasswordIntent(email: string, displayName: string, code: string) {
        const provider = this.getEmailProvider();
        if (!provider) throw new Error("Password resets not set up on this server.");

        try {
            await provider.sendResetPasswordEmail(email, displayName, code);
        } catch (e: any) {
            this.server.mediatorServer.logger.error(e);
            throw new mediator.InternalServerError(new Error("Failed to send password reset e-mail"));
        }
    }

    async acceptResetPasswordIntent(resetId: string, userId: string, newPassword: string) {
        const { rows: updatedResetPasswordIntents } = await this.server.postgresClient.query(`
            UPDATE password_reset
            SET accepted_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ resetId ]);

        const updatedResetPasswordIntent = updatedResetPasswordIntents[0] as PasswordReset|undefined;
        if (!updatedResetPasswordIntent)
            return false;

        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        const { rows: updatedUsers } = await this.server.postgresClient.query(`
            UPDATE users
            SET password_hash = $2
            WHERE id = $1
            RETURNING *
        `, [ userId, newPasswordHash ]);

        if (updatedUsers.length === 0)
            return false;

        return updatedResetPasswordIntents[0] as PasswordReset|undefined;
    }

    async createResetPasswordIntent(userId: string) {
        const randomCode = this.generateResetPasswordCode();

        const { rows: createdResetPasswordIntents } = await this.server.postgresClient.query(`
            INSERT INTO password_reset(id, user_id, code, sent_at, accepted_at)
            VALUES ($1, $2, $3, NOW(), NULL)
            RETURNING *
        `, [ crypto.randomUUID(), userId, randomCode ]);

        return createdResetPasswordIntents[0] as PasswordReset|undefined;
    }

    async setUserStripeCustomer(userId: string, stripeCustomerId: string) {
        const { rows: updatedUsers } = await this.server.postgresClient.query(`
            UPDATE users
            SET stripe_customer_id = $2
            WHERE id = $1
            RETURNING *
        `, [ userId, stripeCustomerId ]);
        return updatedUsers.length > 0;
    }
}