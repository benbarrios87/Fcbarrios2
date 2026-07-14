import {
  getAuthSnapshot,
  sendMagicLink
} from "../../services/auth-service.js";

export async function LoginPage() {
  const auth = getAuthSnapshot();

  if (auth.isAuthenticated) {
    return `
      <div class="page auth-page">
        <section class="auth-card">
          <span class="auth-card__icon">✓</span>
          <h1>Du er logget inn</h1>
          <p>Innlogget som ${auth.player?.display_name || auth.user.email}.</p>
          <a class="button button--primary" href="/tips" data-link>
            Gå til tips
          </a>
        </section>
      </div>
    `;
  }

  window.setTimeout(bindLoginForm, 0);

  return `
    <div class="page auth-page">
      <section class="auth-card">
        <span class="eyebrow"><i></i> FC Barrios-konto</span>
        <h1>Logg inn</h1>
        <p>
          Vi sender deg en sikker innloggingslenke på e-post.
          Ingen passord å huske.
        </p>

        <form id="login-form" class="auth-form">
          <label>
            <span>Navn</span>
            <input
              name="displayName"
              type="text"
              autocomplete="name"
              placeholder="Benjamin Barrios"
            />
          </label>

          <label>
            <span>E-post</span>
            <input
              name="email"
              type="email"
              autocomplete="email"
              required
              placeholder="navn@epost.no"
            />
          </label>

          <button class="button button--primary button--full" type="submit">
            Send innloggingslenke
          </button>

          <div id="login-message" class="auth-message" aria-live="polite"></div>
        </form>
      </section>
    </div>
  `;
}

function bindLoginForm() {
  const form = document.querySelector("#login-form");
  const message = document.querySelector("#login-message");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector("button");
    const formData = new FormData(form);

    button.disabled = true;
    button.textContent = "Sender …";
    message.className = "auth-message";
    message.textContent = "";

    try {
      await sendMagicLink(
        formData.get("email"),
        formData.get("displayName")
      );

      message.className = "auth-message auth-message--success";
      message.textContent =
        "Sjekk e-posten din og trykk på innloggingslenken.";
      form.reset();
    } catch (error) {
      message.className = "auth-message auth-message--error";
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Send innloggingslenke";
    }
  });
}
