using HarmonyLib;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(StatsManager), nameof(StatsManager.BanMinutesLeft), MethodType.Getter)]
    public class RemoteIntentionalLeavingBanPatch
    {
        public static bool Prefix(StatsManager __instance, ref int __result)
        {
            __result = 0;
            return false;
        }
    }
}