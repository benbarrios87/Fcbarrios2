import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { appConfig } from "../config/app-config.js";
import { mockTournament } from "../data/mock-data.js";

export async function getActiveTournament() {
  if (!hasSupabaseConfig) return mockTournament;

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", appConfig.activeTournamentSlug)
    .single();

  if (error) throw new Error(`Kunne ikke hente turneringen: ${error.message}`);
  return data;
}
