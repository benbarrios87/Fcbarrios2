import { SectionHeading } from "../ui/section-heading.js";
import { countryCodeToFlag } from "../../utils/flag.js";

function bar(label, value, type = "") {
  return `
    <div class="prediction">
      <span>${label}</span>
      <div>
        <i class="${type}" style="width:${value}%"></i>
      </div>
      <strong>${value}%</strong>
    </div>
  `;
}

function hiddenCard(row) {
  return `
    <article class="community-card community-card--locked">
      <div class="community-card__title">
        <strong>${countryCodeToFlag(row.home_country_code)} ${row.home_team} – ${row.away_team} ${countryCodeToFlag(row.away_country_code)}</strong>
        <span>🔒 Skjult</span>
      </div>

      <div class="community-locked-copy">
        Lever ditt eget tips først for å se hva resten av gjengen tror.
      </div>
    </article>
  `;
}

function visibleCard(row) {
  return `
    <article class="community-card">
      <div class="community-card__title">
        <strong>${countryCodeToFlag(row.home_country_code)} ${row.home_team} – ${row.away_team} ${countryCodeToFlag(row.away_country_code)}</strong>
        <span>
          ${
            row.common_score
              ? `Mest tippet: ${row.common_score}`
              : `${row.total_count} tips`
          }
        </span>
      </div>

      ${bar("H", row.home_pct)}
      ${bar("U", row.draw_pct, "draw")}
      ${bar("B", row.away_pct, "away")}

      <small class="community-card__count">
        Basert på ${row.total_count} tips
      </small>
    </article>
  `;
}

export function CommunityCard(rows) {
  return `
    <section class="panel">
      ${SectionHeading({
        eyebrow: "Fellesskapet",
        title: "Folkets tips"
      })}

      ${
        rows.length
          ? `
            <div class="community-list">
              ${rows
                .map((row) =>
                  row.is_visible ? visibleCard(row) : hiddenCard(row)
                )
                .join("")}
            </div>
          `
          : `
            <div class="home-empty-state">
              <span>🐑</span>
              <strong>Folkets tips kommer</strong>
              <small>
                Fordelingen vises når spillerne begynner å levere tips.
              </small>
            </div>
          `
      }
    </section>
  `;
}
