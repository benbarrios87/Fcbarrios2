import { supabase } from "../services/supabase-client.js";

export async function getAdminMatches(tournamentId) {
  const { data, error } = await supabase
    .from("match_scoring_summary_view")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("kickoff_at");
  if (error) throw new Error(`Kunne ikke hente kampene: ${error.message}`);
  return data ?? [];
}

export async function processMatchResult({ matchId, homeScore, awayScore }) {
  const home = Number(homeScore);
  const away = Number(awayScore);
  if (!Number.isInteger(home) || !Number.isInteger(away)) {
    throw new Error("Resultatet må være hele tall.");
  }
  const { data, error } = await supabase.rpc("process_match_result", {
    target_match_id: matchId,
    final_home_score: home,
    final_away_score: away
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminDashboard(tournamentId) {
  const { data, error } = await supabase.rpc("get_admin_dashboard", {
    target_tournament_id: tournamentId
  });
  if (error) throw new Error(`Kunne ikke hente adminstatus: ${error.message}`);
  return data ?? {};
}

export async function getRecentAdminJobs(tournamentId, limit = 8) {
  const { data, error } = await supabase
    .from("admin_jobs")
    .select("id,status,message,details,started_at,finished_at")
    .eq("tournament_id", tournamentId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Kunne ikke hente jobbloggen: ${error.message}`);
  return data ?? [];
}
