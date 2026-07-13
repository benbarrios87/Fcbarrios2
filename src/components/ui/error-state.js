export function showFatalError(error) {
  const app = document.querySelector("#app");
  if (!app) return;

  app.innerHTML = `
    <main class="fatal-error">
      <h1>FC Barrios kunne ikke starte</h1>
      <p>${error?.message ?? "Ukjent feil"}</p>
    </main>
  `;
}
