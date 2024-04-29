using System;
using System.Collections.Generic;
using System.Linq;
using AmongUs.GameOptions;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Reactor.Utilities;
using Object = UnityEngine.Object;

namespace MouthwashClient.Patches.Game
{
    public static class HudVisibilityPatches
    {
        public static HashSet<HudItem> HiddenItems = new();
        public static ProgressTracker ProgressTrackerInstance;

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class SetHudVisibilityMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (byte)MouthwashRootPacketTag.SetHudVisibility:
                        HudItem hudItem = (HudItem)reader.ReadByte();
                        bool isVisible = reader.ReadBoolean();
                        lock (HiddenItems)
                        {
                            if (isVisible)
                            {
                                HiddenItems.Remove(hudItem);
                            }
                            else
                            {
                                HiddenItems.Add(hudItem);
                            }

                        }
                        // if (DestroyableSingleton<HudManager>.Instance.roomTracker.gameObject.activeSelf)
                        // {
                        //    DestroyableSingleton<HudManager>.Instance.SetHudActive(true);
                        // }
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
                if (__instance == PlayerControl.LocalPlayer)
                {
                    HiddenItems.Clear();
                }
            }
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.Start))]
        public static class RefreshHudOnStartPatch
        {
            public static void Postfix(HudManager __instance)
            {
                //__instance.SetHudActive(true);
            }
        }
        
        [HarmonyPatch(typeof(ProgressTracker), nameof(ProgressTracker.Start))]
        public static class AssignProgressTrackerSingletonPatch
        {
            public static void Postfix(ProgressTracker __instance)
            {
                ProgressTrackerInstance = __instance;
            }
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.SetHudActive), typeof(PlayerControl), typeof(RoleBehaviour), typeof(bool))]
        public static class HudActiveModificationPatch
        {
            public static bool Prefix(HudManager __instance, [HarmonyArgument(0)] PlayerControl localPlayer,
                [HarmonyArgument(1)] RoleBehaviour role,
                [HarmonyArgument(2)] bool isActive)
            {
                // Adapted from: HudManager.cs
                lock (HiddenItems)
                {
                    __instance.AbilityButton.ToggleVisible(isActive && !HiddenItems.Contains(HudItem.UseButton));
                    if (isActive && !HiddenItems.Contains(HudItem.UseButton))
                    {
                        __instance.UseButton.Refresh();
                        __instance.AbilityButton.Refresh(role.Ability);
                    }
                    else
                    {
                        __instance.UseButton.ToggleVisible(false);
                        __instance.PetButton.ToggleVisible(false);
                    }
                    bool flag = localPlayer.Data != null && localPlayer.Data.IsDead;
                    __instance.ReportButton.ToggleVisible(isActive && !HiddenItems.Contains(HudItem.ReportButton) && !flag && GameManager.Instance.CanReportBodies() && ShipStatus.Instance != null);
                    __instance.KillButton.ToggleVisible(false);
                    __instance.SabotageButton.ToggleVisible(isActive && !HiddenItems.Contains(HudItem.SabotageButton) && role.IsImpostor);
                    __instance.AdminButton.ToggleVisible(isActive && !HiddenItems.Contains(HudItem.AdminTable) && role.IsImpostor);
                    __instance.ImpostorVentButton.ToggleVisible(isActive && !HiddenItems.Contains(HudItem.VentButton) && !flag && role.IsImpostor && GameOptionsManager.Instance.CurrentGameOptions.GameMode != GameModes.HideNSeek);
                    __instance.TaskPanel.gameObject.SetActive(isActive && !HiddenItems.Contains(HudItem.TaskListPopup));
                    __instance.roomTracker.gameObject.SetActive(isActive);
                    if (__instance.joystick != null)
                    {
                        __instance.joystick.ToggleVisuals(isActive);
                    }
                    __instance.ToggleRightJoystick(isActive);
                }
                return false;
            }
        }

        [HarmonyPatch(typeof(SabotageButton), nameof(SabotageButton.Refresh))]
        public static class HideSabotageButtonPatch
        {
            public static bool Prefix(SabotageButton __instance)
            {
                if (HiddenItems.Contains(HudItem.SabotageButton))
                {
                    __instance.ToggleVisible(false);
                    __instance.SetDisabled();
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(ReportButton), nameof(ReportButton.SetActive))]
        public static class HideReportButtonPatch
        {
            public static bool Prefix(ReportButton __instance)
            {
                if (HiddenItems.Contains(HudItem.ReportButton))
                {
                    __instance.ToggleVisible(false);
                    __instance.SetDisabled();
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(AdminButton), nameof(AdminButton.Refresh))]
        public static class HideAdminButtonPatch
        {
            public static bool Prefix(AdminButton __instance)
            {
                if (HiddenItems.Contains(HudItem.AdminTable))
                {
                    __instance.ToggleVisible(false);
                    __instance.SetDisabled();
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(MapConsole), nameof(MapConsole.CanUse))]
        public static class HideAdminConsolePatch
        {
            public static bool Prefix(MapConsole __instance, ref float __result)
            {
                if (HiddenItems.Contains(HudItem.AdminTable))
                {
                    __result = 0f;
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(SystemConsole), nameof(SystemConsole.CanUse))]
        public static class HideEmergencyConsolePatch
        {
            public static bool Prefix(SystemConsole __instance, ref float __result)
            {
                EmergencyMinigame? minigame = __instance.MinigamePrefab.TryCast<EmergencyMinigame>();
                if (minigame != null && HiddenItems.Contains(HudItem.CallMeetingButton))
                {
                    __result = 0f;
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.ToggleUseAndPetButton))]
        public static class HideUseButtonPatch
        {
            public static bool Prefix(HudManager __instance)
            {
                if (HiddenItems.Contains(HudItem.UseButton))
                {
                    __instance.UseButton.ToggleVisible(false);
                    __instance.PetButton.ToggleVisible(false);
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(Vent), nameof(Vent.CanUse))]
        public static class VentConsolePatch
        {
            public static bool Prefix(Vent __instance, ref float __result)
            {
                if (HiddenItems.Contains(HudItem.VentButton))
                {
                    __result = 0f; 
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(AmongUsClient), nameof(AmongUsClient.Update))]
        public static class ShowOrHideProgressTrackerPatch
        {
            public static void Postfix(AmongUsClient __instance)
            {
                if (ProgressTrackerInstance != null)
                {
                    ProgressTrackerInstance.gameObject.SetActive(!HiddenItems.Contains(HudItem.TaskProgressBar));
                }
            }
        }

        [HarmonyPatch(typeof(InfectedOverlay), nameof(InfectedOverlay.FixedUpdate))]
        public static class HideSabotageButtonsPatch {
            public static void Postfix(InfectedOverlay __instance) {
                foreach (ButtonBehavior button in __instance.allButtons) {
                                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Hidden: {string.Join(',', HiddenItems)}");
                    PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(
                        $"Is visible? {button.gameObject.name} {HiddenItems.Contains(HudItem.MapDoorButtons)} {HiddenItems.Contains(HudItem.MapSabotageButtons)}");
                    button.gameObject.SetActive(button.gameObject.name is "closeDoors" or "Doors"
                        ? !HiddenItems.Contains(HudItem.MapDoorButtons) : !HiddenItems.Contains(HudItem.MapSabotageButtons));
                }
            }
        }
    }
}