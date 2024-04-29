using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using BepInEx.Configuration;
using HarmonyLib;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.Dump
{
    [Serializable]
    public struct SystemRoomBoundsVec2
    {
        public float x { get; set; }
        public float y { get; set; }
    }
    
    [Serializable]
    public struct SystemRoomBounds
    {
        public int systemType { get; set; }
        public SystemRoomBoundsVec2 min { get; set; }
        public SystemRoomBoundsVec2 max { get; set; }
    }
    
    public static class DumpRoomBounds
    {
        public static bool HasDumped = false;
        
        [HarmonyPatch(typeof(AmongUsClient), nameof(AmongUsClient.Update))]
        public static class DumpRoomBoundsOnShipPatch
        {
            public static void Postfix(AmongUsClient __instance)
            {
                if (!Input.GetKey(KeyCode.K))
                {
                    HasDumped = false;
                    return;
                }
                if (HasDumped)
                    return;
                HasDumped = true;

                ShipStatus ship = ShipStatus.Instance;
                ConfigEntry<bool> dumpsEnabledConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                    "Dumps.Bounds",
                    "Enabled",
                    false,
                    "Whether or not to dump room bounds from the game");

                ConfigEntry<string> destinationPathConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                    "Dumps.Bounds",
                    "DestinationPath",
                    "",
                    "The path to dump room bounds to");

                if (!dumpsEnabledConfig.Value || string.IsNullOrEmpty(destinationPathConfig.Value))
                    return;

                Directory.CreateDirectory(destinationPathConfig.Value);

                PlainShipRoom[] rooms = ship.GetComponentsInChildren<PlainShipRoom>(true);
                List<SystemRoomBounds> roomBounds = new();
                foreach (PlainShipRoom room in rooms)
                {
                    if (room.roomArea == null)
                        continue;
                    roomBounds.Add(new SystemRoomBounds
                    {
                        systemType = (int)room.RoomId,
                        min = new SystemRoomBoundsVec2
                            { x = room.roomArea.bounds.min.x, y = room.roomArea.bounds.min.y },
                        max = new SystemRoomBoundsVec2
                            { x = room.roomArea.bounds.max.x, y = room.roomArea.bounds.max.y }
                    });
                }
                string serializedJson = JsonSerializer.Serialize(roomBounds.ToArray());
                
                File.WriteAllText(Path.Join(destinationPathConfig.Value, ship.Type + ".json"), serializedJson);
            }
        }
    }
}