import mailjet from "node-mailjet";
import { EmailProvider } from "./EmailProvider";
import { AccountServer } from "../../AccountServer";

export class MailjetEmailProvider extends EmailProvider {
    mjClient: mailjet|undefined;

    constructor(public readonly server: AccountServer) {
        super(server);

        if (this.isAvailable())
            this.mjClient = mailjet.apiConnect(process.env.MAILJET_API_PUBLIC_KEY as string, process.env.MAILJET_API_SECRET_KEY as string);
    }

    async sendVerificationEmail(email: string, verifyUrl: string) {
        if (!this.mjClient)
            throw new Error("Mailjet client not initialized");

        await this.mjClient.post("send", { version: "v3.1" })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": process.env.VERIFICATION_EMAIL as string,
                            "Name": process.env.VERIFICATION_EMAIL_NAME as string
                        },
                        "To": [
                            {
                                "Email": email
                            }
                        ],
                        "Subject": "Verify Email Address to Sign Up",
                        "TextPart": "Click the following link verify your email address to login: " + verifyUrl,
                        "HTMLPart": `Click the following link verify your email address to login: <a href="${verifyUrl}">${verifyUrl}</a>`
                    }
                ]
            });
    }
    
    async sendResetPasswordEmail(email: string, displayName: string, code: string) {
        if (!this.mjClient) throw new Error("Mailgun client not initialized");

        await this.mjClient.post("send", { version: "v3.1" })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": process.env.VERIFICATION_EMAIL as string,
                            "Name": process.env.VERIFICATION_EMAIL_NAME as string
                        },
                        "To": [
                            {
                                "Email": email
                            }
                        ],
                        "Subject": "Reset Password for Your Account",
                        "TextPart": `You requested to reset your password for your account '${displayName}', use the following code in the launcher to do so: ${code}`,
                        "HTMLPart":`You requested to reset your password for your account '${displayName}', use the following code in the launcher to do so: <pre>${code}</pre>`
                    }
                ]
            });
    }

    isAvailable(): boolean {
        return !!process.env.VERIFICATION_DOMAIN && !!process.env.VERIFICATION_EMAIL && !!process.env.VERIFICATION_EMAIL_NAME
            && !!process.env.MAILJET_API_PUBLIC_KEY && !!process.env.MAILJET_API_SECRET_KEY
    }
}