import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";

const mockHallOfFame = [
  {
    player_id: "mock-1",
    name: "Edward Eikland",
    tournaments_played: 4,
    titles: 1,
    podiums: 2,
    best_finish: 1,
    average_finish: 6.25,
    total_correct_predictions: 17,
    average_percentile: 64.58
  },
  {
    player_id: "mock-2",
    name: "Lars Haraldsen",
    tournaments_played: 5,
    titles: 1,
    podiums: 2,
    best_finish: 1,
    average_finish: 5.20,
    total_correct_predictions: 29,
    average_percentile: 73.91
  },
  {
    player_id: "mock-3",
    name: "Mattias Andersson",
    tournaments_played: 3,
    titles: 1,
    podiums: 3,
    best_finish: 1,
    average_finish: 6.00,
    total_correct_predictions: 13,
    average_percentile: 67.31
  }
];

const mockHistory = [
  {
    player_id: "mock-1",
    player_name: "Kristoffer Eckhoff",
    tournament_slug: "euro-2016",
    tournament_name: "EM 2016",
    year: 2016,
    competition_type: "EM",
    final_rank: 1,
    field_size: 15,
    correct_predictions: 4,
    is_champion: true
  },
  {
    player_id: "mock-2",
    player_name: "Ørjan Knutsen",
    tournament_slug: "world-cup-2018",
    tournament_name: "VM 2018",
    year: 2018,
    competition_type: "VM",
    final_rank: 1,
    field_size: 17,
    correct_predictions: null,
    is_champion: true
  },
  {
    player_id: "mock-3",
    player_name: "Edward Eikland",
    tournament_slug: "euro-2020",
    tournament_name: "EM 2020",
    year: 2021,
    competition_type: "EM",
    final_rank: 1,
    field_size: 21,
    correct_predictions: 7,
    is_champion: true
  },
  {
    player_id: "mock-4",
    player_name: "Mattias Andersson",
    tournament_slug: "world-cup-2022",
    tournament_name: "VM 2022",
    year: 2022,
    competition_type: "VM",
    final_rank: 1,
    field_size: 14,
    correct_predictions: 10,
    is_champion: true
  },
  {
    player_id: "mock-5",
    player_name: "Lars Haraldsen",
    tournament_slug: "euro-2024",
    tournament_name: "EM 2024",
    year: 2024,
    competition_type: "EM",
    final_rank: 1,
    field_size: 11,
    correct_predictions: 11,
    is_champion: true
  }
];

export async function getHallOfFame() {
  if (!hasSupabaseConfig) return mockHallOfFame;

  const { data, error } = await supabase
    .from("hall_of_fame_view")
    .select("*")
    .order("titles", { ascending: false })
    .order("podiums", { ascending: false })
    .order("average_finish", { ascending: true });

  if (error) {
    throw new Error(`Kunne ikke hente Hall of Fame: ${error.message}`);
  }

  return data ?? [];
}

export async function getCareerHistory() {
  if (!hasSupabaseConfig) return mockHistory;

  const { data, error } = await supabase
    .from("career_history_view")
    .select("*")
    .order("year", { ascending: false })
    .order("final_rank", { ascending: true });

  if (error) {
    throw new Error(`Kunne ikke hente historikken: ${error.message}`);
  }

  return data ?? [];
}
