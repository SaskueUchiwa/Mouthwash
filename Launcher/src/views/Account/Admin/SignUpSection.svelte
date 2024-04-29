<script lang="ts">
    import { get } from "svelte/store";
    import Email from "../../../icons/Email.svelte";
    import Key from "../../../icons/Key.svelte";
    import Tag from "../../../icons/Tag.svelte";
    import { accountUrl } from "../../../stores/accounts";
    import ErrorNotes from "./ErrorNotes.svelte";

    let displayName = "";
    let email = "";
    let confirmEmail = "";
    let password = "";
    let confirmPassword = "";

    let errorMessages: string[] = [];
    let successMessages: string[] = [];
    let erroredInputs: Set<string> = new Set;

    $: displayName = displayName.replace(/^[^a-zA-Z0-9_\-]$/g, "").substring(0, 32);

    let loadingSignup = false;
    async function signUpAccount() {
        erroredInputs = new Set;
        errorMessages = [];
        successMessages = [];

        if (confirmEmail !== email) {
            errorMessages.push("You must have entered your email address incorrectly. Make sure you confirm the email address that you want to use.");
            erroredInputs.add("confirm-email");
            erroredInputs = erroredInputs;
            errorMessages = errorMessages;
            return;
        }

        if (confirmPassword !== password) {
            errorMessages.push("You must have entered your password incorrectly. Make sure you confirm the password that you want to use.");
            erroredInputs.add("confirm-password");
            erroredInputs = erroredInputs;
            errorMessages = errorMessages;
            return;
        }

        loadingSignup = true;
        const signUpResponse = await fetch(get(accountUrl) + "/api/v2/accounts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password,
                display_name: displayName
            })
        });
        loadingSignup = false;

        if (!signUpResponse.ok) {
            try {
                const json = await signUpResponse.json();
                if (json.code === "INVALID_BODY") {
                    const badEmail = json.details.find(detail => detail.path.length === 1 && detail.path[0] === "email");
                    const badPassword = json.details.find(detail => detail.path.length === 1 && detail.path[0] === "password");
                    const badDisplayName = json.details.find(detail => detail.path.length === 1 && detail.path[0] === "display_name");
                    if (badDisplayName) {
                        erroredInputs.add("display-name");
                        errorMessages.push("Invalid display name. It must be at least 3 characters long and no more than 24, containing only alphabet letters, numbers, underscores ('_') and hyphens ('-').")
                    }
                    if (badEmail) {
                        erroredInputs.add("email");
                        if (badEmail.code === "missing") {
                            errorMessages.push("You need to enter an email to verify your account.");
                        } else {
                            errorMessages.push("The email you entered isn't valid. Make sure you've entered it in correctly.");
                        }
                    }
                    if (badPassword) {
                        erroredInputs.add("password");
                        if (badPassword.code === "bound") {
                            if (badPassword.source.comparator === ">=") {
                                errorMessages.push(`Your password needs to be at least ${badPassword.source.limit} ${badPassword.source.units} long.`);
                            } else if (badPassword.source.comparator === "<=") {
                                errorMessages.push(`Your password needs to be no more than ${badPassword.source.limit} ${badPassword.source.units} long.`);
                            }
                        } else if (badPassword.code === "missing") {
                            errorMessages.push("You need to enter a password to secure your account, being at least 8 characters long.");
                        } else {
                            errorMessages.push("The password you entered is invalid.");
                        }
                    }
                    if (!badPassword && !badEmail && !badDisplayName) {
                        console.error(json);
                        throw new Error("Invalid body but no fields recognised?");
                    }
                } else if (json.code === "EMAIL_ALREADY_IN_USE") {
                    errorMessages.push("That email address has already been used for an account, try another account.");
                    erroredInputs.add("email");
                } else if (json.code === "DISPLAY_NAME_ALREADY_IN_USE") {
                    errorMessages.push("That display name has already been used for an account, try another name.");
                    erroredInputs.add("display-name");
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    errorMessages.push("There was an issue in the server while creating an account, try again later or contact support.");
                }
            } catch (e: any) {
                console.error(e);
                errorMessages.push("There was an issue while creating an account, try again later or contact support.");
            }
            erroredInputs = erroredInputs;
            errorMessages = errorMessages;
            return;
        }

        try {
            const json = await signUpResponse.json();
            if (json.success) {
                if (json.data.verify_email) {
                    successMessages.push("Created account! Check your e-mails to verify your account. Log-in above when you're done.");
                } else {
                    successMessages.push("Created account! Log-in above to start playing.");
                }
                successMessages = successMessages;
                displayName = "";
                email = "";
                confirmEmail = "";
                password = "";
                confirmPassword = "";
                return;
            }
        } catch (e: any) {
            console.error(e);
        }
        errorMessages.push("Account was not created for some reason, try again later or contact support.");
    }
</script>

<span class="text-xl font-semibold">Create Account</span>
<div class="flex gap-4">
    <div class="flex flex-col gap-2 items-start">
        <div class="flex flex-col gap-1 items-end">
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("display-name")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Tag size={20}/></div>
                <input class="text-md border-none font-inherit text-inherit outline-none rounded-r-lg bg-card-200 w-64" placeholder="Display Name" bind:value={displayName}>
            </div>
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("email")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Email size={20}/></div>
                <input class="text-md border-none font-inherit text-inherit outline-none rounded-r-lg bg-card-200 w-64" placeholder="Email" bind:value={email}>
            </div>
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("confirm-email")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Email size={20}/></div>
                <input class="text-md border-none font-inherit text-inherit outline-none rounded-r-lg bg-card-200 w-64" placeholder="Confirm Email" bind:value={confirmEmail}>
            </div>
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("password")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                <input class="text-md border-none font-inherit text-inherit outline-none rounded-r-lg bg-card-200 w-64" placeholder="Password" type="password" bind:value={password}>
            </div>
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("confirm-password")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                <input class="text-md border-none font-inherit text-inherit outline-none rounded-r-lg bg-card-200 w-64" placeholder="Confirm Password" type="password" bind:value={confirmPassword}>
            </div>
            <button
                class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:grayscale={loadingSignup}
                class:pointer-events-none={loadingSignup}
                on:click={signUpAccount}
            >
                Sign-up
            </button>
        </div>
    </div>
    <div class="w-0.25 self-stretch bg-white/25"></div>
    <div class="flex flex-col gap-2 text-xs italic">
        <ul class="text-text-300 max-w-84 px-4 list-disc">
            <li class="my-0.5">Create a new PGG: Rewritten account</li>
            <li class="my-0.5">Keep track your bought cosmetic bundles and game statistics</li>
            <li class="my-0.5">You'll need an account to start playing</li>
            <li class="my-0.5">Your email address will have to be verified before you can log-in</li>
            <li class="my-0.5">Make sure you to check your email inbox's spam folder if you can't find the verification emails</li>
        </ul>
        <ErrorNotes {successMessages} {errorMessages}/>
    </div>
</div>