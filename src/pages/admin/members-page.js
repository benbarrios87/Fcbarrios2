import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getAdminMembers,
  searchPlayers,
  addMember,
  removeMember,
  createPlayer
} from "../../repositories/admin-members-repository.js";

let state = {
  tournament: null,
  members: [],
  searchResults: [],
  searchQuery: ""
};

const roleLabels = { player: "Spiller", admin: "Admin", owner: "Eier" };

function memberRow(member) {
  return `
    <article class="admin-team-row" data-player-id="${member.player_id}">
      <div class="admin-team-row__name">
        <strong>${member.display_name}</strong>
        <small>${member.email || "Ingen e-post"} · ${roleLabels[member.role] || member.role}</small>
      </div>
      ${
        member.role === "owner"
          ? ""
          : `<button type="button" class="button button--ghost" data-remove-member>Fjern</button>`
      }
    </article>
  `;
}

function searchResultRow(player) {
  const alreadyMember = state.members.some((m) => m.player_id === player.player_id);
  return `
    <article class="admin-team-row" data-player-id="${player.player_id}">
      <div class="admin-team-row__name">
        <strong>${player.display_name}</strong>
        <small>${player.email || "Ingen e-post"}</small>
      </div>
      <button type="button" class="button button--ghost" data-add-member ${alreadyMember ? "disabled" : ""}>
        ${alreadyMember ? "Allerede med" : "Legg til"}
      </button>
    </article>
  `;
}

function render() {
  const target = document.querySelector("#members-content");
  if (!target) return;

  target.innerHTML = `
    <section class="panel admin-team-editor">
      <div class="section-heading">
        <div><span>Finn spiller</span><h2>Legg til medlem</h2></div>
      </div>

      <form id="search-form" class="admin-team-form">
        <label>
          <span>Navn eller e-post</span>
          <input name="query" placeholder="Søk …" value="${state.searchQuery}" autocomplete="off" />
        </label>
      </form>

      <div class="admin-team-rows" id="search-results">
        ${state.searchResults.length
          ? state.searchResults.map(searchResultRow).join("")
          : state.searchQuery.trim().length >= 2
            ? `<div class="tips-empty">Ingen treff. Vil du opprette ny spiller?</div>`
            : ""}
      </div>

      <form id="create-form" class="admin-team-form" style="margin-top:14px;">
        <label>
          <span>Ny spiller — navn</span>
          <input name="name" placeholder="Navn Navnesen" />
        </label>
        <label>
          <span>E-post (valgfritt)</span>
          <input name="email" type="email" placeholder="navn@epost.no" />
        </label>
        <div class="admin-team-form__actions">
          <button class="button button--ghost" type="submit">Opprett og legg til</button>
        </div>
        <small id="create-form-message" class="admin-inline-message"></small>
      </form>
    </section>

    <section class="panel admin-team-list">
      <div class="section-heading">
        <div><span>${state.tournament.short_name}</span><h2>Medlemmer (${state.members.length})</h2></div>
      </div>
      <div class="admin-team-rows">
        ${state.members.length
          ? state.members.map(memberRow).join("")
          : `<div class="tips-empty">Ingen medlemmer ennå.</div>`}
      </div>
    </section>
  `;

  bindEvents();
}

async function reload() {
  state.members = await getAdminMembers(state.tournament.id);
}

function bindEvents() {
  const searchForm = document.querySelector("#search-form");
  let debounceTimer = null;

  searchForm?.elements.query.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      state.searchResults = await searchPlayers(state.searchQuery);
      render();
      document.querySelector("#search-form")?.elements.query.focus();
    }, 300);
  });

  document.querySelectorAll("[data-add-member]").forEach((button) => {
    button.addEventListener("click", async () => {
      const playerId = button.closest("[data-player-id]").dataset.playerId;
      button.disabled = true;
      try {
        await addMember(state.tournament.id, playerId);
        await reload();
        state.searchResults = [];
        state.searchQuery = "";
        render();
      } catch (error) {
        button.textContent = error.message;
      }
    });
  });

  document.querySelectorAll("[data-remove-member]").forEach((button) => {
    button.addEventListener("click", async () => {
      const playerId = button.closest("[data-player-id]").dataset.playerId;
      if (!confirm("Fjerne dette medlemmet fra turneringen?")) return;
      button.disabled = true;
      try {
        await removeMember(state.tournament.id, playerId);
        await reload();
        render();
      } catch (error) {
        button.textContent = error.message;
      }
    });
  });

  const createForm = document.querySelector("#create-form");
  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#create-form-message");
    const values = Object.fromEntries(new FormData(createForm).entries());
    const submit = createForm.querySelector("[type=submit]");

    submit.disabled = true;
    message.textContent = "Oppretter …";
    message.className = "admin-inline-message";

    try {
      const newPlayerId = await createPlayer(values.name, values.email);
      await addMember(state.tournament.id, newPlayerId);
      await reload();
      createForm.reset();
      message.textContent = "";
      render();
    } catch (error) {
      message.textContent = error.message;
      message.className = "admin-inline-message is-error";
    } finally {
      submit.disabled = false;
    }
  });
}

export async function MembersPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card">
      <span>⛔</span><h1>Ingen tilgang</h1>
      <a class="button button--ghost" href="/" data-link>Til forsiden</a>
    </section></div>`;
  }

  const tournament = await getActiveTournament();
  const members = await getAdminMembers(tournament.id);

  state = { tournament, members, searchResults: [], searchQuery: "" };
  window.setTimeout(render, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Medlemmer</h1>
        <p>Søk opp eksisterende spillere eller opprett nye, og administrer hvem som er med i turneringen.</p>
      </header>
      <section id="members-content"></section>
    </div>
  `;
}
