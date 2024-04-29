using System.Collections;
using System.Collections.Generic;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using UnityEngine;
using IEnumerator = Il2CppSystem.Collections.IEnumerator;

namespace MouthwashClient.Patches.Game
{
    public static class HudStringsPatches
    {
        public static Dictionary<HudLocation, string> HudStrings = new();

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class SetHudVisibilityMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (byte)MouthwashRootPacketTag.SetHudString:
                        string text = reader.ReadString();
                        HudLocation hudLocation = (HudLocation)reader.ReadByte();
                        if (text == "__unset")
                        {
                            HudStrings.Remove(hudLocation);
                        }
                        else
                        {
                            HudStrings[hudLocation] = text;
                        }
                        
                        if (hudLocation == HudLocation.RoomTracker)
                        {
                            if (text == "__unset")
                            {
                                Vector3 tempPos = DestroyableSingleton<HudManager>.Instance.roomTracker.text.transform.localPosition;
                                Color tempColor = Color.white;
                                tempPos.y = DestroyableSingleton<HudManager>.Instance.roomTracker.TargetY;
                                tempColor.a = 1f;
                                DestroyableSingleton<HudManager>.Instance.roomTracker.text.transform.localPosition = tempPos;
                                DestroyableSingleton<HudManager>.Instance.roomTracker.text.color = tempColor;
                            }
                            else
                            {
                                Vector3 tempPos = DestroyableSingleton<HudManager>.Instance.roomTracker.text.transform.localPosition;
                                Color tempColor = Color.white;
                                DestroyableSingleton<HudManager>.Instance.roomTracker.text.text = text;
                                tempPos.y = DestroyableSingleton<HudManager>.Instance.roomTracker.SourceY;
                                tempColor.a = 1f;
                                DestroyableSingleton<HudManager>.Instance.roomTracker.text.transform.localPosition = tempPos;
                                DestroyableSingleton<HudManager>.Instance.roomTracker.text.color = tempColor;
                            }
                        }
                        else if (hudLocation == HudLocation.TaskText)
                        {
                            DestroyableSingleton<HudManager>.Instance.taskDirtyTimer = 999f; // immediately refresh task list text (see HudManager.Update)
                        }
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
                HudStrings.Clear();
            }
        }

        [HarmonyPatch(typeof(GameStartManager), nameof(GameStartManager.Update))]
        public static class PlayerCounterTextPatch
        {
            public static void Postfix(GameStartManager __instance)
            {
                if (HudStrings.TryGetValue(HudLocation.GamePlayerCount, out string? playerCountText))
                {
                    __instance.PlayerCounter.text = playerCountText;
                }
            }
        }

        [HarmonyPatch(typeof(GameStartManager), nameof(GameStartManager.UpdateStreamerModeUI))]
        public static class GameCodeTextPatch
        {
            public static void Postfix(GameStartManager __instance)
            {
                if (HudStrings.TryGetValue(HudLocation.GameCode, out string? gameCodeText))
                {
                    __instance.GameRoomNameCode.text = gameCodeText;
                }
            }
        }

        [HarmonyPatch(typeof(RoomTracker), nameof(RoomTracker.FixedUpdate))]
        public static class RoomTrackerDisableRoutinePatch
        {
            public static bool Prefix(RoomTracker __instance)
            {
                if (HudStrings.TryGetValue(HudLocation.RoomTracker, out string? roomTrackerText))
                {
                    __instance.text.text = roomTrackerText;
                    return false;
                }

                return true;
            }
        }
        
        [HarmonyPatch(typeof(RoomTracker._CoSlideIn_d__11), nameof(RoomTracker._CoSlideIn_d__11.MoveNext))]
        public static class RoomTrackerTextPatch
        {
            public static void Postfix(RoomTracker._CoSlideIn_d__11 __instance)
            {
                if (HudStrings.TryGetValue(HudLocation.RoomTracker, out string? roomTrackerText))
                {
                    __instance.__4__this.text.text = roomTrackerText;
                }
            }
        }
        
        [HarmonyPatch(typeof(PingTracker), nameof(PingTracker.Update))]
        public static class PingTrackerTextPatch
        {
            public static bool Prefix(RoomTracker __instance)
            {
                if (HudStrings.TryGetValue(HudLocation.PingTracker, out string? pingTrackerText))
                {
                    __instance.text.text = pingTrackerText;
                    return false;
                }

                return true;
            }
        }
        
        [HarmonyPatch(typeof(TaskPanelBehaviour), nameof(TaskPanelBehaviour.SetTaskText))]
        public static class TaskPanelTextPatch
        {
            public static void Postfix(TaskPanelBehaviour __instance)
            {
                if (HudStrings.TryGetValue(HudLocation.TaskText, out string? taskText))
                {
                    __instance.taskText.text = taskText + "\n" + __instance.taskText.text;
                }
            }
        }
    }
}