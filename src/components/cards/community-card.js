import { SectionHeading } from "../ui/section-heading.js";

function bar(label, value, type = "") {
  return `
    <div class="prediction">
      <span>${label}</span>
      <div><i class="${type}" style="width:${value}%"></i></div>
      <strong>${value}%</strong>
    </div>
  `;
}

export function CommunityCard(rows) {
  return `
    <section class="panel">
      ${SectionHeading({ eyebrow: "Fellesskapet", title: "Folkets tips" })}
      <div class="community-list">
        ${rows
          .map(
            (row) => `
              <article class="community-card">
                <div class="community-card__title">
                  <strong>${row.home_team} – ${row.away_team}</strong>
                  <span>Mest tippet: ${row.common_score}</span>
                </div>
                ${bar("H", row.home_pct)}
                ${bar("U", row.draw_pct, "draw")}
                ${bar("B", row.away_pct, "away")}
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
