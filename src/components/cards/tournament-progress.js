export function TournamentProgress({ tournament, matchCounts }) {
  const total = matchCounts?.total ?? 0;
  const finished = matchCounts?.finished ?? 0;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  return `
    <section class="tournament-progress">
      <div class="tournament-progress__copy">
        <span>${tournament.short_name}</span>
        <strong>
          ${
            total > 0
              ? `${finished} av ${total} kamper spilt`
              : "Turneringen er under planlegging"
          }
        </strong>
      </div>

      <div class="tournament-progress__bar" aria-label="${progress}% ferdig">
        <i style="width: ${progress}%"></i>
      </div>

      <b>${progress}%</b>
    </section>
  `;
}
