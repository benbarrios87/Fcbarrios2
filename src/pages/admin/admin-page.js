export async function AdminPage() {
  return `
    <div class="page">
      <header class="page-header">
        <span>Beskyttet område</span>
        <h1>Admin</h1>
        <p>Dette kobles til Supabase Auth og rollebaserte RLS-regler.</p>
      </header>
      <section class="admin-grid">
        ${[
          ["📣", "Nyheter"],
          ["🔓", "Åpne/lukke runder"],
          ["⚽", "Kamper og resultater"],
          ["🧨", "Road to Glory"],
          ["🏆", "Premier"],
          ["👥", "Spillere"]
        ].map(([icon, title]) => `<article><span>${icon}</span><strong>${title}</strong><small>Kommer i admin-sprinten</small></article>`).join("")}
      </section>
    </div>
  `;
}
