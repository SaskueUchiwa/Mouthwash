using System;
using System.Buffers.Text;
using System.Text.Json.Serialization;
using Newtonsoft.Json;
using Reactor.Utilities;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace MouthwashClient.Services
{
    public class LoginUserCredentials
    {
        [JsonPropertyName("ClientIdString")]
        public string ClientIdString { get; set; }
        [JsonPropertyName("ClientToken")]
        public string ClientToken { get; set; }
        [JsonPropertyName("DisplayName")]
        public string DisplayName { get; set; }
        [JsonPropertyName("LoggedInDateTime")]
        public string LoggedInDateTime { get; set; }
        [JsonPropertyName("Perks")]
        public string[] Perks { get; set; }
    }
    
    public static class CredentialsService
    {
        public static LoginUserCredentials? ParseLoginUserCredentials(string loginToken)
        {
            try
            {
                string plainText = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(loginToken));
                return JsonSerializer.Deserialize<LoginUserCredentials>(plainText);
            }
            catch (Exception e)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Failed to parse user credentials: {e}");
                return null;
            }
        }
        
        public static LoginUserCredentials? GetLoginUserCredentials()
        {
            string? loginToken = Environment.GetEnvironmentVariable("MWGG_LOGIN_TOKEN");
            if (loginToken == null)
            {
                return null;
            }

            return ParseLoginUserCredentials(loginToken);
        }
    }
}