<script lang="ts" context="module">
    declare let Stripe: any;
</script>

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { onMount } from "svelte";
    import { accountUrl, type Bundle, type UserLogin } from "../../stores/accounts";
    import FeaturedBundleThumbnail from "./FeaturedBundleThumbnail.svelte";
    import Loader from "../../icons/Loader.svelte";
    import Check from "../../icons/Check.svelte";
    import Cross from "../../icons/Cross.svelte";

    export let purchasingBundle: Bundle;
    export let clientSecret: string;
    export let checkoutSessionId: string;
    export let user: UserLogin;

    let cardElementPlaceholder: HTMLDivElement|undefined = undefined;
    let stripeReady = false;
    let readyToPurchase = false;

    function stripeLoaded() {
        stripeReady = true;
        loadCardElements();
    }

    let stripe: any = undefined;
    let elements: any = undefined;
    function loadCardElements() {
        readyToPurchase = false;
        if (!stripeReady || cardElementPlaceholder === undefined)
            return;

        stripe = Stripe("pk_test_51NnfCSCihgHKsR3XEoN69LxsjeoqtiKL3yA79BuipR7pGQNJf23lUnZUO7DopJANyf5oA2b1Gh7t5YrheSTkCScT00qdMJSbTT");
        elements = stripe.elements({
            clientSecret: clientSecret,
            appearance: {
                theme: "flat",
                variables: {
                    colorBackground: "#27063e",
                    colorText: "#eed7ff",
                    fontFamily: "Josefin Sans, sans-serif"
                }
            }
        });

        const cardElement = elements.create("payment", {
            hidePostalCode: true,
            disableLink: true
        });
        cardElement.mount(cardElementPlaceholder);

        cardElement.on("change", function(event) {
            readyToPurchase = event.complete;
        });
    }

    onMount(() => {
        loadCardElements();
    });

    let error = "";
    let loadingPurchase = false;
    async function submitCardDetails() {
        if (elements === undefined || stripe === undefined) {
            readyToPurchase = false;
            return;
        }

        error = "";
        loadingPurchase = true;
        await elements.submit();
        const result = await stripe.confirmPayment({
            elements,
            clientSecret,
            redirect: "if_required"
        });

        if (result.error) {
            error = "There was an error processing your payment. Ensure that you have the funds available in your account. Otherwise, try again later or contact support. You have not been charged.";
            loadingPurchase = false;
        } else if (result.paymentIntent.status === "succeeded") {
            const bundleCheckoutComplete = await fetch($accountUrl + "/api/v2/accounts/checkout_bundle/complete", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${user.client_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    checkout_session_id: checkoutSessionId
                })
            });
            loadingPurchase = false;

            if (!bundleCheckoutComplete.ok) {
                error = "There was an error purchasing the bundle. If you have been charged, contact support to receive your purchased bundles.";
                loadingPurchase = false;
                return;
            }

            dispatchEvent("open-bundle", purchasingBundle.id);
            dispatchEvent("switch-view", { view: "Account" });
            dispatchEvent("refresh");
            dispatchEvent("close");
        } else {
            loadingPurchase = false;
            dispatchEvent("close"); 
        }
    }

    let loadingCancel = false;
    async function cancelCheckout() {
        loadingCancel = true;
        const bundleCheckoutCancel = await fetch($accountUrl + "/api/v2/accounts/checkout_bundle/cancel", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${user.client_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                checkout_session_id: checkoutSessionId
            })
        });
        loadingCancel = false;

        if (!bundleCheckoutCancel.ok) {
            return;
        }

        dispatchEvent("refresh");
        dispatchEvent("close");
    }
    
    $: cardElementPlaceholder, loadCardElements();
</script>

<svelte:head>
    <script src="https://js.stripe.com/v3/" on:load={stripeLoaded}></script>
</svelte:head>

<div class="fixed left-0 top-0 w-full h-full flex items-center justify-center bg-[#000000b5] z-10">
    <div class="bg-surface-200 w-1/4 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col h-full gap-4">
            <div class="flex flex-col gap-2">
                <span class="text-xl">Purchase Bundle</span>
            </div>
            <div class="flex border-b-2 border-dotted border-card-200 gap-1 px-2 pb-4">
                <FeaturedBundleThumbnail bundleInfo={purchasingBundle} showDetails={false} ownedItems={[]} size={96}/>
                <div class="flex flex-col p-2">
                    <pre class="text-xs">Item: {purchasingBundle.name} (Bundle)</pre>
                    <!--<p class="text-text-300 italic text-xs">{purchasingBundle.bundle_description}</p>-->
                    <pre class="text-xs">Subtotal: ${(purchasingBundle.price_usd / 100).toFixed(2)}</pre>
                    <pre class="text-xs text-text-300">Tax: VAT included</pre>
                    <pre class="text-xs mt-2">Total: ${(purchasingBundle.price_usd / 100).toFixed(2)}</pre>
                </div>
            </div>
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-2">
                    <span class="text-xl">Payment Information</span>
                    <div bind:this={cardElementPlaceholder}>
                        <Loader size={24}/>
                    </div>
                </div>
                <div class="flex self-end gap-2">
                    <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer flex items-center gap-2"
                        class:grayscale={loadingPurchase || loadingCancel}
                        class:pointer-events-none={loadingPurchase || loadingCancel}
                        on:click={cancelCheckout}
                    >
                        <Cross size={16}/>
                        Cancel
                    </button>
                    <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer flex items-center gap-2"
                        class:grayscale={loadingPurchase || loadingCancel || !readyToPurchase}
                        class:pointer-events-none={loadingPurchase || loadingCancel || !readyToPurchase}
                        on:click={submitCardDetails}
                    >
                        <Check size={16}/>
                        Purchase {purchasingBundle.name} for ${(purchasingBundle.price_usd / 100).toFixed(2)}
                    </button>
                </div>
                {#if error}
                    <p class="text-yellow-500 italic text-xs">{error}</p>
                {/if}
            </div>
        </div>
    </div>
</div>