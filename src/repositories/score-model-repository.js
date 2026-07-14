import { supabase } from "../services/supabase-client.js";

export async function getScoreModels(tournamentId) {
  const { data, error } = await supabase.from("score_models").select("*").eq("tournament_id", tournamentId).order("created_at");
  if (error) throw new Error(`Kunne ikke hente scoremodellene: ${error.message}`);
  return data ?? [];
}

export async function getScoreRules(modelId) {
  const { data, error } = await supabase.from("score_rules").select("stage,result_type,tier_difference,selection_type,points").eq("model_id", modelId);
  if (error) throw new Error(`Kunne ikke hente scoremodellen: ${error.message}`);
  return data ?? [];
}

export async function saveScoreRules(modelId, rows) {
  const { error } = await supabase.rpc("save_score_model_rows", { target_model_id: modelId, rows_json: rows });
  if (error) throw new Error(`Kunne ikke lagre scoremodellen: ${error.message}`);
}

export async function activateScoreModel(modelId) {
  const { error } = await supabase.rpc("set_active_score_model", { target_model_id: modelId });
  if (error) throw new Error(`Kunne ikke aktivere modellen: ${error.message}`);
}

export async function createScoreModel({ tournamentId, name, tierCount, copyFromModelId }) {
  const { data, error } = await supabase.rpc("create_score_model", {
    target_tournament_id: tournamentId,
    model_name: name,
    model_tier_count: tierCount,
    copy_from_model_id: copyFromModelId
  });
  if (error) throw new Error(`Kunne ikke opprette modellen: ${error.message}`);
  return data;
}
