<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as amongus from "@skeldjs/constant";
    import { get } from "svelte/store";
    import ArrowLeftRect from "../../icons/ArrowLeftRect.svelte";
    import ArrowRight from "../../icons/ArrowRight.svelte";
    import Link from "../../icons/Link.svelte";
    import { accountUrl, loading, unavailable, user, type UserLogin } from "../../stores/accounts";
    import Swatch from "../../icons/Swatch.svelte";
    import type { LoadedCosmeticImages } from "../../lib/previewTypes";
    import CharacterOutfitPreview from "../Preview/CharacterOutfitPreview.svelte";
    import { getPreviewAssetsByUrl } from "../../lib/previewAssets";

    export let page: ""|"games";

    let hatCosmetic: LoadedCosmeticImages|undefined = undefined;
    let skinCosmetic: LoadedCosmeticImages|undefined = undefined;
    let visorCosmetic: LoadedCosmeticImages|undefined = undefined;

    export async function wearItem(cosmeticItem: LoadedCosmeticImages) {
        if (cosmeticItem.asset.type === "HAT") {
            hatCosmetic = cosmeticItem;
            user.update(u => ({ ...(u as UserLogin), cosmetic_hat: cosmeticItem.asset.product_id }));
        } else if (cosmeticItem.asset.type === "SKIN") {
            skinCosmetic = cosmeticItem;
            user.update(u => ({ ...(u as UserLogin), cosmetic_skin: cosmeticItem.asset.product_id }));
        } else if (cosmeticItem.asset.type === "VISOR") {
            visorCosmetic = cosmeticItem;
            user.update(u => ({ ...(u as UserLogin), cosmetic_visor: cosmeticItem.asset.product_id }));
        }
        dispatchEvent("update-cosmetics");
    }

    let isPreviewLoading = true;
    let hasLoadedPreview = false;
    $: $user, (async () => {
        if (hasLoadedPreview || $user === loading || $user === unavailable)
            return;

        isPreviewLoading = true;
        const allAssets = (await Promise.all($user.bundle_previews.map(x => getPreviewAssetsByUrl(x.id, x.url, x.hash, true, false, null)))).flat();
        allAssets.push(...await getPreviewAssetsByUrl("00000000-0000-0000-0000-000000000000", "/CosmeticOfficial.zip", "", false, true, null));
        hatCosmetic = $user.cosmetic_hat === amongus.Hat.NoHat ? undefined : allAssets.find(x => x.asset.product_id === ($user as UserLogin).cosmetic_hat);
        skinCosmetic = $user.cosmetic_skin === amongus.Skin.None ? undefined : allAssets.find(x => x.asset.product_id === ($user as UserLogin).cosmetic_skin);
        visorCosmetic = $user.cosmetic_visor === amongus.Visor.EmptyVisor ? undefined : allAssets.find(x => x.asset.product_id === ($user as UserLogin).cosmetic_visor);
        isPreviewLoading = false;
        hasLoadedPreview = true;
    })();

    async function logoutAccount() {
        if ($user === loading || $user === unavailable)
            return;

        const logoutResponse = await fetch(get(accountUrl) + "/api/v2/auth/logout", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${$user.client_token}`
            }
        });

        dispatchEvent("logout");

        if (!logoutResponse.ok) {
            try {
                const json = await logoutResponse.json();
                console.log("Failed to logout", json);
            } catch (e: any) {
                console.log("Failed to logout", logoutResponse.status, e);
            }
            return;
        }
    }

    const joinDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
</script>

{#if $user !== loading && $user !== unavailable}
    <div class="flex-1 flex flex-col items-center gap-4">
        <div class="flex flex-col items-center gap-2">
            <CharacterOutfitPreview {hatCosmetic} {skinCosmetic} {visorCosmetic} playerColor={$user.cosmetic_color} loading={isPreviewLoading}/>
            <span class="text-stroke-black text-white text-xl">{$user.display_name}</span>
        </div>
        <span class="text-text-300 italic">Joined on {joinDateFormat.format(new Date($user.created_at))}</span>
        <div class="flex-1 flex flex-col items-stretch w-full gap-2">
            <button
                class="rounded-3xl bg-card-300 text-text-200 py-1 flex items-center justify-center gap-2 transition-colors duration-100 filter hover:bg-card-300 hover:text-text-300"
                class:pointer-events-none={page === ""}
                class:grayscale={page === ""}
                on:click={() => dispatchEvent("set-page", "")}
            >
                <span class="italic">Cosmetics</span>
                <Swatch size={16}/>
            </button>
            <button
                class="rounded-3xl bg-card-300 text-text-200 py-1 flex items-center justify-center gap-2 transition-colors duration-100 filter hover:bg-card-300 hover:text-text-300"
                class:pointer-events-none={page === "games"}
                class:grayscale={page === "games"}
                on:click={() => dispatchEvent("set-page", "games")}
            >
                <span class="italic">Recent Games</span>
                <ArrowRight size={16}/>
            </button>
            <div class="mt-auto order-2 flex flex-col items-stretch w-full gap-2">
                <button class="rounded-3xl border-2 border-surface-100 text-text-300 py-1 flex items-center justify-center gap-2 transition-colors duration-100 hover:border-card-300 hover:text-text-200">
                    <span class="italic">Copy Link to Profile</span>
                    <Link size={16}/>
                </button>
                <button
                    class="rounded-3xl bg-transparent border-2 border-rose-800 text-rose-400 py-1 flex items-center justify-center
                        gap-2 transition-colors hover:bg-rose-800/25 hover:text-rose-500"
                    on:click={logoutAccount}
                >
                    <span class="italic">Logout</span>
                    <ArrowLeftRect size={16}/>
                </button>
            </div>
        </div>
    </div>
{/if}