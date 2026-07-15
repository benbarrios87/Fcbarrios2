import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockLeaderboard } from "../data/mock-data.js";

function enrichMockPlayer(player, index) {
  const tiers = [800, 500, 250, 800, 500];

  return {
    ...player,
    buy_in_tier: player.buy_in_tier ?? tiers[index % tiers.length],
    payment_status: player.payment_status ?? "paid",
    is_paid: player.is_paid ?? true,
    last_match_points: player.last_match_points ?? player.form_points ?? 0,
    difference_hits: player.difference_hits ?? 0,
    outcome_hits: player.outcome_hits ?? 0
  };
}

export async function getLeaderboard(tournamentId) {
  if (!hasSupabaseConfig) {
    return mockLeaderboard.map(enrichMockPlayer);
  }

  const { data, error } = await supabase.rpc("get_leaderboard_2", {
    target_tournament_id: tournamentId
  });

  if (error) {
    throw new Error(`Kunne ikke hente topplisten: ${error.message}`);
  }

  return data ?? [];
}
