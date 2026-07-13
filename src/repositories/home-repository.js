import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import {
  mockLeaderboard,
  mockMatches,
  mockNews,
  mockCommunity
} from "../data/mock-data.js";

export async function getHomeData(tournamentId) {
  if (!hasSupabaseConfig) {
    return {
      leaderboard: mockLeaderboard,
      matches: mockMatches,
      news: mockNews,
      community: mockCommunity
    };
  }

  const [leaderboardResult, matchesResult, newsResult] = await Promise.all([
    supabase
      .from("leaderboard_view")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("rank")
      .limit(5),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .gte("kickoff_at", new Date().toISOString())
      .order("kickoff_at")
      .limit(4),
    supabase
      .from("announcements")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(4)
  ]);

  const error =
    leaderboardResult.error || matchesResult.error || newsResult.error;

  if (error) throw new Error(`Kunne ikke hente forsiden: ${error.message}`);

  return {
    leaderboard: leaderboardResult.data ?? [],
    matches: matchesResult.data ?? [],
    news: (newsResult.data ?? []).map((item) => ({
      id: item.id,
      icon: item.icon || "📣",
      tag: item.category || "Siste nytt",
      title: item.title,
      body: item.body,
      type: item.category || "stat"
    })),
    community: []
  };
}
