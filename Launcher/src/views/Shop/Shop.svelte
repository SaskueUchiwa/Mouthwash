<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { writable } from "svelte/store";
    import { type Bundle, loading, unavailable, accountUrl, user } from "../../stores/accounts";
    import Marketplace from "./Marketplace.svelte";
    import PurchaseForm from "./PurchaseForm.svelte";
    import Storefront from "./Storefront.svelte";
    import PreviewBuyableBundlePopup from "./PreviewBuyableBundlePopup.svelte";

    let error = "";
    let ownedBundles = writable<Bundle[]|typeof loading|typeof unavailable>(loading);

    let selectedValuationIdxs = [];
    let searchTerm = "";
    let featureTag: string|undefined = undefined;
    
    async function getUserCosmetics() {
        if ($user === loading || $user === unavailable) {
            ownedBundles.set([]);
            return;
        }

        ownedBundles.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/owned_bundles", {
            headers: {
                Authorization: `Bearer ${$user.client_token}`
            }
        });

        if (!userCosmeticsRes.ok) {
            error = "Could not get user cosmetics.";
            ownedBundles.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        ownedBundles.set(json.data);
    }

    let hasLoadedCosmetics = false;
    $: if ($user === loading || $user === unavailable || !hasLoadedCosmetics) {
        getUserCosmetics();
        hasLoadedCosmetics = true;
    }

    const allFeatureTags: Record<string, string> = {
        FEATURED: "Featured",
        NEW_RELEASE: "New Release",
        CLASSIC: "Classic",
        POPULAR: "Popular",
        PGG_REWRITTEN: "PGG: Rewritten",
        AMONG_US: "Among Us",
        SEASONAL: "Seasonal",
        PROMOTIONAL: "Promotional"
    };

    let page: ""|"Marketplace" = "";
    let purchasingBundle: Bundle|undefined = undefined;
    let clientSecret: string|undefined = undefined;
    let checkoutSessionId: string|undefined = undefined;
    
    let previewingBundle: Bundle|undefined = undefined;

    function onOpenPurchaseForm(ev: CustomEvent<{ bundle: Bundle; clientSecret: string; checkoutSessionId: string; }>) {
        purchasingBundle = ev.detail.bundle;
        clientSecret = ev.detail.clientSecret;
        checkoutSessionId = ev.detail.checkoutSessionId;
    }

    function onPreviewBundle(ev: CustomEvent<{ bundle: Bundle }>) {
        previewingBundle = ev.detail.bundle;
    }

    function refreshBundles() {
        getUserCosmetics();
        dispatchEvent("refresh-cosmetics");
    }
</script>

<div class="flex gap-4 self-stretch h-full">
        <div class="w-full flex flex-col bg-base-200 rounded-xl gap-4 p-4">
        {#if page === ""}
            <Storefront ownedCosmetics={ownedBundles} {allFeatureTags} bind:searchTerm bind:page bind:featureTag/>
        {:else}
            <Marketplace
                {featureTag}
                {allFeatureTags}
                ownedBundles={Array.isArray($ownedBundles) ? $ownedBundles : undefined}
                bind:page
                bind:selectedValuationIdxs
                bind:searchTerm
                on:open-purchase-form={onOpenPurchaseForm}
                on:preview-bundle={onPreviewBundle}/>
        {/if}
    </div>
</div>
{#if purchasingBundle !== undefined && clientSecret !== undefined && checkoutSessionId !== undefined && $user !== loading && $user !== unavailable}
    <PurchaseForm
        {clientSecret}
        {purchasingBundle}
        {checkoutSessionId}
        user={$user}
        on:close={() => (clientSecret = undefined, purchasingBundle = undefined, checkoutSessionId = undefined)}
        on:refresh={refreshBundles}
        on:open-bundle
        on:switch-view
        />
{/if}
{#if previewingBundle !== undefined}
    <PreviewBuyableBundlePopup
        bundle={previewingBundle}
        playerColor={$user === loading || $user === unavailable ? amongus.Color.Red : $user.cosmetic_color}
        playerHat={$user === loading || $user === unavailable ? amongus.Hat.NoHat : $user.cosmetic_hat}
        playerSkin={$user === loading || $user === unavailable ? amongus.Skin.None : $user.cosmetic_skin}
        playerVisor={$user === loading || $user === unavailable ? amongus.Visor.EmptyVisor : $user.cosmetic_visor}
        preloadBundles={$user === loading || $user === unavailable ? [] : $user.bundle_previews}
        on:close={() => previewingBundle = undefined}/>
{/if}