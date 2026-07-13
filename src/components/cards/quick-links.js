const links = [
  ["🧠", "Mine tips", "Se hele innleveringen og kampstatus.", "/tips"],
  ["🏆", "Leaderboard", "Stillingen, form og poengdetaljer.", "/leaderboard"],
  ["📊", "Statsrommet", "Treffprosent, outsidere og rekorder.", "/stats"],
  ["👤", "Min FUT-profil", "Kort, badges og historikk.", "/profile"]
];

export function QuickLinks() {
  return `
    <section class="quick-links">
      ${links
        .map(
          ([icon, title, text, href]) => `
            <a href="${href}" data-link>
              <span>${icon}</span>
              <div><strong>${title}</strong><small>${text}</small></div>
              <b>→</b>
            </a>
          `
        )
        .join("")}
    </section>
  `;
}
