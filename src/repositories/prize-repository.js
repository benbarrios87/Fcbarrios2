import { supabase } from "../services/supabase-client.js";

export async function getSidePotOverview(tournamentId) {
  const { data, error } = await supabase.rpc("get_side_pot_overview", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke hente premiepottene: ${error.message}`);
  return data ?? [];
}

export async function calculateSidePotWinners(tournamentId) {
  const { data, error } = await supabase.rpc("calculate_side_pot_winners", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke beregne premievinnere: ${error.message}`);
  return data ?? [];
}

export async function updatePrizePoolSettings({
  tournamentId,
  poolCode,
  distribution,
  isActive
}) {
  const { error } = await supabase.rpc("update_prize_pool_settings", {
    target_tournament_id: tournamentId,
    target_pool_code: poolCode,
    target_distribution: distribution.map(Number),
    target_is_active: isActive
  });

  if (error) throw new Error(error.message);
}
