<script lang="ts">
    import { get } from "svelte/store";
    import Email from "../../../icons/Email.svelte";
    import Key from "../../../icons/Key.svelte";
    import { accountUrl, user } from "../../../stores/accounts";
    import ErrorNotes from "./ErrorNotes.svelte";
    import Ellipsis from "../../../icons/Ellipsis.svelte";
    
    let errorMessages: string[] = [];
    let erroredInputs: Set<string> = new Set;

    let email = "";
    let password = "";

    let unverifiedEmail: string|null = null;

    let loadingLogin = false;
    async function logInToAccount() {
        erroredInputs = new Set;
        errorMessages = [];
        unverifiedEmail = null;
        sendUnverifiedEmailErrorMessages = [];
        sendUnverifiedEmailSuccessMessages = [];

        loadingLogin = true;
        const loginResponse = await fetch(get(accountUrl) + "/api/v2/auth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        loadingLogin = false;

        if (!loginResponse.ok) {
            try {
                const json = await loginResponse.json();
                if (json.code === "INVALID_BODY") {
                    const badEmail = json.details.find((detail: { path: string[], code: string }) => detail.path.length === 1 && detail.path[0] === "email");
                    const badPassword = json.details.find((detail: { path: string[], code: string }) => detail.path.length === 1 && detail.path[0] === "password");
                    if (badEmail) {
                        erroredInputs.add("email");
                        if (badEmail.code === "missing") {
                            errorMessages.push("You need to enter an email to login with.");
                        } else {
                            errorMessages.push("The email you entered isn't valid. Make sure you've entered it in correctly.");
                        }
                    }
                    if (badPassword) {
                        erroredInputs.add("password");
                        if (badPassword.code === "missing") {
                            errorMessages.push("You need to enter a password to secure your account, being at least 8 characters long.");
                        } else {
                            errorMessages.push("The password you entered is invalid, make sure it is at least 8 characters long.");
                        }
                    }
                    if (!badEmail && !badPassword) {
                        console.error(json);
                        throw new Error("Invalid body but no fields recognised?");
                    }
                } else if (json.code === "UNAUTHORIZED") {
                    errorMessages.push("The credentials you entered don't have an account. Make sure you've entered your password correctly."); // TODO: Reset password
                } else if (json.code === "FORBIDDEN") {
                    unverifiedEmail = email;
                    errorMessages.push("You need to verify your email address before you can use your account");
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    errorMessages.push("There was an issue in the server while logging into your account, try again later or contact support.");
                }
            } catch (e: any) {
                console.error(e);
                errorMessages.push("There was an issue while logging into your account, try again later or contact support.");
            }
            errorMessages = errorMessages;
            erroredInputs = erroredInputs;
            return;
        }

        try {
            const json = await loginResponse.json();
            if (json.success) {
                user.set(json.data);
                email = "";
                password = "";
                localStorage.setItem("user-login", JSON.stringify(json.data));
                return;
            }
            console.error(json);
        } catch (e: any) {
            console.error(e);
        }
        errorMessages.push("Could not login to your account for some reason, try again later or contact support.");
    }

    let sendUnverifiedEmailErrorMessages: string[] = [];
    let sendUnverifiedEmailSuccessMessages: string[] = [];

    let loadingVerification = false;
    async function resendVerification() {
        erroredInputs = new Set;
        sendUnverifiedEmailErrorMessages = [];
        sendUnverifiedEmailSuccessMessages = [];

        loadingVerification = true;
        const sendVerificationResponse = await fetch(get(accountUrl) + "/api/v2/accounts/resend_verification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: unverifiedEmail
            })
        });
        loadingVerification = false;

        if (!sendVerificationResponse.ok) {
            try {
                const json = await sendVerificationResponse.json();
                console.error("Failed to send verification email", json);
                if (json.code === "INVALID_BODY") {
                    erroredInputs.add("email");
                    sendUnverifiedEmailErrorMessages.push("Invalid email address used, make sure that the email you used is typed correctly.");
                } else if (json.code === "USER_NOT_FOUND") {
                    sendUnverifiedEmailErrorMessages.push("For some reason, the user to send the verification email to could not be found, please contact support.");
                } else if (json.code === "TOO_MANY_VERIFICATION_EMAILS") {
                    sendUnverifiedEmailErrorMessages.push("You must wait 2 minutes before sending another verification email. Check your spam folder if you can't find the one already sent.");
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    sendUnverifiedEmailErrorMessages.push("There was an error in the server while re-sending the verification email. Please try again later or contact support.");
                }
            } catch (e: any) {
                console.error(e);
                sendUnverifiedEmailErrorMessages.push("There was an error while re-sending the verification email. Please try again later or contact support.");
            }
            erroredInputs = erroredInputs;
            sendUnverifiedEmailErrorMessages = sendUnverifiedEmailErrorMessages;
            return;
        }

        try {
            const json = await sendVerificationResponse.json();
            if (json.success) {
                sendUnverifiedEmailSuccessMessages.push("Successfully sent verification email! Check your inbox, including your spam folder, to verify your account.");
                sendUnverifiedEmailSuccessMessages = sendUnverifiedEmailSuccessMessages;
                return;
            }
        } catch (e: any) {
            console.error(e);
        }
        sendUnverifiedEmailErrorMessages.push("There was an error while re-sending the verification email. Please try again later or contact support.");
        sendUnverifiedEmailErrorMessages = sendUnverifiedEmailErrorMessages;
    }

    let isResettingPassword = false;
    let resetPasswordId: null|string = null;
    let loadingRequestResetPassword = false;
    let requestResetPasswordErrorMessages: string[] = [];
    let requestResetPasswordSuccessMessages: string[] = [];

    let resetCode = "";
    let newPassword = "";
    let loadingResetPassword = false;
    let resetPasswordErrorMessages: string[] = [];
    let resetPasswordSuccessMessages: string[] = [];

    async function requestPasswordReset() {
        unverifiedEmail = null;
        erroredInputs = new Set;
        errorMessages = [];

        requestResetPasswordErrorMessages = [];
        requestResetPasswordSuccessMessages = [];

        resetCode = "";
        newPassword = "";

        loadingRequestResetPassword = true;
        const sendRequestResetPasswordResponse = await fetch(get(accountUrl) + "/api/v2/accounts/reset_password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email
            })
        });
        loadingRequestResetPassword = false;

        if (!sendRequestResetPasswordResponse.ok) {
            try {
                const json = await sendRequestResetPasswordResponse.json();
                console.error("Failed to send password reset request", json);
                if (json.code === "INVALID_BODY") {
                    erroredInputs.add("email");
                    requestResetPasswordErrorMessages.push("Invalid email address used, make sure that the email you used is typed correctly.");
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    requestResetPasswordErrorMessages.push("There was an error in the server while sending the password reset code. Please try again later or contact support.");
                }
            } catch (e: any) {
                console.error(e);
                requestResetPasswordErrorMessages.push("There was an error while sending the password reset code. Please try again later or contact support.");
            }
            erroredInputs = erroredInputs;
            requestResetPasswordErrorMessages = requestResetPasswordErrorMessages;
            return;
        }

        try {
            const json = await sendRequestResetPasswordResponse.json();
            if (json.success) {
                resetPasswordId = json.data.reset_id;

                requestResetPasswordSuccessMessages.push("If the email address belonged to an account, you should receive a code in your email inbox, enter it to reset your password.");
                requestResetPasswordSuccessMessages = requestResetPasswordSuccessMessages;
                return;
            }
        } catch (e: any) {
            console.error(e);
        }
        requestResetPasswordErrorMessages.push("There was an error while requesting a code to reset your password. Please try again later or contact support.");
        requestResetPasswordErrorMessages = requestResetPasswordErrorMessages;
    }

    function stopResettingPassword() {
        isResettingPassword = false;
        requestResetPasswordErrorMessages = [];
        requestResetPasswordSuccessMessages = [];
        resetPasswordId = null;
        resetCode = "";
        newPassword = "";
    }

    async function finaliseResetPassword() {
        loadingResetPassword = true;
        const sendResetPasswordResponse = await fetch(get(accountUrl) + "/api/v2/accounts/verify_reset_password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                reset_id: resetPasswordId,
                reset_code: resetCode,
                new_password: newPassword
            })
        });
        loadingResetPassword = false;

        if (!sendResetPasswordResponse.ok) {
            try {
                const json = await sendResetPasswordResponse.json();
                console.error("Failed to reset password", json);
                if (json.code === "INVALID_BODY") {
                    const badEmail = json.details.find((detail: { path: string | any[]; }) => detail.path.length === 1 && detail.path[0] === "email");
                   
                    const badResetId = json.details.find((detail: { path: string | any[]; }) => detail.path.length === 1 && detail.path[0] === "reset_id");
                    const badResetCode = json.details.find((detail: { path: string | any[]; }) => detail.path.length === 1 && detail.path[0] === "reset_code");
                    const badNewPassword = json.details.find((detail: { path: string | any[]; }) => detail.path.length === 1 && detail.path[0] === "new_password");
                    if (badResetId) {
                        resetPasswordErrorMessages.push("There was an error while submitting the password reset. Please try again later or contact support.");
                        return;
                    }
                    if (badEmail) {
                        erroredInputs.add("email");
                        if (badEmail.code === "missing") {
                            resetPasswordErrorMessages.push("You need to enter an email of the account to reset the password for.");
                        } else {
                            resetPasswordErrorMessages.push("The email you entered isn't valid. Make sure you've entered it in correctly.");
                        }
                    }
                    if (badResetCode) {
                        erroredInputs.add("reset-code");
                        resetPasswordErrorMessages.push("The code you entered to reset your password isn't valid, make sure you enter the one sent to your email inbox.");
                    }
                    if (badNewPassword) {
                        erroredInputs.add("new-password");
                        if (badNewPassword.code === "missing") {
                            resetPasswordErrorMessages.push("You need to enter a new password to secure your account, being at least 8 characters long.");
                        } else {
                            resetPasswordErrorMessages.push("The new password you entered is invalid, make sure it is at least 8 characters long.");
                        }
                    }
                }
            } catch (e: any) {
                console.error(e);
                resetPasswordErrorMessages.push("There was an error while sending the password reset. Please try again later or contact support.");
                resetPasswordErrorMessages = resetPasswordErrorMessages;
            }
            erroredInputs = erroredInputs;
            resetPasswordErrorMessages = resetPasswordErrorMessages;
            return;
        }

        stopResettingPassword();
        resetPasswordSuccessMessages = [
            "Successfully reset password! Click \"go back to login\" above to login with your new password."
        ];
        password = "";
        newPassword = "";
        resetCode = "";
    }
