import {
  subscribeToAuth,
  signOut
} from "../../services/auth-service.js";

function signedOutTemplate() {
  return `
    <a class="auth-control__login" href="/login" data-link>
      Logg inn
    </a>
  `;
}

function signedInTemplate(snapshot) {
  const name =
    snapshot.player?.display_name ||
    snapshot.user?.email?.split("@")[0] ||
    "Min konto";

  return `
    <div class="auth-control__user">
      <a href="/profile" data-link>
        <span class="auth-control__avatar">${name.slice(0, 1).toUpperCase()}</span>
        <span class="auth-control__name">
          <strong>${name}</strong>
          <small>${snapshot.membership?.role || "spiller"}</small>
        </span>
      </a>

      <button type="button" data-sign-out aria-label="Logg ut">↗</button>
    </div>
  `;
}

export function mountAuthControl() {
  const target = document.querySelector("#auth-control");
  if (!target) return;

  subscribeToAuth((snapshot) => {
    target.innerHTML = snapshot.isAuthenticated
      ? signedInTemplate(snapshot)
      : signedOutTemplate();

    target.querySelector("[data-sign-out]")?.addEventListener("click", async () => {
      await signOut();
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });
}
