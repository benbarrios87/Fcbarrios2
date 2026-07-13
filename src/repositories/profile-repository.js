import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { mockProfile } from "../data/mock-data.js";

export async function getProfile(playerId, tournamentId) {
  if (!hasSupabaseConfig) return mockProfile;

  let query = supabase
    .from("player_profile_view")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (playerId) query = query.eq("player_id", playerId);
  else query = query.order("rank").limit(1);

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(`Kunne ikke hente profilen: ${error.message}`);
  return data ?? mockProfile;
}
