using AmongUs.Data.Settings;
using AmongUs.GameOptions;
using HarmonyLib;
using InnerNet;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(MultiplayerSettingsData), nameof(MultiplayerSettingsData.ChatMode), MethodType.Getter)]
    public static class AllowFreeChatPatch
    {
        public static bool Prefix(MultiplayerSettingsData __instance, ref QuickChatModes __result)
        {
            __result = QuickChatModes.FreeChatOrQuickChat;
            return false;
        }
    }
}