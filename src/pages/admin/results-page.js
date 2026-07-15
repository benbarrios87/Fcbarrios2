import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getAdminMatches, processMatchResult, getAdminDashboard, getRecentAdminJobs } from "../../repositories/results-repository.js";
import { formatKickoff } from "../../utils/format.js";

let state = { tournament:null, matches:[], dashboard:{}, jobs:[], query:"", saving:new Set(), lastResult:null };

const filteredMatches = () => {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.matches;
  return state.matches.filter(m => m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q) || String(m.round || "").toLowerCase().includes(q));
};

const groupMatches = matches => matches.reduce((groups, match) => {
  const key = match.round || "Kamper";
  groups[key] ??= [];
  groups[key].push(match);
  return groups;
}, {});

function renderMatch(match) {
  const saving = state.saving.has(match.match_id);
  const finished = match.status === "finished";
  return `
    <article class="result-card ${finished ? "result-card--finished" : ""}" data-result-match="${match.match_id}">
      <div class="result-card__meta"><time>${formatKickoff(match.kickoff_at)}</time><span>${finished ? "✓ Ferdig" : `${match.prediction_count ?? 0} tips påvirkes`}</span></div>
      <div class="result-card__main">
        <strong>${match.home_team}</strong>
        <div class="result-score">
          <input type="number" min="0" max="30" data-result-home value="${match.home_score ?? ""}">
          <span>–</span>
          <input type="number" min="0" max="30" data-result-away value="${match.away_score ?? ""}">
        </div>
        <strong>${match.away_team}</strong>
      </div>
      <div class="result-card__stats"><span><b>${match.prediction_count ?? 0}</b> tips</span><span><b>${match.exact_count ?? 0}</b> eksakte</span><span><b>${match.total_points_awarded ?? 0}</b> poeng</span></div>
      <div class="result-card__footer">
        <span class="result-status">${saving ? "Behandler resultat og poeng …" : finished ? "Kan beregnes på nytt" : "Klar til beregning"}</span>
        <button class="button button--primary result-save" data-process-result ${saving ? "disabled" : ""}>${finished ? "Beregn på nytt" : "Lagre og beregn"}</button>
      </div>
    </article>`;
}

function render() {
  const target = document.querySelector("#results-content");
  if (!target) return;
  const groups = groupMatches(filteredMatches());
  const d = state.dashboard;
  const r = state.lastResult;

  target.innerHTML = `
    <section class="admin-result-kpis">
      <article><span>Kamper igjen</span><strong>${d.matches_remaining ?? 0}</strong></article>
      <article><span>Ferdigspilt</span><strong>${d.matches_finished ?? 0}/${d.matches_total ?? 0}</strong></article>
      <article><span>Spillere</span><strong>${d.players ?? 0}</strong></article>
      <article><span>Tips levert</span><strong>${d.predictions ?? 0}</strong></article>
    </section>
    ${r ? `<section class="result-run-summary panel"><strong>✓ ${r.predictions_scored ?? 0} tips analysert</strong><span>${r.points_awarded ?? 0} poeng · ${r.exact_hits ?? 0} eksakte · ${r.difference_hits ?? 0} diff · ${r.outcome_hits ?? 0} utfall</span></section>` : ""}
    <section class="results-toolbar panel"><input id="result-search" type="search" value="${state.query}" placeholder="Søk etter lag eller runde"></section>
    <div class="results-layout">
      <div class="results-groups">${Object.entries(groups).map(([round,matches]) => `<section class="results-group"><header><span>Runde</span><h2>${round}</h2></header><div class="results-list">${matches.map(renderMatch).join("")}</div></section>`).join("")}</div>
      <aside><section class="panel admin-job-log"><div class="section-heading"><div><span>System</span><h2>Jobblogg</h2></div></div><div class="admin-job-list">${state.jobs.map(j => `<article class="admin-job admin-job--${j.status}"><time>${new Date(j.started_at).toLocaleTimeString("no-NO")}</time><span>${j.message || j.status}</span><b>${j.status === "success" ? "✓" : j.status === "error" ? "!" : "…"}</b></article>`).join("") || "Ingen jobber ennå."}</div></section></aside>
    </div>`;

  bindEvents();
}

async function refreshData() {
  [state.matches, state.dashboard, state.jobs] = await Promise.all([
    getAdminMatches(state.tournament.id),
    getAdminDashboard(state.tournament.id),
    getRecentAdminJobs(state.tournament.id)
  ]);
}

function bindEvents() {
  const search = document.querySelector("#result-search");
  search?.addEventListener("input", () => { state.query = search.value; render(); requestAnimationFrame(() => document.querySelector("#result-search")?.focus()); });

  document.querySelectorAll("[data-process-result]").forEach(button => button.addEventListener("click", async () => {
    const card = button.closest("[data-result-match]");
    const matchId = card.dataset.resultMatch;
    const home = card.querySelector("[data-result-home]").value;
    const away = card.querySelector("[data-result-away]").value;
    if (home === "" || away === "") { card.querySelector(".result-status").textContent = "Fyll inn begge resultater."; return; }
    state.saving.add(matchId); render();
    try {
      state.lastResult = await processMatchResult({ matchId, homeScore:home, awayScore:away });
      state.saving.delete(matchId);
      await refreshData();
      render();
    } catch (error) {
      state.saving.delete(matchId); render();
      const status = document.querySelector(`[data-result-match="${matchId}"]`)?.querySelector(".result-status");
      if (status) status.textContent = error.message;
    }
  }));
}

export async function ResultsPage() {
  const auth = getAuthSnapshot();
  if (!auth.isAdmin) return `<div class="page"><section class="access-card"><span>⛔</span><h1>Ingen tilgang</h1><p>Resultater kan bare registreres av admin eller owner.</p><a class="button button--ghost" href="/" data-link>Til forsiden</a></section></div>`;
  const tournament = await getActiveTournament();
  state.tournament = tournament;
  await refreshData();
  window.setTimeout(render, 0);
  return `<div class="page"><header class="page-header"><span>Admin · ${tournament.short_name}</span><h1>Resultatsenter</h1><p>Ett klikk lagrer resultatet, beregner kamptips og oppdaterer målbonusene.</p></header><section id="results-content"></section></div>`;
}
