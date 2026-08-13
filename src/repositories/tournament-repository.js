import { supabase, hasSupabaseConfig } from "../services/supabase-client.js";
import { appConfig } from "../config/app-config.js";
import { mockTournament, mockKnowYourClubTournament } from "../data/mock-data.js";

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

/**
 * Henter en turnering på slug, uavhengig av appConfig.activeTournamentSlug.
 * Brukt av Know Your Club-siden mens den lever som en "planning"-turnering
 * ved siden av den faktiske aktive turneringen (EM 2028).
 */
export async function getTournamentBySlug(slug) {
  if (!hasSupabaseConfig) return mockKnowYourClubTournament;

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw new Error(`Kunne ikke hente turneringen: ${error.message}`);
  return data;
}
