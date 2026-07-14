import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";

const localPredictions = new Map();

export async function getMyPredictions(tournamentId) {
  if (!hasSupabaseConfig) return Array.from(localPredictions.values());

  const { data, error } = await supabase.rpc("get_my_predictions", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke hente tipsene dine: ${error.message}`);
  return data ?? [];
}

export async function savePrediction(matchId, homeScore, awayScore) {
  const cleanHome = Number(homeScore);
  const cleanAway = Number(awayScore);

  if (!Number.isInteger(cleanHome) || !Number.isInteger(cleanAway)) {
    throw new Error("Begge resultatfeltene må være hele tall.");
  }

  if (cleanHome < 0 || cleanAway < 0) {
    throw new Error("Resultatet kan ikke være negativt.");
  }

  if (!hasSupabaseConfig) {
    const prediction = {
      prediction_id: `mock-${matchId}`,
      match_id: matchId,
      home_score: cleanHome,
      away_score: cleanAway,
      updated_at: new Date().toISOString()
    };

    localPredictions.set(matchId, prediction);
    return prediction;
  }

  const { data, error } = await supabase.rpc("save_prediction", {
    target_match_id: matchId,
    predicted_home_score: cleanHome,
    predicted_away_score: cleanAway
  });

  if (error) throw new Error(error.message);
  return data;
}
