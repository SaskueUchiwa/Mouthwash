using System.Net.Http;
using System.Threading.Tasks;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using MouthwashClient.Services;
using Reactor;
using Reactor.Utilities;
using TMPro;
using UnityEngine;

namespace MouthwashClient
{
    [BepInPlugin(Id, "Polus.GG: Rewritten-worked", VersionString)]
    [BepInProcess("Among Us.exe")]
    [BepInDependency(ReactorPlugin.Id)]
    public partial class MouthwashClientPlugin : BasePlugin
    {
        public Harmony Harmony { get; } = new(Id);
        public const string Id = "gg.polus.rewritten";
        public const string VersionString = "3.0.0";

        public ConfigEntry<string> ConfigName { get; private set; }

        public HttpClient httpClient;
        public RuntimeConfiguration runtimeConfig;

        public override void Load()
        {
            Harmony.PatchAll();
            httpClient = new();

            runtimeConfig = RuntimeConfigurationService.GetRuntimeConfiguration() ?? new RuntimeConfiguration()
            {
                AccountsUrl = "https://urban-space-fortnight-jjr4gjwpjpr63p9r9-8000.app.github.dev",
                ServerRegions = new RuntimeConfigurationServerRegion[]
                {
                    new()
                    {
                        Name = "Localhost",
                        Domain = "localhost",
                        Ip = "127.0.0.1",
                        Port = 22023
                    }
                }
            };
        }
    }
}
