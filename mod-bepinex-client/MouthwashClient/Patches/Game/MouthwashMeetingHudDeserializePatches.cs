using System;
using HarmonyLib;
using Hazel;
using MouthwashClient.Enums;

namespace MouthwashClient.Patches.Game
{
    public static class MouthwashMeetingHudDeserializePatches
    {
        public static bool WasExiledImposotor;
        public static byte NumImpostorsLeft;
        public static byte TotalImpostors;
        
        [HarmonyPatch(typeof(PlayerVoteArea), nameof(PlayerVoteArea.Deserialize))]
        public static class NetworkDeadAndDisabledFlagsPatch
        {
            public static bool Prefix(PlayerVoteArea __instance, [HarmonyArgument(0)] MessageReader reader)
            {
                __instance.VotedFor = reader.ReadByte();
                __instance.AmDead = reader.ReadBoolean();
                bool disabled = reader.ReadBoolean();
                if (disabled)
                {
                    __instance.SetDisabled();
                }
                else
                {
                    __instance.SetEnabled();
                }

                __instance.DidReport = reader.ReadBoolean();
                
                __instance.Megaphone.enabled = __instance.DidReport;
                __instance.Overlay.gameObject.SetActive(__instance.AmDead);
                __instance.XMark.gameObject.SetActive(__instance.AmDead);
                return false;
            }
        }
        
        [HarmonyPatch(typeof(MeetingHud), nameof(MeetingHud.HandleRpc))]
        public static class OverwriteVotingCompletePatch
        {
            public static bool Prefix(MeetingHud __instance, [HarmonyArgument(0)] byte callId, [HarmonyArgument(1)] MessageReader reader)
            {
                if (callId == (byte)MouthwashRpcPacketTag.OverwriteVotingComplete)
                {
                    MeetingHud.VoterState[] array = new MeetingHud.VoterState[reader.ReadPackedInt32()];
                    for (int i = 0; i < array.Length; i++)
                    {
                        array[i] = MeetingHud.VoterState.Deserialize(reader);
                    }
                    GameData.PlayerInfo playerById = GameData.Instance.GetPlayerById(reader.ReadByte());
                    bool wasExiledImpostor = reader.ReadBoolean();
                    byte numImpostorsLeft = reader.ReadByte();
                    byte totalImpostors = reader.ReadByte();
                    bool tie = reader.ReadBoolean();

                    WasExiledImposotor = wasExiledImpostor;
                    NumImpostorsLeft = numImpostorsLeft;
                    TotalImpostors = totalImpostors;
                    __instance.VotingComplete(array, playerById, tie);
                    return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(ExileController), nameof(ExileController.Begin))]
        public static class UseOverwrittenVoteCompletePatch
        {
            public static void Postfix(ExileController __instance, [HarmonyArgument(0)] GameData.PlayerInfo exiled, [HarmonyArgument(1)] bool tie)
            {
				if (exiled != null)
				{
					if (!GameManager.Instance.LogicOptions.GetConfirmImpostor())
					{
						__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ExileTextNonConfirm, exiled.PlayerName);
					}
					else if (exiled.Role.IsImpostor)
					{
						if (TotalImpostors > 1)
						{
							__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ExileTextPP, exiled.PlayerName);
						}
						else
						{
							__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ExileTextSP, exiled.PlayerName);
						}
					}
					else if (TotalImpostors > 1)
					{
						__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ExileTextPN, exiled.PlayerName);
					}
					else
					{
						__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ExileTextSN, exiled.PlayerName);
					}
				}
				else
				{
					if (tie)
					{
						__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.NoExileTie);
					}
					else
					{
						__instance.completeString = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.NoExileSkip);
					}
				}
				if (NumImpostorsLeft == 1)
				{
					__instance.ImpostorText.text = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ImpostorsRemainS, NumImpostorsLeft);
				}
				else
				{
					__instance.ImpostorText.text = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.ImpostorsRemainP, NumImpostorsLeft);
				}
            }
        }

        [HarmonyPatch(typeof(PlayerVoteArea), nameof(PlayerVoteArea.SetDead))]
        public static class RemoveDefaultDeadVoteAreaPatch
        {
            public static bool Prefix(PlayerVoteArea __instance)
            {
                return false;
            }
        }
    }
}