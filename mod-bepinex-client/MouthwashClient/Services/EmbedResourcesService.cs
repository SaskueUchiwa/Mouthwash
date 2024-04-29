using System.Collections;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Services
{
    public static class EmbedResourcesService
    {
        public static AssetBundle? LoadedAssetBundle;

        public static async Task CoLoadEmbeddedResources()
        {
            if (LoadedAssetBundle != null)
                return;

            Stream? embeddedResourceStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("MouthwashClient.mouthwashresources");
            if (embeddedResourceStream == null)
                return;
            
            byte[] embeddedResourceBuffer = new byte[embeddedResourceStream.Length];
            await embeddedResourceStream.ReadAsync(embeddedResourceBuffer, 0, embeddedResourceBuffer.Length);
            LoadedAssetBundle = AssetBundle.LoadFromMemory(embeddedResourceBuffer);
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loaded embedded resources!");
        }
    }
}