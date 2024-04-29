using HarmonyLib;
using Hazel;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;
using Reactor.Utilities.Extensions;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    public static class PlayerOutlinePatches
    {
        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.HandleRpc))]
        public static class PlayerSetOutlineMessageHandlePatch
        {
            public static bool Prefix(PlayerControl __instance,
                [HarmonyArgument(0)] byte callId, [HarmonyArgument(1)] MessageReader reader)
            {
                switch (callId)
                {
                    case (byte)MouthwashRpcPacketTag.SetOutline:
                        byte enabled = reader.ReadByte();
                        Color color = MouthwashChatMessageAppearance.ReadColor(reader);
                        __instance.cosmetics.normalBodySprite.BodySprite.SetOutline(enabled == 1 ? color : null);
                        break;
                }

                return true;
            }
        }
    
        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.ToggleHighlight))]
        public static class RemovePlayerHighlightOutlinesPatch
        {
            public static bool Prefix(PlayerControl __instance)
            {
                return false;
            }
        }
    }
}