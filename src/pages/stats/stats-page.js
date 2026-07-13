export async function StatsPage() {
  const stats = [
    ["82 %", "Treffprosent"],
    ["17", "Eksakte resultater"],
    ["8,4", "Expected Points"],
    ["4", "Outsidertreff"]
  ];

  return `
    <div class="page">
      <header class="page-header">
        <span>Analyse</span>
        <h1>Statsrommet</h1>
        <p>Grunnflaten for langt mer avansert statistikk.</p>
      </header>
      <section class="stat-grid">
        ${stats.map(([value, label]) => `<article><strong>${value}</strong><span>${label}</span></article>`).join("")}
      </section>
      <section class="panel chart-placeholder">
        <div class="section-heading"><div><span>Utvikling</span><h2>Poeng per runde</h2></div></div>
        <div class="fake-chart">${[32, 48, 41, 67, 58, 84, 72, 95].map((h) => `<i style="height:${h}%"></i>`).join("")}</div>
      </section>
    </div>
  `;
}
