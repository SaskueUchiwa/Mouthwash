import Mailgun from "mailgun.js";
import FormData from "form-data";

import { EmailProvider } from "./EmailProvider";
import { IMailgunClient } from "mailgun.js/Interfaces";
import { AccountServer } from "../../AccountServer";

export class MailgunEmailProvider extends EmailProvider {
    mgClient: IMailgunClient|undefined;

    constructor(public readonly server: AccountServer) {
        super(server);
        
        if (this.isAvailable()) {
            const mailgunInstance = new Mailgun(FormData);
            this.mgClient = mailgunInstance.client({ username: "api", key: process.env.MAILGUN_API_KEY as string, url: "https://api.eu.mailgun.net/" });
        }
    }

    async sendVerificationEmail(email: string, verifyUrl: string) {
        if (!this.mgClient) throw new Error("Mailgun client not initialized");

        await this.mgClient.messages.create(process.env.VERIFICATION_EMAIL as string, {
            from: `Polus.GG: Rewritten Accounts <${process.env.VERIFICATION_EMAIL as string}>`,
            to: email,
            subject: "Verify Email Address to Sign Up",
            text: "Click the following link verify your email address to login: " + verifyUrl,
            html: `Click the following link verify your email address to login: <a href="${verifyUrl}">${verifyUrl}</a>`
        });
    }

    async sendResetPasswordEmail(email: string, displayName: string, code: string) {
        if (!this.mgClient) throw new Error("Mailgun client not initialized");

        await this.mgClient.messages.create(process.env.VERIFICATION_EMAIL as string, {
            from: `Polus.GG: Rewritten Accounts <${process.env.VERIFICATION_EMAIL as string}>`,
            to: email,
            subject: "Reset Password for Your Account",
            text: `You requested to reset your password for your account '${displayName}', use the following code in the launcher to do so: ${code}`,
            html: `You requested to reset your password for your account '${displayName}', use the following code in the launcher to do so: <pre>${code}</pre>`
        });
    }

    isAvailable(): boolean {
        return !!process.env.VERIFICATION_DOMAIN && !!process.env.VERIFICATION_EMAIL && !!process.env.VERIFICATION_EMAIL_NAME
            && !!process.env.MAILGUN_DOMAIN && !!process.env.MAILGUN_API_KEY;
    }
}