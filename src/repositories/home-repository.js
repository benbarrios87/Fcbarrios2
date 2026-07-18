import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import {
  mockLeaderboard,
  mockMatches,
  mockNews,
  mockCommunity
} from "../data/mock-data.js";
import { getCommunityPredictions } from "./community-repository.js";

async function getRealParticipantCount(tournamentId) {
  const { count, error } = await supabase
    .from("tournament_members")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("Kunne ikke hente deltakerantall:", error);
    return 0;
  }

  return count ?? 0;
}

async function getRealMatchCounts(tournamentId) {
  const [totalResult, finishedResult] = await Promise.all([
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("tournament_id", tournamentId),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("tournament_id", tournamentId).eq("status", "finished")
  ]);

  return {
    total: totalResult.count ?? 0,
    finished: finishedResult.count ?? 0
  };
}

async function getMyPredictions(tournamentId) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return [];

  const { data, error } = await supabase.rpc("get_my_predictions", {
    target_tournament_id: tournamentId
  });

  if (error) {
    console.error("Kunne ikke hente egne tips:", error);
    return [];
  }

  return data ?? [];
}

async function getParticipants(tournamentId) {
  const { data, error } = await supabase.rpc("get_home_participants", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke hente deltakerlisten: ${error.message}`);
  return data ?? [];
}

async function getPrizePools(tournamentId) {
  const { data, error } = await supabase.rpc("get_home_prize_pools", {
    target_tournament_id: tournamentId
  });

  if (error) throw new Error(`Kunne ikke hente premiepottene: ${error.message}`);
  return data ?? [];
}

function mergeMatchesAndPredictions(matches, predictions) {
  const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));

  return matches.map((match) => {
    const prediction = predictionMap.get(match.id);
    return {
      ...match,
      user_home_tip: prediction?.home_score ?? null,
      user_away_tip: prediction?.away_score ?? null
    };
  });
}

export async function getHomeData(tournamentId) {
  if (!hasSupabaseConfig) {
    const mockParticipants = mockLeaderboard.map((player, index) => ({
      player_id: player.id,
      display_name: player.name,
      avatar_url: player.avatar_url,
      leaderboard_rank: player.rank,
      points: player.points,
      buy_in_tier: [800, 500, 250][index % 3],
      is_paid: index !== 4
    }));

    const mockPools = [
      { pool_code: "gold", pool_name: "Gull", minimum_tier: 800, eligible_paid_players: 2, prize_pool: 600, first_prize: 360, second_prize: 150, third_prize: 90 },
      { pool_code: "silver", pool_name: "Sølv", minimum_tier: 500, eligible_paid_players: 4, prize_pool: 1000, first_prize: 600, second_prize: 250, third_prize: 150 },
      { pool_code: "bronze", pool_name: "Bronse", minimum_tier: 250, eligible_paid_players: 5, prize_pool: 1250, first_prize: 750, second_prize: 313, third_prize: 187 }
    ];

    return {
      leaderboard: mockLeaderboard,
      matches: mockMatches,
      news: mockNews,
      community: mockCommunity.map((item) => ({ ...item, is_visible: true, total_count: 12 })),
      participantCount: mockParticipants.length,
      paidCount: mockParticipants.filter((item) => item.is_paid).length,
      participants: mockParticipants,
      prizePools: mockPools,
      totalPrizePool: mockPools.reduce((sum, pool) => sum + pool.prize_pool, 0),
      matchCounts: { total: mockMatches.length, finished: 0 }
    };
  }

  const [
    leaderboardResult,
    matchesResult,
    newsResult,
    participantCount,
    matchCounts,
    predictions,
    community,
    participants,
    prizePools
  ] = await Promise.all([
    supabase.from("leaderboard_view").select("*").eq("tournament_id", tournamentId).order("rank").limit(5),
    supabase.from("matches").select(`
      id,tournament_id,round_id,round,match_order,home_team_id,away_team_id,home_team,away_team,
      home:teams!matches_home_team_id_fkey(country_code),away:teams!matches_away_team_id_fkey(country_code),
      home_tier,away_tier,kickoff_at,tipping_closes_at,status
    `).eq("tournament_id", tournamentId).in("status", ["scheduled", "live"]).order("kickoff_at").limit(4),
    supabase.from("announcements").select("*").eq("tournament_id", tournamentId).eq("is_published", true).order("published_at", { ascending: false }).limit(4),
    getRealParticipantCount(tournamentId),
    getRealMatchCounts(tournamentId),
    getMyPredictions(tournamentId),
    getCommunityPredictions(tournamentId, 4),
    getParticipants(tournamentId),
    getPrizePools(tournamentId)
  ]);

  const error = leaderboardResult.error || matchesResult.error || newsResult.error;
  if (error) throw new Error(`Kunne ikke hente forsiden: ${error.message}`);

  return {
    leaderboard: leaderboardResult.data ?? [],
    matches: mergeMatchesAndPredictions(
      (matchesResult.data ?? []).map((match) => ({
        ...match,
        home_country_code: match.home?.country_code || "",
        away_country_code: match.away?.country_code || ""
      })),
      predictions
    ),
    news: (newsResult.data ?? []).map((item) => ({
      id: item.id,
      icon: item.icon || "📣",
      tag: item.category || "Siste nytt",
      title: item.title,
      body: item.body,
      type: item.category || "stat"
    })),
    community,
    participantCount,
    paidCount: participants.filter((item) => item.is_paid).length,
    participants,
    prizePools,
    totalPrizePool: prizePools.reduce((sum, pool) => sum + Number(pool.prize_pool || 0), 0),
    matchCounts
  };
}
