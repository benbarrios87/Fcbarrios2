import { completeAuthCallback } from "../../services/auth-service.js";

export async function AuthCallbackPage() {
  window.setTimeout(handleCallback, 0);

  return `
    <div class="page auth-page">
      <section class="auth-card" id="auth-callback-card">
        <div class="loading-ball">⚽</div>
        <h1>Logger deg inn</h1>
        <p>Vi kobler kontoen din til FC Barrios.</p>
      </section>
    </div>
  `;
}

async function handleCallback() {
  const card = document.querySelector("#auth-callback-card");
  if (!card) return;

  try {
    await completeAuthCallback();

    card.innerHTML = `
      <span class="auth-card__icon">✓</span>
      <h1>Du er inne</h1>
      <p>Sender deg videre til tipsene.</p>
    `;

    window.setTimeout(() => {
      window.history.replaceState({}, "", "/tips");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, 500);
  } catch (error) {
    card.innerHTML = `
      <span class="auth-card__icon">!</span>
      <h1>Innloggingen feilet</h1>
      <p>${error.message}</p>
      <a class="button button--primary" href="/login" data-link>
        Be om ny lenke
      </a>
    `;
  }
}
