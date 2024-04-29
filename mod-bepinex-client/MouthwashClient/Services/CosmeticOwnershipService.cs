using System;
using System.Collections;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Reactor.Utilities;

namespace MouthwashClient.Services
{
    public struct OwnedBundleItem
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
        [JsonPropertyName("bundle_id")]
        public string BundleId { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("among_us_id")]
        public string AmongUsId { get; set; }
        [JsonPropertyName("resource_path")]
        public string ResourcePath { get; set; }
        [JsonPropertyName("type")]
        public string Type { get; set; }
        [JsonPropertyName("resource_id")]
        public int ResourceId { get; set; }
        [JsonPropertyName("asset_bundle_url")]
        public string AssetBundleUrl { get; set; }
        [JsonPropertyName("asset_bundle_hash")]
        public string AssetBundleHash { get; set; }
        [JsonPropertyName("asset_bundle_base_resource_id")]
        public int AssetBundleBaseResourceId { get; set; }
    }
    
    [Serializable]
    public class UserCosmeticInformation
    {
        public string cosmetic_hat { get; set; }
        public string cosmetic_pet { get; set; }
        public string cosmetic_skin { get; set; }
        public int cosmetic_color { get; set; }
        public string cosmetic_visor { get; set; }
        public string cosmetic_nameplate { get; set; }
    }
    
    public static class CosmeticOwnershipService
    {
        public static List<OwnedBundleItem> OwnedBundleItems = new();
        public static HashSet<string> OwnedItemIds = new();

        public static Action<string> ErrorCallback;
        public static Action DoneCallback;
        
        public static IEnumerator CoLoadOwnedCosmetics()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Loading cosmetics owned by user..");
            string url = $"{PluginSingleton<MouthwashClientPlugin>.Instance.runtimeConfig.AccountsUrl}/api/v2/accounts/owned_items";
            HttpRequestMessage ownedBundlesRequest = new()
            {
                Method = HttpMethod.Get,
                Headers =
                {
                    Authorization =
                        new AuthenticationHeaderValue("Bearer", LoginService.GetLoginInformation().ClientToken)
                },
                RequestUri = new Uri(url)
            };
            Task<HttpResponseMessage> ownedBundlesResponse =
                PluginSingleton<MouthwashClientPlugin>.Instance.httpClient.SendAsync(ownedBundlesRequest);
            while (!ownedBundlesResponse.IsCompleted)
                yield return null;

            if (!ownedBundlesResponse.Result.IsSuccessStatusCode)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Failed to get owned cosmetic items: {ownedBundlesResponse.Result.StatusCode}");
                yield break;
            }
            
            Task<string> ownedBundlesResponseContent = ownedBundlesResponse.Result.Content.ReadAsStringAsync();
            while (!ownedBundlesResponseContent.IsCompleted)
                yield return null;
            OwnedBundleItem[]? ownedBundleItems = JsonSerializer.Deserialize<StandardApiResponse<OwnedBundleItem[]>>(ownedBundlesResponseContent.Result)?.Data;
            if (ownedBundleItems == null)
            {
                ErrorCallback("Could not resolve cosmetics that you own");
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Could not parse owned cosmetic items: {ownedBundlesResponseContent.Result}");
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Got {ownedBundleItems.Length} cosmetics owned by user");

            foreach (OwnedBundleItem ownedBundleItem in ownedBundleItems)
            {
                OwnedItemIds.Add(ownedBundleItem.AmongUsId);
                OwnedBundleItems.Add(ownedBundleItem);
            }

            DoneCallback();
        }
        
        public static IEnumerator CoSaveCosmetics(string cosmeticHat, string cosmeticPet, string cosmeticSkin, int cosmeticColor, string cosmeticVisor, string cosmeticNameplate)
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Saving cosmetics selected by user..");
            string url = $"{PluginSingleton<MouthwashClientPlugin>.Instance.runtimeConfig.AccountsUrl}/api/v2/accounts/cosmetics";
            string requestContents = JsonSerializer.Serialize(new UserCosmeticInformation()
            {
                cosmetic_hat = cosmeticHat,
                cosmetic_pet = cosmeticPet,
                cosmetic_skin = cosmeticSkin,
                cosmetic_color = cosmeticColor,
                cosmetic_visor = cosmeticVisor,
                cosmetic_nameplate = cosmeticNameplate
            });
            HttpRequestMessage ownedBundlesRequest = new()
            {
                Method = HttpMethod.Put,
                Headers =
                {
                    Authorization =
                        new AuthenticationHeaderValue("Bearer", LoginService.GetLoginInformation().ClientToken)
                },
                Content = new StringContent(requestContents, Encoding.Default, "application/json"),
                RequestUri = new Uri(url)
            };
            Task<HttpResponseMessage> ownedBundlesResponse =
                PluginSingleton<MouthwashClientPlugin>.Instance.httpClient.SendAsync(ownedBundlesRequest, HttpCompletionOption.ResponseHeadersRead);
            while (!ownedBundlesResponse.IsCompleted)
                yield return null;
            
            if (!ownedBundlesResponse.Result.IsSuccessStatusCode)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Could not save selected cosmetics");
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Successfully saved cosmetics");
        }
    }
}