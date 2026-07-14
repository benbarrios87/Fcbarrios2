import { supabase } from "../services/supabase-client.js";

export async function getAdminMatches(tournamentId) {
  const { data, error } = await supabase
    .from("match_scoring_summary_view")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("kickoff_at");

  if (error) {
    throw new Error(`Kunne ikke hente kampene: ${error.message}`);
  }

  return data ?? [];
}

export async function saveMatchResult({
  matchId,
  homeScore,
  awayScore,
  finished = true
}) {
  const cleanHome = Number(homeScore);
  const cleanAway = Number(awayScore);

  if (!Number.isInteger(cleanHome) || !Number.isInteger(cleanAway)) {
    throw new Error("Resultatet må være hele tall.");
  }

  const { data, error } = await supabase.rpc("set_match_result", {
    target_match_id: matchId,
    final_home_score: cleanHome,
    final_away_score: cleanAway,
    mark_finished: finished
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
