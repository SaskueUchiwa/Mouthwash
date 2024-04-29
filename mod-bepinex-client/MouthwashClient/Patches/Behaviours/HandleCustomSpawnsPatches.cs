using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Net;
using Reactor.Utilities;
using Reactor.Utilities.Extensions;
using UnityEngine;
using UnityEngine.AddressableAssets;

namespace MouthwashClient.Patches.Behaviours
{
    public static class HandleCustomSpawnsPatches
    {
        public static InnerNetObject? ButtonPrefab;
        public static InnerNetObject? CameraControllerPrefab;
        public static InnerNetObject? DeadBodyGenericPrefab;
        public static InnerNetObject? SoundSourcePrefab;
        
        [HarmonyPatch(typeof(AmongUsClient), nameof(AmongUsClient.Awake))]
        public static class RegisterCustomSpawnTypeOnAwakePatch
        {
            public static void Postfix(AmongUsClient __instance)
            {
                ButtonPrefab ??= CreateButtonPrefab();
                CameraControllerPrefab ??= CreateCameraControllerPrefab();
                DeadBodyGenericPrefab ??= CreateDeadBodyGenericPrefab();
                SoundSourcePrefab ??= CreateSoundSourcePrefab();
                __instance.NonAddressableSpawnableObjects = __instance.NonAddressableSpawnableObjects
                    .AddItem(ButtonPrefab)
                    .AddItem(CameraControllerPrefab)
                    .AddItem(DeadBodyGenericPrefab)
                    .AddItem(SoundSourcePrefab).ToArray();
                IEnumerable<AssetReference> spawnableObjects = __instance.SpawnableObjects.AsEnumerable();
                for (int i = 0; i < 255 - __instance.SpawnableObjects.Length; i++)
                {
                    spawnableObjects = spawnableObjects.AddItem(null)!;
                }
                __instance.SpawnableObjects = spawnableObjects.ToArray();
            }
        }

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.AddNetObject))]
        public static class SpawnTypeDebugPatch
        {
            public static void Postfix(InnerNetClient._CoHandleSpawn_d__40 __instance, ref bool __result, [HarmonyArgument(0)] InnerNetObject obj)
            {
                obj.gameObject.SetActive(true);
            }
        }

        public static InnerNetObject CreateButtonPrefab()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Creating button object..");
	        GameObject obj = new("Button");
	        obj.SetActive(false);
            obj.DontDestroy();
            CustomNetworkTransformGeneric cntGeneric = obj.AddComponent<CustomNetworkTransformGeneric>();
            cntGeneric.SpawnId = (uint)MouthwashSpawnType.Button;
            Graphic graphic = obj.AddComponent<Graphic>();
            ClickBehaviour clickBehaviour = obj.AddComponent<ClickBehaviour>();
            BoxCollider2D collider = obj.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(1.15f, 1.15f);
            collider.isTrigger = true;
            obj.AddComponent<PassiveButton>();

            return cntGeneric;
        }

        public static InnerNetObject CreateCameraControllerPrefab()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Creating camera controller object..");
            GameObject obj = new("Camera Controller");
            obj.SetActive(false);
            obj.DontDestroy();
            CameraController cameraController = obj.AddComponent<CameraController>();
            cameraController.SpawnId = (uint)MouthwashSpawnType.CameraController;
            return cameraController;
        }

        public static InnerNetObject CreateDeadBodyGenericPrefab()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Creating dead body generic object..");
            GameObject obj = new("Dead Body");
            obj.SetActive(false);
            obj.DontDestroy();
            DeadBodyGeneric deadBodyGeneric = obj.AddComponent<DeadBodyGeneric>();
            deadBodyGeneric.SpawnId = (uint)MouthwashSpawnType.DeadBody;
            CustomNetworkTransformGeneric cntGeneric = obj.AddComponent<CustomNetworkTransformGeneric>();
            return deadBodyGeneric;
        }

        public static InnerNetObject CreateSoundSourcePrefab()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Creating sound source object..");
            GameObject obj = new("Sound Source");
            obj.SetActive(false);
            obj.DontDestroy();
            SoundSource soundSource = obj.AddComponent<SoundSource>();
            soundSource.SpawnId = (uint)MouthwashSpawnType.SoundSource;
            CustomNetworkTransformGeneric cntGeneric = obj.AddComponent<CustomNetworkTransformGeneric>();
            return soundSource;
        }
    }
}