import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { updateTournamentStatus } from "../../repositories/admin-tournament-repository.js";

const modes = [
  {
    status: "registration",
    icon: "🚀",
    title: "Påmelding",
    text: "Salgsside, bli med-knapp, premiepotter og forklaring."
  },
  {
    status: "live",
    icon: "⚽",
    title: "Turnering",
    text: "Tips, neste kamper, leaderboard og Folkets tips."
  },
  {
    status: "finished",
    icon: "🏆",
    title: "Ferdig",
    text: "Vinner, pall, premievinnere og historikk."
  }
];

export async function TournamentPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card">
      <span>⛔</span><h1>Ingen tilgang</h1>
      <a class="button button--ghost" href="/" data-link>Til forsiden</a>
    </section></div>`;
  }

  const tournament = await getActiveTournament();

  window.setTimeout(() => {
    document.querySelectorAll("[data-set-mode]").forEach((button) => {
      button.addEventListener("click", async () => {
        const status = button.dataset.setMode;
        const message = document.querySelector("#tournament-mode-message");

        button.disabled = true;
        message.textContent = "Lagrer …";

        try {
          await updateTournamentStatus(tournament.id, status);
          message.textContent = "✓ Turneringsmodus er oppdatert.";
          message.className = "admin-inline-message is-success";
          document.querySelectorAll("[data-mode-card]").forEach((card) => {
            card.classList.toggle("is-current", card.dataset.modeCard === status);
          });
        } catch (error) {
          message.textContent = error.message;
          message.className = "admin-inline-message is-error";
        } finally {
          button.disabled = false;
        }
      });
    });
  }, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · Forside</span>
        <h1>Turneringsmodus</h1>
        <p>Én innstilling styrer hvilken forside deltakerne ser.</p>
      </header>

      <section class="admin-mode-grid">
        ${modes.map((mode) => `
          <article
            class="admin-mode-card ${tournament.status === mode.status ? "is-current" : ""}"
            data-mode-card="${mode.status}"
          >
            <span>${mode.icon}</span>
            <h2>${mode.title}</h2>
            <p>${mode.text}</p>

            <div class="admin-mode-card__actions">
              <button
                class="button button--primary"
                type="button"
                data-set-mode="${mode.status}"
              >
                Aktiver
              </button>

              <a
                class="button button--ghost"
                href="/?preview=${mode.status}"
                data-link
              >
                Forhåndsvis
              </a>
            </div>
          </article>
        `).join("")}
      </section>

      <p id="tournament-mode-message" class="admin-inline-message"></p>
    </div>
  `;
}
