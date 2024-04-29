using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    public static class CustomTaskCountPatches
    {
        public static int NumPlayersWithTasks = 0;
        
        [HarmonyPatch(typeof(GameData), nameof(GameData.RecomputeTaskCounts))]
        public static class DisableDefaultRecomputeTaskCountsPatch
        {
            public static bool Prefix(GameData __instance)
            {
                return false;
            }
        }

        [HarmonyPatch(typeof(GameData), nameof(GameData.CompleteTask))]
        public static class RemoveTaskIncrementPatch
        {
            public static bool Prefix(GameData __instance,
                [HarmonyArgument(0)] PlayerControl pc, [HarmonyArgument(1)] uint taskId)
            {
                GameData.TaskInfo taskInfo = pc.Data.FindTaskById(taskId);
                if (taskInfo == null)
                {
                    return false;
                }
                if (!taskInfo.Complete)
                {
                    taskInfo.Complete = true;
                    return false;
                }
                return false;
            }
        }

        [HarmonyPatch(typeof(ProgressTracker), nameof(ProgressTracker.FixedUpdate))]
        public static class CustomTaskProgressPatch
        {
            public static bool Prefix(ProgressTracker __instance)
            {
                if (PlayerTask.PlayerHasTaskOfType<IHudOverrideTask>(PlayerControl.LocalPlayer))
                {
                    __instance.TileParent.enabled = false;
                    return false;
                }
                if (!__instance.TileParent.enabled)
                {
                    __instance.TileParent.enabled = true;
                }
                GameData instance = GameData.Instance;
                if (instance && instance.TotalTasks > 0)
                {
                    switch (GameManager.Instance.LogicOptions.GetTaskBarMode())
                    {
                        case TaskBarMode.Normal:
                            break;
                        case TaskBarMode.MeetingOnly:
                            if (!MeetingHud.Instance)
                            {
                                goto IL_112;
                            }
                            break;
                        case TaskBarMode.Invisible:
                            __instance.gameObject.SetActive(false);
                            goto IL_112;
                        default:
                            goto IL_112;
                    }
                    float num2 = (float)instance.CompletedTasks / (float)instance.TotalTasks * (float)NumPlayersWithTasks;
                    __instance.curValue = Mathf.Lerp(__instance.curValue, num2, Time.fixedDeltaTime * 2f);
                    IL_112:
                    __instance.TileParent.material.SetFloat("_Buckets", (float)NumPlayersWithTasks);
                    __instance.TileParent.material.SetFloat("_FullBuckets", __instance.curValue);
                }
                return false;
            }
        }

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class CustomIntroMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (int)MouthwashRootPacketTag.SetTaskCounts:
                    {
                        GameData.Instance.TotalTasks = (int)reader.ReadPackedUInt32();
                        GameData.Instance.CompletedTasks = (int)reader.ReadPackedUInt32();
                        NumPlayersWithTasks = (int)reader.ReadPackedUInt32();
                        return false;
                    }
                }
                return true;
            }
        }
    }
}