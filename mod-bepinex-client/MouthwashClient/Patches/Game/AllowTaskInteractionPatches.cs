using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;

namespace MouthwashClient.Patches.Game
{
    public static class AllowTaskInteractionPatches
    {
        public static bool IsTaskInteractionAllowed;
        public static bool IsTaskInteractionAllowedForced;
        
        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class SetHudVisibilityMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (byte)MouthwashRootPacketTag.AllowTaskInteraction:
                        IsTaskInteractionAllowed = reader.ReadBoolean();
                        IsTaskInteractionAllowedForced = reader.ReadBoolean();
                        return false;
                }
                return true;
            }
        }
        
        [HarmonyPatch(typeof(LobbyBehaviour), nameof(LobbyBehaviour.Start))]
        public static class PlayerResetAnimationsPatch
        {
            public static void Postfix(LobbyBehaviour __instance)
            {
                IsTaskInteractionAllowed = true;
                IsTaskInteractionAllowedForced = false;
            }
        }
    }
}