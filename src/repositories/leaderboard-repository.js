import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockLeaderboard } from "../data/mock-data.js";

export async function getLeaderboard(tournamentId) {
  if (!hasSupabaseConfig) return mockLeaderboard;

  const { data, error } = await supabase
    .from("leaderboard_view")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("rank");

  if (error) throw new Error(`Kunne ikke hente topplisten: ${error.message}`);
  return data ?? [];
}
