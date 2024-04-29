using HarmonyLib;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(FriendsListButton), nameof(FriendsListButton.Update))]
    public static class HideFriendsPatch
    {
        public static bool Prefix(FriendsListButton __instance)
        {
            __instance.Button.SetActive(false);
            return false;
        }
    }
}