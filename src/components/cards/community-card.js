import { SectionHeading } from "../ui/section-heading.js";

export function CommunityCard(rows) {
  return `
    <section class="panel">
      ${SectionHeading({
        eyebrow: "Fellesskapet",
        title: "Folkets tips"
      })}

      ${
        rows.length
          ? `<div class="community-list"></div>`
          : `
            <div class="home-empty-state">
              <span>🐑</span>
              <strong>Folkets tips kommer</strong>
              <small>
                Fordelingen vises når flere spillere har tippet de samme kampene.
              </small>
            </div>
          `
      }
    </section>
  `;
}
