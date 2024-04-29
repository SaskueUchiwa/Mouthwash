using System;
using System.Buffers.Text;
using System.Text.Json.Serialization;
using Newtonsoft.Json;
using Reactor.Utilities;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace MouthwashClient.Services
{
    public class RuntimeConfigurationServerRegion
    {
        [JsonPropertyName("name")] public string Name { get; set; }
        [JsonPropertyName("domain")] public string Domain { get; set; }
        [JsonPropertyName("ip")] public string Ip { get; set; }
        [JsonPropertyName("port")] public ushort Port { get; set; }
    }
    
    public class RuntimeConfiguration
    {
        [JsonPropertyName("accounts_url")] public string AccountsUrl { get; set; }
        [JsonPropertyName("server_regions")] public RuntimeConfigurationServerRegion[] ServerRegions { get; set; }
    }
    
    public static class RuntimeConfigurationService
    {
        public static RuntimeConfiguration? ParseRuntimeConfiguration(string configString)
        {
            try
            {
                string plainText = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(configString));
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"CONFIG STRING: {JsonSerializer.Deserialize<RuntimeConfiguration>(plainText).AccountsUrl}");
                return JsonSerializer.Deserialize<RuntimeConfiguration>(plainText);
            }
            catch (Exception e)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Failed to parse runtime configuration {e}");
                return null;
            }
        }
        
        public static RuntimeConfiguration? GetRuntimeConfiguration()
        {
            string? configString = Environment.GetEnvironmentVariable("MWGG_CONFIG");
            if (configString == null)
            {
                return null;
            }

            return ParseRuntimeConfiguration(configString);
        }
    }
}