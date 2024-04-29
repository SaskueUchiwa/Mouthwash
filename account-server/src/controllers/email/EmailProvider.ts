import { AccountServer } from "../../AccountServer";

export abstract class EmailProvider {
    constructor(public readonly server: AccountServer) {}

    abstract sendVerificationEmail(email: string, verifyUrl: string): Promise<void>;
    abstract sendResetPasswordEmail(email: string, displayName: string, code: string): Promise<void>;
    abstract isAvailable(): boolean;
}