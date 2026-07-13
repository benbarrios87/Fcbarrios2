export function StatusStrip(tournament) {
  return `
    <section class="status-strip">
      <article>
        <span>Deltakere</span>
        <strong>${tournament.participant_count ?? "–"}</strong>
      </article>
      <article>
        <span>Premiepool</span>
        <strong>${Number(tournament.prize_pool || 0).toLocaleString("no-NO")} kr</strong>
      </article>
      <article>
        <span>Status</span>
        <strong class="status-strip__live">Planlegging</strong>
      </article>
    </section>
  `;
}
