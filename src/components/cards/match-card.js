import { formatKickoff } from "../../utils/format.js";

function Tier({ tier }) {
  return `<span class="tier tier--${tier}">T${tier}</span>`;
}

export function MatchCard(match) {
  const hasTip =
    match.user_home_tip !== null &&
    match.user_home_tip !== undefined &&
    match.user_away_tip !== null &&
    match.user_away_tip !== undefined;

  return `
    <article class="match-card">
      <div class="match-card__meta">
        <span>${match.round}</span>
        <time>${formatKickoff(match.kickoff_at)}</time>
      </div>
      <div class="match-card__teams">
        <div>${Tier({ tier: match.home_tier })}<strong>${match.home_team}</strong></div>
        <span>–</span>
        <div><strong>${match.away_team}</strong>${Tier({ tier: match.away_tier })}</div>
      </div>
      <div class="match-card__tip">
        <span>Ditt tips</span>
        <strong>${hasTip ? `${match.user_home_tip} – ${match.user_away_tip}` : "Mangler"}</strong>
        <small>${hasTip ? `Maks ${match.max_points} poeng` : "Legg inn før fristen"}</small>
      </div>
    </article>
  `;
}
