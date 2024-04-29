using HarmonyLib;
using MouthwashClient.Services;

namespace MouthwashClient.Patches.Lobby
{
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.CmdCheckName))]
    public static class CheckNamePatch
    {
        public static bool Prefix(PlayerControl __instance, [HarmonyArgument(0)] ref string name)
        {
            name = LoginService.GetLoginInformation().DisplayName;
            return true;
        }
    }
}