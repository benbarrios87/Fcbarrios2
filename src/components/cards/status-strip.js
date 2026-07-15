export function StatusStrip({ participantCount, paidCount, totalPrizePool, matchCounts }) {
  const totalMatches = matchCounts?.total ?? 0;
  const finishedMatches = matchCounts?.finished ?? 0;
  const remainingMatches = Math.max(totalMatches - finishedMatches, 0);

  return `
    <section class="status-strip status-strip--four">
      <article>
        <span>Spillere</span>
        <strong>${participantCount ?? 0}</strong>
      </article>

      <article>
        <span>Betalt</span>
        <strong>${paidCount ?? 0}</strong>
      </article>

      <article>
        <span>Premiepott</span>
        <strong>${Number(totalPrizePool || 0).toLocaleString("no-NO")} kr</strong>
      </article>

      <article>
        <span>Kamper igjen</span>
        <strong>${remainingMatches}</strong>
      </article>
    </section>
  `;
}
