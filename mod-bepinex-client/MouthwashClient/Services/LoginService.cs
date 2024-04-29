using System;
using System.Collections;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Reactor.Utilities;

namespace MouthwashClient.Services
{
    public class UserInformation
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
        [JsonPropertyName("email")]
        public string Email { get; set; }
        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; }
        [JsonPropertyName("banned_until")]
        public string? BannedUntil { get; set; }
        [JsonPropertyName("muted_until")]
        public string? MutedUntil { get; set; }
        [JsonPropertyName("email_verified")]
        public bool EmailVerified { get; set; }
        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; }
        [JsonPropertyName("cosmetic_hat")]
        public string CosmeticHat { get; set; }
        [JsonPropertyName("cosmetic_pet")]
        public string CosmeticPet { get; set; }
        [JsonPropertyName("cosmetic_skin")]
        public string CosmeticSkin { get; set; }
        [JsonPropertyName("cosmetic_color")]
        public int CosmeticColor { get; set; }
        [JsonPropertyName("cosmetic_visor")]
        public string CosmeticVisor { get; set; }
        [JsonPropertyName("cosmetic_nameplate")]
        public string CosmeticNameplate { get; set; }
    }

    public class UserInformationWithAuthToken : UserInformation
    {
        [JsonPropertyName("client_token")]
        public string ClientToken { get; set; }
    }

    public class StandardApiResponse<T>
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
        [JsonPropertyName("data")]
        public T Data { get; set; }
    }
    
    public static class LoginService
    {
        private static UserInformationWithAuthToken? _cachedUserInformation;
        public static string ErrorWhileLoggingIn = "";

        public static Action<string> ErrorCallback;
        public static Action DoneCallback;

        public static IEnumerator CoInitialize()
        {
            _cachedUserInformation = null;
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Checking user credentials..");
            
            LoginUserCredentials? userCredentials = CredentialsService.GetLoginUserCredentials();
            if (userCredentials == null)
            {
                ErrorCallback(
                    "Couldn't check your login credentials.\nMake sure you start the game through\nthe launcher.");
                yield break;
            }

            string url = $"{PluginSingleton<MouthwashClientPlugin>.Instance.runtimeConfig.AccountsUrl}/api/v2/auth/check";
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Authenticating with account server @ POST {url}");

            HttpRequestMessage request = new()
            {
                Method = HttpMethod.Post,
                Headers = { Authorization = new AuthenticationHeaderValue("Bearer", userCredentials.ClientToken) },
                RequestUri = new Uri(url),
                Content = new ByteArrayContent(new byte[]{ })
            };
            Task<HttpResponseMessage> responseTask = PluginSingleton<MouthwashClientPlugin>.Instance.httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            if (!responseTask.IsCompleted)
                yield return null;

            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Authentication status: {responseTask.Result.StatusCode}..");
            
            if (!responseTask.Result.IsSuccessStatusCode)
            {
                ErrorCallback(
                    "Failed to get information about your login.\nMake sure you start the game through\nthe launcher.");
                yield break;
            }

            Task<string> responseContentTask = responseTask.Result.Content.ReadAsStringAsync();
            if (!responseContentTask.IsCompleted)
                yield return null;

            StandardApiResponse<UserInformationWithAuthToken>? userInformation =
                JsonSerializer.Deserialize<StandardApiResponse<UserInformationWithAuthToken>>(responseContentTask.Result);
            if (userInformation == null)
            {
                ErrorCallback(
                    "Couldn't get information about your login.\nMake sure you start the game through\nthe launcher.");
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Successfully authenticated!");

            _cachedUserInformation = userInformation.Data;
            DoneCallback();
        }

        public static bool IsLoggedIn()
        {
            return _cachedUserInformation != null;
        }

        public static UserInformationWithAuthToken GetLoginInformation()
        {
            return _cachedUserInformation!;
        }
    }
}