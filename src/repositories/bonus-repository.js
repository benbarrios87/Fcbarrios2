import { supabase } from "../services/supabase-client.js";

export async function getBonusGames(tournamentId) {
  const { data, error } = await supabase
    .from("bonus_games")
    .select(`
      *,
      candidates:bonus_candidates(
        id,
        candidate_type,
        reference_id,
        label,
        tier,
        multiplier,
        display_order,
        metadata,
        is_active
      )
    `)
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("created_at");

  if (error) {
    throw new Error(`Kunne ikke hente bonusspillene: ${error.message}`);
  }

  return (data ?? []).map((game) => ({
    ...game,
    candidates: (game.candidates ?? [])
      .filter((candidate) => candidate.is_active)
      .sort((a, b) =>
        a.display_order - b.display_order ||
        a.label.localeCompare(b.label, "no")
      )
  }));
}

export async function getMyBonusEntries(tournamentId) {
  const { data, error } = await supabase.rpc("get_my_bonus_entries", {
    target_tournament_id: tournamentId
  });

  if (error) {
    throw new Error(`Kunne ikke hente bonusvalgene: ${error.message}`);
  }

  return data ?? [];
}

export async function saveBonusEntries(gameId, entries) {
  const { data, error } = await supabase.rpc("save_bonus_entries", {
    target_bonus_game_id: gameId,
    entries_json: entries
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateBonusGame(gameId, updates) {
  const { data, error } = await supabase
    .from("bonus_games")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    throw new Error(`Kunne ikke oppdatere bonusspillet: ${error.message}`);
  }

  return data;
}
