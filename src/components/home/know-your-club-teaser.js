import { ClubBadge } from "../../utils/club-badge.js";

/**
 * Bro-kort fra forsiden inn til Know Your Club. Rendres uansett
 * hvilket home-mode (registration/live/finished) EM 2028 er i —
 * Know Your Club lever ved siden av, ikke inni, den aktive turneringen.
 */
export function KnowYourClubTeaser({ team } = {}) {
  return `
    <section class="kyc-teaser">
      <div class="kyc-teaser__badges">
        <span class="kyc-teaser__dot" style="--dot-color:#EF0107"></span>
        <span class="kyc-teaser__dot" style="--dot-color:#C8102E"></span>
        <span class="kyc-teaser__dot" style="--dot-color:#6CABDD"></span>
        <span class="kyc-teaser__dot" style="--dot-color:#034694"></span>
        <span class="kyc-teaser__dot" style="--dot-color:#132257"></span>
      </div>

      <div class="kyc-teaser__copy">
        <span class="eyebrow"><i></i>Ved siden av EM 2028</span>
        <h2>Know Your Club</h2>
        <p>
          Velg favorittklubben din i Premier League og tipp kun kampene
          til laget ditt — én kamp i uka, hele sesongen.
        </p>
      </div>

      ${
        team
          ? `
            <a class="kyc-teaser__cta kyc-teaser__cta--chosen" href="/know-your-club/tips" data-link>
              ${ClubBadge(team, 38)}
              <span>
                <strong>${team.short_name || team.name}</strong>
                <small>Se din neste kamp →</small>
              </span>
            </a>
          `
          : `
            <a class="button button--primary" href="/know-your-club" data-link>
              Velg din klubb →
            </a>
          `
      }
    </section>
  `;
}
