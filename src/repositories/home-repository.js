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
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId),

    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "finished")
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

function mergeMatchesAndPredictions(matches, predictions) {
  const predictionMap = new Map(
    predictions.map((prediction) => [prediction.match_id, prediction])
  );

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
    return {
      leaderboard: mockLeaderboard,
      matches: mockMatches,
      news: mockNews,
      community: mockCommunity.map((item) => ({
        ...item,
        is_visible: true,
        total_count: 12
      })),
      participantCount: 64,
      matchCounts: {
        total: mockMatches.length,
        finished: 0
      }
    };
  }

  const [
    leaderboardResult,
    matchesResult,
    newsResult,
    participantCount,
    matchCounts,
    predictions,
    community
  ] = await Promise.all([
    supabase
      .from("leaderboard_view")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("rank")
      .limit(5),

    supabase
      .from("matches")
      .select(`
        id,
        tournament_id,
        round_id,
        round,
        match_order,
        home_team,
        away_team,
        home_tier,
        away_tier,
        kickoff_at,
        tipping_closes_at,
        status
      `)
      .eq("tournament_id", tournamentId)
      .in("status", ["scheduled", "live"])
      .order("kickoff_at")
      .limit(4),

    supabase
      .from("announcements")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(4),

    getRealParticipantCount(tournamentId),
    getRealMatchCounts(tournamentId),
    getMyPredictions(tournamentId),
    getCommunityPredictions(tournamentId, 4)
  ]);

  const error =
    leaderboardResult.error ||
    matchesResult.error ||
    newsResult.error;

  if (error) {
    throw new Error(`Kunne ikke hente forsiden: ${error.message}`);
  }

  return {
    leaderboard: leaderboardResult.data ?? [],
    matches: mergeMatchesAndPredictions(
      matchesResult.data ?? [],
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
    matchCounts
  };
}
