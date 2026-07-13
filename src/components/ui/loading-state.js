export function renderPageLoading(target) {
  target.innerHTML = `
    <section class="loading-state" aria-live="polite">
      <div class="loading-ball">⚽</div>
      <p>Laster FC Barrios …</p>
    </section>
  `;
}
