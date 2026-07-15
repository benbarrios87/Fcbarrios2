import { supabase } from "../services/supabase-client.js";

export async function updateTournamentStatus(tournamentId, status) {
  const { error } = await supabase.rpc("update_tournament_status", {
    target_tournament_id: tournamentId,
    target_status: status
  });

  if (error) throw new Error(error.message);
}
