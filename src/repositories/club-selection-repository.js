import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockClubSelection } from "../data/mock-data.js";

let localSelection = null;

export async function getMyClubSelection(tournamentId) {
  if (!hasSupabaseConfig) return localSelection ?? mockClubSelection;

  const { data, error } = await supabase.rpc("get_my_club_selection", {
    target_tournament_id: tournamentId
  });

  if (error) {
    throw new Error(`Kunne ikke hente klubbvalget ditt: ${error.message}`);
  }

  return data?.[0] ?? null;
}

export async function saveClubSelection(tournamentId, teamId) {
  if (!hasSupabaseConfig) {
    localSelection = { team_id: teamId, locked_at: null };
    return localSelection;
  }

  const { data, error } = await supabase.rpc("save_club_selection", {
    target_tournament_id: tournamentId,
    target_team_id: teamId
  });

  if (error) throw new Error(error.message);
  return data;
}
