import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockMatches } from "../data/mock-data.js";

function normalizeTeamName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function enrichMatchesWithCountryCodes(matches, teams) {
  const byName = new Map();
  const byCode = new Map();

  (teams || []).forEach((team) => {
    const countryCode = String(team.country_code || "").trim().toUpperCase();
    if (!countryCode) return;

    [team.name, team.short_name].forEach((name) => {
      const key = normalizeTeamName(name);
      if (key) byName.set(key, countryCode);
    });

    const code = String(team.code || "").trim().toUpperCase();
    if (code) byCode.set(code, countryCode);
  });

  const findCode = (teamName) => {
    const value = String(teamName || "").trim();
    return byName.get(normalizeTeamName(value)) || byCode.get(value.toUpperCase()) || "";
  };

  return (matches || []).map((match) => ({
    ...match,
    home_country_code: match.home_country_code || findCode(match.home_team),
    away_country_code: match.away_country_code || findCode(match.away_team)
  }));
}

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

  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] = await Promise.all([
    query,
    supabase
      .from("teams")
      .select("code,name,short_name,country_code")
      .eq("tournament_id", tournamentId)
  ]);

  if (matchesError) throw new Error(`Kunne ikke hente kampene: ${matchesError.message}`);

  // Kampene skal fortsatt fungere dersom lagtabellen ikke kan leses.
  if (teamsError) return matches ?? [];

  return enrichMatchesWithCountryCodes(matches ?? [], teams ?? []);
}
