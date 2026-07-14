export function StatusStrip({ tournament, participantCount, matchCounts }) {
  const totalMatches = matchCounts?.total ?? 0;
  const finishedMatches = matchCounts?.finished ?? 0;

  return `
    <section class="status-strip">
      <article>
        <span>Deltakere</span>
        <strong>${participantCount ?? 0}</strong>
      </article>

      <article>
        <span>Premiepool</span>
        <strong>
          ${Number(tournament.prize_pool || 0).toLocaleString("no-NO")} kr
        </strong>
      </article>

      <article>
        <span>Kamper</span>
        <strong>${finishedMatches} / ${totalMatches}</strong>
      </article>
    </section>
  `;
}
