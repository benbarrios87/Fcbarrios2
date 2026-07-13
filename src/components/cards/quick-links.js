const links = [
  ["🧠", "Mine tips", "Se hele innleveringen og kampstatus.", "/tips"],
  ["🏆", "Leaderboard", "Stillingen, form og poengdetaljer.", "/leaderboard"],
  ["📊", "Statsrommet", "Treffprosent, outsidere og rekorder.", "/stats"],
  ["📚", "Historiebøkene", "Mestere, karrierer og Hall of Fame.", "/history"],
  ["👤", "Min FUT-profil", "Kort, badges og historikk.", "/profile"]
];

export function QuickLinks() {
  return `
    <section class="quick-links quick-links--history">
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
