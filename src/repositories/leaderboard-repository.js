import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockLeaderboard } from "../data/mock-data.js";

export async function getLeaderboard(tournamentId) {
  if (!hasSupabaseConfig) return mockLeaderboard;

  const { data, error } = await supabase.rpc("get_leaderboard_with_buy_in", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke hente topplisten: ${error.message}`);
  return data ?? [];
}
