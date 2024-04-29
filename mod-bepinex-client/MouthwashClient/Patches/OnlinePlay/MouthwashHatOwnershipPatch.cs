using HarmonyLib;
using MouthwashClient.Services;
using Reactor.Utilities;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(PlayerPurchasesData), nameof(PlayerPurchasesData.GetPurchase))]
    public static class MouthwashHatOwnershipPatch
    {
        public static bool Prefix(PlayerPurchasesData __instance, ref bool __result,
            [HarmonyArgument(0)] string itemKey, [HarmonyArgument(1)] string bundleKey)
        {
            if (CosmeticOwnershipService.OwnedItemIds.Contains(itemKey))
            {
                __result = true;
                return false;
            }
            
            return true;
        }
    }
}