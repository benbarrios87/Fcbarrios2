import { supabase } from "../services/supabase-client.js";

export async function getAdminTeams(tournamentId) {
  const { data, error } = await supabase.rpc("get_admin_teams", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke hente lagene: ${error.message}`);
  return data ?? [];
}

export async function saveTournamentTeam({
  tournamentId,
  teamId = null,
  code,
  name,
  shortName,
  tier,
  countryCode,
  groupName,
  rtgMultiplier = 1,
  competitionStatus = "not_started"
}) {
  const { data, error } = await supabase.rpc("upsert_tournament_team", {
    target_tournament_id: tournamentId,
    target_team_id: teamId,
    target_code: code,
    target_name: name,
    target_short_name: shortName,
    target_tier: Number(tier),
    target_country_code: countryCode,
    target_group_name: groupName,
    target_rtg_multiplier: Number(rtgMultiplier || 1),
    target_competition_status: competitionStatus
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function setTournamentTeamActive({
  tournamentId,
  teamId,
  isActive
}) {
  const { error } = await supabase.rpc("set_tournament_team_active", {
    target_tournament_id: tournamentId,
    target_team_id: teamId,
    target_is_active: isActive
  });

  if (error) throw new Error(error.message);
}
