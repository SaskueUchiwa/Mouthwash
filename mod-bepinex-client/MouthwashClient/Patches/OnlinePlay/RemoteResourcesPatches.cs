using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Services;
using Reactor.Utilities;

namespace MouthwashClient.Patches.OnlinePlay
{
    public static class RemoteResourcesPatches
    {
        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class FetchResourcePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (int)MouthwashRootPacketTag.FetchResource:
                        int resourceId = reader.ReadPackedInt32();
                        string resourceLocation = reader.ReadString();
                        byte[] bytes = reader.ReadBytes(32);
                        uint resourceType = reader.ReadByte();
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(
                            $"Server asked for resource of ID {resourceId}.");
                        __instance.StartCoroutine(
                            RemoteResourceService.CoFetchResourceAtLocationAndVerify(resourceId, resourceLocation,
                                bytes, (ResourceType)resourceType, true));
                        return false;
                }

                return true;
            }
        }
    }
}