using HarmonyLib;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.OnEnable))]
    public static class ChatCrashDumbFixPatch
    {
        public static void Postfix(PlayerControl __instance)
        {
            if (DestroyableSingleton<HudManager>.Instance != null && DestroyableSingleton<HudManager>.Instance.Chat != null)
            {
                DestroyableSingleton<HudManager>.Instance.Chat.chatScreen.SetActive(true);
                DestroyableSingleton<HudManager>.Instance.Chat.chatScreen.SetActive(false);
            }
        }
    }
}