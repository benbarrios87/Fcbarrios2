import {
  getHallOfFame,
  getCareerHistory
} from "../../repositories/history-repository.js";

function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString("no-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function medal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function HallOfFameTable(players) {
  return `
    <section class="panel history-section">
      <div class="section-heading">
        <div>
          <span>Karriere</span>
          <h2>Hall of Fame</h2>
        </div>
      </div>

      <div class="hall-table">
        <div class="hall-table__head">
          <span>Spiller</span>
          <span>Turn.</span>
          <span>Titler</span>
          <span>Podier</span>
          <span>Beste</span>
          <span>Snitt</span>
        </div>

        ${players.map((player, index) => `
          <div class="hall-table__row">
            <span class="hall-table__player">
              <b>${index + 1}</b>
              <strong>${player.name}</strong>
            </span>
            <span>${player.tournaments_played}</span>
            <span class="history-gold">${player.titles}</span>
            <span>${player.podiums}</span>
            <span>#${player.best_finish}</span>
            <span>${formatNumber(player.average_finish, 2)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function Champions(history) {
  const champions = history
    .filter((row) => row.is_champion)
    .sort((a, b) => Number(b.year) - Number(a.year));

  return `
    <section class="panel history-section">
      <div class="section-heading">
        <div>
          <span>Mestere</span>
          <h2>Tidligere vinnere</h2>
        </div>
      </div>

      <div class="champions-grid">
        ${champions.map((row) => `
          <article class="champion-card">
            <span class="champion-card__year">${row.year}</span>
            <span class="champion-card__trophy">🏆</span>
            <strong>${row.player_name}</strong>
            <small>${row.tournament_name} · ${row.field_size} deltakere</small>
            ${
              row.correct_predictions === null
                ? ""
                : `<em>${row.correct_predictions} riktige tips</em>`
            }
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function TournamentHistory(history) {
  const groups = history.reduce((result, row) => {
    const key = row.tournament_slug;
    if (!result[key]) {
      result[key] = {
        name: row.tournament_name,
        year: row.year,
        rows: []
      };
    }
    result[key].rows.push(row);
    return result;
  }, {});

  const tournaments = Object.values(groups)
    .sort((a, b) => Number(b.year) - Number(a.year));

  return `
    <section class="history-tournaments">
      ${tournaments.map((tournament) => `
        <article class="panel tournament-history">
          <div class="section-heading">
            <div>
              <span>${tournament.year}</span>
              <h2>${tournament.name}</h2>
            </div>
            <strong>${tournament.rows.length} spillere</strong>
          </div>

          <div class="tournament-history__list">
            ${tournament.rows
              .sort((a, b) => a.final_rank - b.final_rank)
              .map((row) => `
                <div>
                  <span class="history-rank">${medal(row.final_rank)}</span>
                  <strong>${row.player_name}</strong>
                  <span>
                    ${
                      row.correct_predictions === null
                        ? "–"
                        : `${row.correct_predictions} riktige`
                    }
                  </span>
                </div>
              `).join("")}
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

export async function HistoryPage() {
  const [hallOfFame, history] = await Promise.all([
    getHallOfFame(),
    getCareerHistory()
  ]);

  return `
    <div class="page">
      <header class="page-header history-header">
        <span>Siden 2016</span>
        <h1>Historiebøkene</h1>
        <p>
          Alle mestere, plasseringer og karrierer fra FC Barrios-historien.
        </p>
      </header>

      ${Champions(history)}
      ${HallOfFameTable(hallOfFame)}
      ${TournamentHistory(history)}
    </div>
  `;
}
