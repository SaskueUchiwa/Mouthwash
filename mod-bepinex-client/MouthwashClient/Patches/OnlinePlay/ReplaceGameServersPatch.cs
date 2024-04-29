using System.Linq;
using HarmonyLib;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using ImaginationOverflow.UniversalDeepLinking;
using Reactor.Utilities;
using Reactor.Utilities.Extensions;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(ServerManager), nameof(ServerManager.LoadServers))]
    public static class ReplaceGameServersPatch
    {
        public static bool Prefix(ServerManager __instance)
        {
            __instance.AvailableRegions = new Il2CppReferenceArray<IRegionInfo>(
                PluginSingleton<MouthwashClientPlugin>.Instance.runtimeConfig.ServerRegions.Select(x =>
                {
                    return new DnsRegionInfo(x.Domain, x.Name, StringNames.NoTranslation, x.Ip, x.Port, false)
                        .TryCast<IRegionInfo>()!;
                }).ToArray());
            __instance.CurrentRegion = __instance.AvailableRegions[0];
            __instance.CurrentUdpServer = __instance.CurrentRegion.Servers.Random();
            __instance.state = UpdateState.Success;
            return false;
        }
    }

    [HarmonyPatch(typeof(ServerManager), nameof(ServerManager.SaveServers))]
    public static class PreventPermanentServersSavingPatch
    {
        public static bool Prefix(ServerManager __instance)
        {
            return false;
        }
    }

    [HarmonyPatch(typeof(DeeplinkHandler), nameof(DeeplinkHandler.Instance_LinkActivated))]
    public static class RemoveDeepLinkPatch
    {
        public static bool Prefix(DeeplinkHandler __instance)
        {
            return false;
        }
    }
}