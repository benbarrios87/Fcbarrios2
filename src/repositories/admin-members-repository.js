import { supabase } from "../services/supabase-client.js";

export async function getAdminMembers(tournamentId) {
  const { data, error } = await supabase.rpc("get_admin_members", {
    target_tournament_id: tournamentId
  });
  if (error) throw new Error(`Kunne ikke hente medlemmene: ${error.message}`);
  return data ?? [];
}

export async function searchPlayers(query) {
  if (!query || query.trim().length < 2) return [];

  const { data, error } = await supabase.rpc("admin_search_players", {
    search_query: query.trim()
  });
  if (error) throw new Error(`Kunne ikke søke etter spillere: ${error.message}`);
  return data ?? [];
}

export async function addMember(tournamentId, playerId, role = "player") {
  const { error } = await supabase.rpc("admin_add_member", {
    target_tournament_id: tournamentId,
    target_player_id: playerId,
    member_role: role
  });
  if (error) throw new Error(error.message);
}

export async function removeMember(tournamentId, playerId) {
  const { error } = await supabase.rpc("admin_remove_member", {
    target_tournament_id: tournamentId,
    target_player_id: playerId
  });
  if (error) throw new Error(error.message);
}

export async function createPlayer(displayName, email) {
  const { data, error } = await supabase.rpc("admin_create_player", {
    new_display_name: displayName,
    new_email: email || null
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function lockClubSelections(tournamentId) {
  const { data, error } = await supabase.rpc("lock_club_selections", {
    target_tournament_id: tournamentId
  });
  if (error) throw new Error(error.message);
  return data;
}
