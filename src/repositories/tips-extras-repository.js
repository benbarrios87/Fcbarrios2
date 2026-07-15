import { supabase } from "../services/supabase-client.js";

export async function getActiveScoreRules(tournamentId) {
  const { data: model, error: modelError } = await supabase
    .from("score_models")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .maybeSingle();

  if (modelError) throw new Error(`Kunne ikke hente scoremodellen: ${modelError.message}`);
  if (!model) return [];

  const { data, error } = await supabase
    .from("score_rules")
    .select("stage,result_type,tier_difference,selection_type,points")
    .eq("model_id", model.id);

  if (error) throw new Error(`Kunne ikke hente poengreglene: ${error.message}`);
  return data ?? [];
}

export async function getMyMatchBonusPicks(tournamentId) {
  const { data, error } = await supabase.rpc("get_my_match_bonus_picks", {
    target_tournament_id: tournamentId
  });
  if (error) throw new Error(`Kunne ikke hente kampbonusene: ${error.message}`);
  return data ?? [];
}

export async function setMatchBonusPick(matchId, bonusCode, selected) {
  const { error } = await supabase.rpc("set_match_bonus_pick", {
    target_match_id: matchId,
    target_bonus_code: bonusCode,
    should_select: selected
  });
  if (error) throw new Error(error.message);
}

export function getPossiblePoints(match, prediction, rules) {
  if (prediction?.home_score == null || prediction?.away_score == null) return null;

  const homeTip = Number(prediction.home_score);
  const awayTip = Number(prediction.away_score);
  const homeTier = Number(match.home_tier || 1);
  const awayTier = Number(match.away_tier || 1);
  const tierDifference = Math.abs(homeTier - awayTier);
  const stage = match.scoring_stage || "group";

  let selectionType = "draw";
  if (homeTip > awayTip) selectionType = homeTier <= awayTier ? "favorite" : "underdog";
  if (awayTip > homeTip) selectionType = awayTier <= homeTier ? "favorite" : "underdog";

  const pointsFor = (resultType) => Number(
    rules.find((rule) =>
      rule.stage === stage &&
      rule.result_type === resultType &&
      Number(rule.tier_difference) === tierDifference &&
      rule.selection_type === selectionType
    )?.points || 0
  );

  return {
    selectionType,
    outcome: pointsFor("outcome"),
    difference: pointsFor("difference"),
    exact: pointsFor("exact")
  };
}
