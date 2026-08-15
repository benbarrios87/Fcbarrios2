import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getAdminAnnouncements,
  saveAnnouncement,
  deleteAnnouncement
} from "../../repositories/admin-announcements-repository.js";

let state = {
  tournament: null,
  announcements: [],
  editingId: null
};

function announcementRow(item) {
  return `
    <article class="admin-team-row" data-announcement-id="${item.id}">
      <div class="admin-team-row__name">
        <strong>${item.icon || "📣"} ${item.title}</strong>
        <small>${item.is_published ? "Publisert" : "Kladd"} · ${item.category}</small>
      </div>
      <button type="button" class="button button--ghost" data-edit-announcement>Rediger</button>
      <button type="button" class="button button--ghost" data-delete-announcement>Slett</button>
    </article>
  `;
}

function render() {
  const target = document.querySelector("#announcements-content");
  if (!target) return;

  const editing = state.announcements.find((a) => a.id === state.editingId);

  target.innerHTML = `
    <section class="panel admin-team-editor">
      <div class="section-heading">
        <div><span>${editing ? "Rediger" : "Ny nyhet"}</span><h2>${editing?.title || "Skriv en nyhet"}</h2></div>
      </div>

      <form id="announcement-form" class="admin-team-form">
        <label>
          <span>Ikon (emoji, valgfritt)</span>
          <input name="icon" value="${editing?.icon || ""}" placeholder="📣" maxlength="4" />
        </label>
        <label>
          <span>Tittel</span>
          <input name="title" required value="${editing?.title || ""}" placeholder="Ny runde er åpnet" />
        </label>
        <label>
          <span>Tekst</span>
          <textarea name="body" required rows="4" placeholder="Skriv nyheten her …">${editing?.body || ""}</textarea>
        </label>
        <label>
          <span>Kategori</span>
          <input name="category" value="${editing?.category || "news"}" placeholder="news" />
        </label>
        <label class="admin-inline-checkbox">
          <input type="checkbox" name="isPublished" ${editing?.is_published ? "checked" : ""} />
          <span>Publiser med en gang</span>
        </label>

        <div class="admin-team-form__actions">
          <button class="button button--primary" type="submit">
            ${editing ? "Lagre endringer" : "Opprett nyhet"}
          </button>
          ${editing ? `<button class="button button--ghost" type="button" data-cancel-edit>Avbryt</button>` : ""}
        </div>
        <small id="announcement-form-message" class="admin-inline-message"></small>
      </form>
    </section>

    <section class="panel admin-team-list">
      <div class="section-heading">
        <div><span>${state.tournament.short_name}</span><h2>Nyheter (${state.announcements.length})</h2></div>
      </div>
      <div class="admin-team-rows">
        ${state.announcements.length
          ? state.announcements.map(announcementRow).join("")
          : `<div class="tips-empty">Ingen nyheter ennå.</div>`}
      </div>
    </section>
  `;

  bindEvents();
}

async function reload() {
  state.announcements = await getAdminAnnouncements(state.tournament.id);
}

function bindEvents() {
  const form = document.querySelector("#announcement-form");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#announcement-form-message");
    const values = Object.fromEntries(new FormData(form).entries());
    const submit = form.querySelector("[type=submit]");

    submit.disabled = true;
    message.className = "admin-inline-message";
    message.textContent = "Lagrer …";

    try {
      await saveAnnouncement({
        tournamentId: state.tournament.id,
        announcementId: state.editingId,
        title: values.title,
        body: values.body,
        icon: values.icon,
        category: values.category,
        isPublished: values.isPublished === "on"
      });

      state.editingId = null;
      await reload();
      render();
    } catch (error) {
      message.textContent = error.message;
      message.className = "admin-inline-message is-error";
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    state.editingId = null;
    render();
  });

  document.querySelectorAll("[data-edit-announcement]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingId = button.closest("[data-announcement-id]").dataset.announcementId;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll("[data-delete-announcement]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Slette denne nyheten?")) return;
      const id = button.closest("[data-announcement-id]").dataset.announcementId;
      button.disabled = true;
      try {
        await deleteAnnouncement(id);
        await reload();
        render();
      } catch (error) {
        button.textContent = error.message;
      }
    });
  });
}

export async function AnnouncementsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card">
      <span>⛔</span><h1>Ingen tilgang</h1>
      <a class="button button--ghost" href="/" data-link>Til forsiden</a>
    </section></div>`;
  }

  const tournament = await getActiveTournament();
  const announcements = await getAdminAnnouncements(tournament.id);

  state = { tournament, announcements, editingId: null };
  window.setTimeout(render, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Nyheter</h1>
        <p>Publiser meldinger som vises på forsiden.</p>
      </header>
      <section id="announcements-content"></section>
    </div>
  `;
}
