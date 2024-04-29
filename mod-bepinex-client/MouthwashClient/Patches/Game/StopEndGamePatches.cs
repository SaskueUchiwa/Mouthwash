using HarmonyLib;

namespace MouthwashClient.Patches.Game
{
    public static class StopGameEndPatches
    {
        [HarmonyPatch(typeof(GameManager), nameof(GameManager.CheckEndGameViaTasks))]
        public static class StopEndGameDueToTasksPatch
        {
            public static bool Prefix(LogicGameFlowNormal __instance, ref bool __result)
            {
                __result = false;
                return false;
            }
        }
        
        [HarmonyPatch(typeof(LogicGameFlowNormal), nameof(LogicGameFlowNormal.CheckEndCriteria))]
        public static class StopEndGameCriteriaPatch
        {
            public static bool Prefix(LogicGameFlowNormal __instance)
            {
                return false;
            }
        }
    
        [HarmonyPatch(typeof(LogicGameFlowNormal), nameof(LogicGameFlowNormal.IsGameOverDueToDeath))]
        public static class StopEndGameDueToDeathPatch
        {
            public static bool Prefix(LogicGameFlowNormal __instance, ref bool __result)
            {
                __result = false;
                return false;
            }
        }
    }
}