import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockCommunity } from "../data/mock-data.js";

export async function getCommunityPredictions(tournamentId, limit = 4) {
  if (!hasSupabaseConfig) {
    return mockCommunity.map((item) => ({
      ...item,
      is_visible: true,
      total_count: 12
    }));
  }

  const { data, error } = await supabase.rpc("get_community_predictions", {
    target_tournament_id: tournamentId,
    max_matches: limit
  });

  if (error) {
    throw new Error(`Kunne ikke hente Folkets tips: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.match_id,
    home_team: item.home_team,
    away_team: item.away_team,
    kickoff_at: item.kickoff_at,
    home_pct: Number(item.home_pct || 0),
    draw_pct: Number(item.draw_pct || 0),
    away_pct: Number(item.away_pct || 0),
    common_score: item.common_score,
    total_count: Number(item.total_count || 0),
    is_visible: Boolean(item.is_visible)
  }));
}