</script>

{#if isResettingPassword}
    <span class="text-xl font-semibold">Reset Password</span>
{:else}
    <span class="text-xl font-semibold">Login to Account</span>
{/if}
<div class="flex gap-4">
    <div class="flex flex-col gap-2 items-start">
        <div class="flex flex-col gap-1 items-end">
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("email")}
                class:grayscale={resetPasswordId !== null}
                class:pointer-events-none={resetPasswordId !== null}
            >
                <div class="p-2 bg-card-200 rounded-l-lg"><Email size={20}/></div>
                <input
                    class="border-none font-inherit text-inherit text-md outline-none rounded-r-lg bg-card-200 w-64"
                    placeholder="Email"
                    bind:value={email}
                    readonly={resetPasswordId !== null}>
            </div>
            {#if resetPasswordId !== null}
                <div
                    class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("reset-code")}
                >
                    <div class="p-2 bg-card-200 rounded-l-lg"><Ellipsis size={20}/></div>
                    <input class="border-none font-inherit text-inherit text-md outline-none rounded-r-lg bg-card-200 w-64" placeholder="Reset Code" bind:value={resetCode}>
                </div>
                <div
                    class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("new-password")}
                >
                    <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                    <input class="border-none font-inherit text-inherit text-md outline-none rounded-r-lg bg-card-200 w-64" placeholder="New Password" type="password" bind:value={newPassword}>
                </div>
                <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer"
                    class:grayscale={loadingResetPassword}
                    class:pointer-events-none={loadingResetPassword}
                    on:click={finaliseResetPassword}
                >
                    Reset Password
                </button>
            {:else}
                <div
                    class="flex border-2 border-transparent rounded-lg filter" class:border-red-500={erroredInputs.has("password")}
                    class:grayscale={isResettingPassword}
                    class:pointer-events-none={isResettingPassword}
                >
                    <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                    <input
                        class="border-none font-inherit text-inherit text-md outline-none rounded-r-lg bg-card-200 w-64"
                        placeholder="Password"
                        type="password"
                        readonly={isResettingPassword}
                        bind:value={password}>
                </div>
                {#if isResettingPassword}
                    <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer"
                        class:grayscale={loadingRequestResetPassword || resetPasswordId !== null}
                        class:pointer-events-none={loadingRequestResetPassword || resetPasswordId !== null}
                        on:click={requestPasswordReset}
                    >
                        Request Password Reset
                    </button>
                {:else}
                    <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer"
                        class:grayscale={loadingLogin}
                        class:pointer-events-none={loadingLogin}
                        on:click={logInToAccount}
                    >
                        Login
                    </button>
                {/if}
            {/if}
        </div>
    </div>
    <div class="w-0.25 self-stretch bg-white/25"></div>
    <div class="flex flex-col gap-0.5 text-xs italic">
        <ul class="text-[#806593] max-w-84 px-4 list-disc">
            {#if isResettingPassword}
                <li class="my-0.5">Request a code to reset your password belonging to an email</li>
                <li class="my-0.5">If you don't want to reset your password, click "go back to login" below</li>
                <li class="my-0.5">
                    <button class="text-[#eed7ff] text-left hover:text-[#cfb1e6]" on:click={stopResettingPassword}>
                        Go back to login
                    </button>
                </li>
            {:else}
                <li class="my-0.5">Log-in to an existing PGG: Rewritten account</li>
                <li class="my-0.5">If you don't have an account, use the form below</li>
                <li class="my-0.5">You'll need to log-in before you can play</li>
                <li class="my-0.5">
                    <button class="text-[#eed7ff] text-left hover:text-[#cfb1e6]" on:click={() => isResettingPassword = true}>
                        Click here if you have forgotten your password
                    </button>
                </li>
            {/if}
        </ul>
        <ErrorNotes successMessages={resetPasswordSuccessMessages} {errorMessages}/>
        {#if isResettingPassword}
            <ErrorNotes successMessages={requestResetPasswordSuccessMessages} errorMessages={requestResetPasswordErrorMessages}/>
            <ErrorNotes successMessages={[]} errorMessages={resetPasswordErrorMessages}/>
        {/if}
        {#if unverifiedEmail}
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:grayscale={loadingVerification}
                class:pointer-events-none={loadingVerification}
                on:click={resendVerification}
            >
                Resend Verification
            </button>
            <ErrorNotes successMessages={sendUnverifiedEmailSuccessMessages} errorMessages={sendUnverifiedEmailErrorMessages}/>
        {/if}
    </div>
</div>