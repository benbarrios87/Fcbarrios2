/**
 * Avgjør om en turnering er en "Know Your Club"-type konkurranse
 * (velg klubb, tipp kun den ene kampen) i motsetning til en vanlig
 * mesterskaps-turnering (VM/EM, alle kamper i runden).
 *
 * Brukes til å la /, /tips og /leaderboard automatisk vise riktig
 * opplevelse for HVILKEN SOM HELST aktiv turnering — appen viser kun
 * én turnering om gangen, styrt av VITE_ACTIVE_TOURNAMENT_SLUG.
 */
export function isClubChallenge(tournament) {
  return tournament?.settings?.format === "club_challenge";
}
