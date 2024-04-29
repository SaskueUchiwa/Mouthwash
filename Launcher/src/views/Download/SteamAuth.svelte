<script lang="ts">
    import Key from "../../icons/Key.svelte";

    function noOpWrite(str: string) { }

    let authCode = "";
    let isVisible = false;
    let lastInputInvalid = false;
    let writeCodeToProcess: (str: string) => void = noOpWrite;
    export function open(wasLastInputInvalid: boolean, writeFunction: (str: string) => void) {
        isVisible = true;
        lastInputInvalid = wasLastInputInvalid;
        writeCodeToProcess = writeFunction;
    }

    export function close() {
        isVisible = false;
    }

    function submit() {
        writeCodeToProcess(authCode);
        close();
    }
</script>

<div class="left-0 top-0 w-full h-full items-center justify-center bg-[#000000b5]" class:flex={isVisible} class:hidden={!isVisible} class:fixed={isVisible}>
    <div class="bg-surface-200 w-1/4 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col h-full gap-2">
            <div class="flex items-center gap-2">
                <Key size={20}/>
                <span class="text-lg">Steam Authentication</span>
            </div>
            {#if lastInputInvalid}
                <p class="text-text-300 italic text-xs">
                    The last code you entered was incorrect, try enter the code again. Check your e-mail spam folder
                    if you can't find the code. This pop-up will close automatically if you log in without requiring a
                    code.
                </p>
            {:else}
                <p class="text-text-300 italic text-xs">
                    If your Steam account has 2FA (2-Factor Authentication), then you may need to enter a code that you receive
                    either by e-mail or on your Steam mobile app. This pop-up will close automatically if you log in
                    without requiring a code.
                </p>
            {/if}
            <div class="flex border-2 border-transparent rounded-lg">
                <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                <input class="text-md outline-none rounded-r-lg bg-card-200 w-64" placeholder="Auth Code" bind:value={authCode}>
            </div>
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter"
                on:click={submit}
            >
                Submit
            </button>
        </div>
    </div>
</div>