using DeadlockAPI;
using DeadlockAPI.Enums;
using Devlock.GC.Deadlock.Internal;

namespace DeadlockSpectatorServer;

public class Priority
{
    private static bool ObjectiveAlive(ulong mask, ECitadelTeamObjective objective)
    {
        return (mask & (1u << (int)objective)) != 0;
    }

    private static bool TitanAlive(CMsgDevMatchInfo match, Teams team)
    {
        switch (team)
        {
            case Teams.Team0:
                return ObjectiveAlive(match.objectives_mask_team0, ECitadelTeamObjective.k_eCitadelTeamObjective_Titan);
            case Teams.Team1:
                return ObjectiveAlive(match.objectives_mask_team1, ECitadelTeamObjective.k_eCitadelTeamObjective_Titan);
        }

        return false;
    }
    private static bool CoreAlive(CMsgDevMatchInfo match, Teams team)
    {
        switch (team)
        {
            case Teams.Team0:
                return ObjectiveAlive(match.objectives_mask_team0, ECitadelTeamObjective.k_eCitadelTeamObjective_Core);
            case Teams.Team1:
                return ObjectiveAlive(match.objectives_mask_team1, ECitadelTeamObjective.k_eCitadelTeamObjective_Core);
        }

        return false;
    }
    private static bool Shrine1Alive(CMsgDevMatchInfo match, Teams team)
    {
        switch (team)
        {
            case Teams.Team0:
                return ObjectiveAlive(match.objectives_mask_team0, ECitadelTeamObjective.k_eCitadelTeamObjective_TitanShieldGenerator_1);
            case Teams.Team1:
                return ObjectiveAlive(match.objectives_mask_team1, ECitadelTeamObjective.k_eCitadelTeamObjective_TitanShieldGenerator_1);
        }

        return false;
    }
    private static bool Shrine2Alive(CMsgDevMatchInfo match, Teams team)
    {
        switch (team)
        {
            case Teams.Team0:
                return ObjectiveAlive(match.objectives_mask_team0, ECitadelTeamObjective.k_eCitadelTeamObjective_TitanShieldGenerator_2);
            case Teams.Team1:
                return ObjectiveAlive(match.objectives_mask_team1, ECitadelTeamObjective.k_eCitadelTeamObjective_TitanShieldGenerator_2);
        }

        return false;
    }

    public static int Calculate(CMsgDevMatchInfo match)
    {
        // Team 0 Conditions
        if (TitanAlive(match, Teams.Team0) && !Shrine1Alive(match, Teams.Team0) && !Shrine2Alive(match, Teams.Team0))
            return 2;
        if (TitanAlive(match, Teams.Team0) && Shrine1Alive(match, Teams.Team0) && !Shrine2Alive(match, Teams.Team0))
            return 1;
        if (TitanAlive(match, Teams.Team0) && !Shrine1Alive(match, Teams.Team0) && Shrine2Alive(match, Teams.Team0))
            return 1;

        // Team 1 Conditions
        if (TitanAlive(match, Teams.Team1) && !Shrine1Alive(match, Teams.Team1) && !Shrine2Alive(match, Teams.Team1))
            return 2;
        if (TitanAlive(match, Teams.Team1) && Shrine1Alive(match, Teams.Team1) && !Shrine2Alive(match, Teams.Team1))
            return 1;
        if (TitanAlive(match, Teams.Team1) && !Shrine1Alive(match, Teams.Team1) && Shrine2Alive(match, Teams.Team1))
            return 1;

        return 0;
    }
}
