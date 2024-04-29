using System;
using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;
using Reactor.Utilities;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MouthwashClient.Patches.Game
{
    public static class CustomGameOverPatches
    {
        public enum WinSound
        {
            CustomSound,
            CrewmateWin,
            ImpostorWin,
            Disconnect,
            NoSound
        }
        
        public struct GameGameOverScreen
        {
            public string TitleText;
            public string SubtitleText;
            public Color BackgroundColor;
            public WinningPlayerData[] YourTeam;
            public bool DisplayQuit;
            public bool DisplayPlayAgain;
            public WinSound WinSound;
            public uint CustomWinSound;
        }

        public static GameGameOverScreen GameOverInformation = new GameGameOverScreen
        {
	        TitleText = "Error",
	        SubtitleText = "Failed to load end-game",
	        BackgroundColor = Color.white,
	        YourTeam = new WinningPlayerData[]
	        {
	        },
	        DisplayQuit = true,
	        DisplayPlayAgain = true,
	        WinSound = WinSound.ImpostorWin,
	        CustomWinSound = 0
        };

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class CustomGameOverMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
	            switch (reader.Tag)
                {
                    case (byte)MouthwashRootPacketTag.OverwriteGameOver:
                        string titleText = reader.ReadString();
                        string subtitleText = reader.ReadString();
                        Color backgroundColor = MouthwashChatMessageAppearance.ReadColor(reader);
                        uint numTeam = reader.ReadPackedUInt32();
                        byte[] team = new byte[numTeam];
                        for (int i = 0; i < numTeam; i++)
                        {
                            team[i] = reader.ReadByte();
                        }

                        bool displayQuit = reader.ReadBoolean();
                        bool displayPlayAgain = reader.ReadBoolean();
                        byte winSound = reader.ReadByte();
                        uint customWinSound = reader.ReadPackedUInt32();
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Got game over screen: '{titleText}' '{subtitleText}', '{backgroundColor}', '{numTeam}'");
                        GameOverInformation = new GameGameOverScreen
                        {
                            TitleText = titleText,
                            SubtitleText = subtitleText,
                            BackgroundColor = backgroundColor,
                            YourTeam = team.Where(x => GetPlayerControlById(x) != null).Select(x => new WinningPlayerData(GetPlayerControlById(x)!.Data)).ToArray(),
                            DisplayQuit = displayQuit,
                            DisplayPlayAgain = displayPlayAgain,
                            WinSound = (WinSound)winSound,
                            CustomWinSound = customWinSound
                        };
                        return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(EndGameManager), nameof(EndGameManager.SetEverythingUp))]
        public static class OverrideGameOverSetupPatch
        {
            public static bool Prefix(EndGameManager __instance)
            {
	            CustomSetEverythingUp(__instance);
                return false;
            }
        }

        public static PlayerControl? GetPlayerControlById(byte playerId)
        {
	        foreach (PlayerControl pc in PlayerControl.AllPlayerControls)
		        if (pc.PlayerId == playerId) return pc;

	        return null;
        }

        public static void CustomSetEverythingUp(EndGameManager __instance)
        {
            StatsManager.Instance.IncrementStat(StringNames.StatsGamesFinished);
			__instance.Navigation.HideButtons();
			bool flag = GameManager.Instance.DidHumansWin(TempData.EndReason);
			__instance.WinText.text = $"{GameOverInformation.TitleText}<br><size=50%>{GameOverInformation.SubtitleText}</size>";
			__instance.WinText.color = GameOverInformation.BackgroundColor;
			__instance.BackgroundBar.material.SetColor("_Color", GameOverInformation.BackgroundColor);
			switch (GameOverInformation.WinSound)
			{
				case WinSound.CustomSound:
					// TODO
					break;
				case WinSound.CrewmateWin:
					SoundManager.Instance.PlayNamedSound("Stinger", __instance.CrewStinger, false, SoundManager.Instance.MusicChannel);
					break;
				case WinSound.ImpostorWin:
					SoundManager.Instance.PlayNamedSound("Stinger", __instance.ImpostorStinger, false, SoundManager.Instance.MusicChannel);
					break;
				case WinSound.Disconnect:
					SoundManager.Instance.PlayNamedSound("Stinger", __instance.DisconnectStinger, false, SoundManager.Instance.MusicChannel);
					break;
				case WinSound.NoSound:
					break;
				default:
					throw new ArgumentOutOfRangeException();
			}
	        int num = Mathf.CeilToInt(7.5f);
	        List<WinningPlayerData> list = GameOverInformation.YourTeam.ToList();
			for (int i = 0; i < list.Count; i++)
			{
				WinningPlayerData winningPlayerData2 = list[i];
				int num2 = (i % 2 == 0) ? -1 : 1;
				int num3 = (i + 1) / 2;
				float num4 = (float)num3 / (float)num;
				float num5 = Mathf.Lerp(1f, 0.75f, num4);
				float num6 = (float)((i == 0) ? -8 : -1);
				PoolablePlayer poolablePlayer = Object.Instantiate<PoolablePlayer>(__instance.PlayerPrefab, __instance.transform);
				poolablePlayer.transform.localPosition = new Vector3(1f * (float)num2 * (float)num3 * num5, FloatRange.SpreadToEdges(-1.125f, 0f, num3, num), num6 + (float)num3 * 0.01f) * 0.9f;
				float num7 = Mathf.Lerp(1f, 0.65f, num4) * 0.9f;
				Vector3 vector = new Vector3(num7, num7, 1f);
				poolablePlayer.transform.localScale = vector;
				if (winningPlayerData2.IsDead)
				{
					poolablePlayer.SetBodyAsGhost();
					poolablePlayer.SetDeadFlipX(i % 2 == 0);
				}
				else
				{
					poolablePlayer.SetFlipX(i % 2 == 0);
				}
				poolablePlayer.UpdateFromPlayerOutfit(winningPlayerData2, PlayerMaterial.MaskType.None, winningPlayerData2.IsDead, true, null);
				if (flag)
				{
					poolablePlayer.ToggleName(false);
				}
				else
				{
					Color color = winningPlayerData2.IsImpostor ? Palette.ImpostorRed : Palette.White;
					poolablePlayer.SetName(winningPlayerData2.PlayerName, vector.Inv(), color, -15f);
					Vector3 namePosition = new Vector3(0f, -1.31f, -0.5f);
					poolablePlayer.SetNamePosition(namePosition);
				}
			}
        }
    }
}