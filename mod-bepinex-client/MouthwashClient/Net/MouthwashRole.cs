using AmongUs.GameOptions;
using Il2CppSystem.Text;
using MouthwashClient.Patches.Game;
using Reactor.Utilities.Attributes;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class MouthwashRole : RoleBehaviour
    {
        void Start()
        {
            Role = RoleTypes.Crewmate;
        }

        public override bool IsDead => Player.Data.IsDead;

        public override void AppendTaskHint(StringBuilder taskStringBuilder)
        {
            // we don't want to append any hints because they are crappalicious and also the server does
            // it for us :)
        }
        
        public override bool CanUse(IUsable usable)
        {
            if (TeamType == RoleTeamTypes.Impostor)
            {
                if (!GameManager.Instance.LogicUsables.CanUse(usable, Player))
                    return false;
                Console? console = usable.TryCast<Console>();
                return console == null || console.AllowImpostor || (AllowTaskInteractionPatches.IsTaskInteractionAllowed && AllowTaskInteractionPatches.IsTaskInteractionAllowedForced);
            }
            
            return usable.TryCast<Console>() != null && AllowTaskInteractionPatches.IsTaskInteractionAllowed;
        }
    }
}