export const appConfig = Object.freeze({
  activeTournamentSlug:
    import.meta.env.VITE_ACTIVE_TOURNAMENT_SLUG || "euro-2028",
  appName: "FC Barrios",
  mockMode:
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
});
