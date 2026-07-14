import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockMatches } from "../data/mock-data.js";

export async function getTournamentRounds(tournamentId) {
  if (!hasSupabaseConfig) {
    return [{
      id: "mock-round-1",
      slug: "group-round-1",
      name: "Gruppespill · Runde 1",
      stage: "group",
      display_order: 1,
      status: "open"
    }];
  }

  const { data, error } = await supabase
    .from("tournament_rounds")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("display_order");

  if (error) throw new Error(`Kunne ikke hente rundene: ${error.message}`);
  return data ?? [];
}

export async function getMatchesForRound(tournamentId, roundId) {
  if (!hasSupabaseConfig) {
    return mockMatches.map((match, index) => ({
      ...match,
      round_id: "mock-round-1",
      match_order: index + 1,
      status: "scheduled",
      tipping_closes_at: match.kickoff_at
    }));
  }

  let query = supabase
    .from("matches")
    .select(`
      id,
      tournament_id,
      round_id,
      external_id,
      round,
      match_order,
      home_team,
      away_team,
      home_tier,
      away_tier,
      kickoff_at,
      tipping_opens_at,
      tipping_closes_at,
      home_score,
      away_score,
      status
    `)
    .eq("tournament_id", tournamentId)
    .order("match_order");

  if (roundId) query = query.eq("round_id", roundId);

  const { data, error } = await query;

  if (error) throw new Error(`Kunne ikke hente kampene: ${error.message}`);
  return data ?? [];
}
