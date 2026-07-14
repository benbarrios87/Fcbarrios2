import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockProfile } from "../data/mock-data.js";

function calculateOverall(profile) {
  const titles = Number(profile.titles || 0);
  const podiums = Number(profile.podiums || 0);
  const tournaments = Number(profile.tournaments_played || 0);
  const percentile = Number(profile.average_percentile || 0);
  const currentPoints = Number(profile.current?.points || 0);

  const score =
    64 +
    Math.min(10, titles * 4) +
    Math.min(8, podiums * 1.5) +
    Math.min(8, tournaments) +
    Math.min(7, percentile / 15) +
    Math.min(3, currentPoints / 50);

  return Math.max(65, Math.min(99, Math.round(score)));
}

function buildAchievements(profile) {
  const achievements = [];

  if (Number(profile.titles) > 0) {
    achievements.push({
      icon: "🏆",
      name: profile.titles === 1 ? "Mester" : "Dynasti",
      description: `${profile.titles} FC Barrios-tittel${profile.titles === 1 ? "" : "er"}`
    });
  }

  if (Number(profile.podiums) >= 2) {
    achievements.push({
      icon: "🥇",
      name: "Podiejeger",
      description: `${profile.podiums} pallplasser`
    });
  }

  if (Number(profile.tournaments_played) >= 5) {
    achievements.push({
      icon: "🧱",
      name: "Veteran",
      description: `${profile.tournaments_played} mesterskap`
    });
  }

  if (Number(profile.average_percentile) >= 70) {
    achievements.push({
      icon: "📈",
      name: "Elitesjiktet",
      description: `${Math.round(profile.average_percentile)}. persentil i snitt`
    });
  }

  if (!achievements.length) {
    achievements.push({
      icon: "⚽",
      name: "Karrieren har startet",
      description: "Nye bragder låses opp automatisk"
    });
  }

  return achievements;
}

function normalizeProfile(data) {
  const career = Array.isArray(data.career) ? data.career : [];
  const current = data.current || {};

  return {
    id: data.player_id,
    name: data.name,
    overall: calculateOverall(data),
    rank: current.rank,
    points: Number(current.points || 0),
    accuracy: Math.round(Number(data.average_percentile || 0)),
    form: Math.min(99, Math.round(55 + Number(current.form_points || 0) * 2)),
    underdogs: 72,
    titles: Number(data.titles || 0),
    podiums: Number(data.podiums || 0),
    tournamentsPlayed: Number(data.tournaments_played || 0),
    bestFinish: data.best_finish,
    averageFinish: data.average_finish,
    totalCorrectPredictions: Number(data.total_correct_predictions || 0),
    averagePercentile: Number(data.average_percentile || 0),
    exact_hits: Number(current.exact_hits || 0),
    achievements: buildAchievements(data),
    history: career.map((item) => ({
      tournament: item.tournament,
      year: item.year,
      rank: item.rank,
      fieldSize: item.field_size,
      correctPredictions: item.correct_predictions,
      points: item.points,
      isChampion: item.is_champion,
      percentile: item.percentile
    }))
  };
}

export async function getProfile(playerId, _tournamentId) {
  if (!hasSupabaseConfig || !playerId) return mockProfile;

  const { data, error } = await supabase.rpc("get_public_player_profile", {
    target_player_id: playerId,
    target_tournament_slug:
      import.meta.env.VITE_ACTIVE_TOURNAMENT_SLUG || "euro-2028"
  });

  if (error) {
    throw new Error(`Kunne ikke hente profilen: ${error.message}`);
  }

  return normalizeProfile(data);
}
