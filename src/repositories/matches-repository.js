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

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("nb-NO");
}

async function getTeamFlagMaps(tournamentId) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,short_name,country_code")
    .eq("tournament_id", tournamentId);

  if (error) throw new Error(`Kunne ikke hente lagflagg: ${error.message}`);

  const byId = new Map();
  const byName = new Map();

  for (const team of data ?? []) {
    if (team.id) byId.set(String(team.id), team.country_code || "");

    [team.name, team.short_name]
      .filter(Boolean)
      .forEach((name) => byName.set(normalizeName(name), team.country_code || ""));
  }

  return { byId, byName };
}

function addCountryCodes(match, maps) {
  return {
    ...match,
    home_country_code:
      maps.byId.get(String(match.home_team_id || "")) ||
      maps.byName.get(normalizeName(match.home_team)) ||
      "",
    away_country_code:
      maps.byId.get(String(match.away_team_id || "")) ||
      maps.byName.get(normalizeName(match.away_team)) ||
      ""
  };
}

export async function getMatchesForRound(tournamentId, roundId) {
  if (!hasSupabaseConfig) {
    const mockCountryCodes = {
      England: "GB",
      Italia: "IT",
      Norge: "NO",
      Nederland: "NL",
      Spania: "ES",
      Tyrkia: "TR",
      Danmark: "DK",
      Belgia: "BE"
    };

    return mockMatches.map((match, index) => ({
      ...match,
      home_country_code: mockCountryCodes[match.home_team] || "",
      away_country_code: mockCountryCodes[match.away_team] || "",
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
      home_team_id,
      away_team_id,
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

  const [{ data, error }, teamMaps] = await Promise.all([
    query,
    getTeamFlagMaps(tournamentId)
  ]);

  if (error) throw new Error(`Kunne ikke hente kampene: ${error.message}`);
  return (data ?? []).map((match) => addCountryCodes(match, teamMaps));
}
