<script lang="ts">
    import Check from "../../icons/Check.svelte";
    import { AuthenticatedEpicGamesAUInstaller } from "../../lib/AuthenticatedEpicGamesAUInstaller";

    let useLauncherLogin = false;

    function toggle() {
        useLauncherLogin = !useLauncherLogin;
    }

    export async function validate() {
        return true;
    }

    export function getInstaller() {
        return new AuthenticatedEpicGamesAUInstaller(useLauncherLogin);
    }
</script>

<p class="text-text-300 italic text-xs">
    You'll be asked to login through the Epic Games website to verify your identity.
    <br><br>
    If you want, you can let PGG: Rewritten use your local launcher login to download the game.
    This will log you out of your launcher, but it means you won't have to enter your Epic Games
    credentials.
</p>
<div class="flex items-center gap-4">
    <label for="use-local-login">Use Launcher Login?</label>
    <button class="flex items-center justify-center rounded-lg bg-card-200 p-1 hover:bg-card-300 hover:text-text-300 filter border-none cursor-pointer" on:click={toggle}>
        <div class="opacity-0 transition-opacity duration-75" class:opacity-100={useLauncherLogin}>
            <Check size={20}/>
        </div>
    </button>
</div>