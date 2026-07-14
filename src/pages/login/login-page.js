import {
  getAuthSnapshot,
  signInWithPassword,
  signUpWithPassword,
  sendMagicLink,
  requestPasswordReset
} from "../../services/auth-service.js";

let mode = "login";

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

  mode = "login";
  window.setTimeout(bindLoginPage, 0);

  return `
    <div class="page auth-page">
      <section class="auth-card auth-card--password">
        <span class="eyebrow"><i></i> FC Barrios-konto</span>
        <h1 id="auth-title">Logg inn</h1>
        <p id="auth-description">
          Bruk e-post og passord. E-postlenke er fortsatt tilgjengelig som reserve.
        </p>

        <div class="auth-tabs">
          <button type="button" class="is-active" data-auth-mode="login">
            Logg inn
          </button>
          <button type="button" data-auth-mode="signup">
            Opprett konto
          </button>
        </div>

        <form id="password-auth-form" class="auth-form">
          <label id="display-name-field" hidden>
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

          <label id="password-field">
            <span>Passord</span>
            <input
              name="password"
              type="password"
              autocomplete="current-password"
              minlength="8"
              required
              placeholder="Minst 8 tegn"
            />
          </label>

          <button class="button button--primary button--full" type="submit">
            Logg inn
          </button>

          <button
            class="auth-text-button"
            id="forgot-password"
            type="button"
          >
            Glemt passord?
          </button>

          <div id="login-message" class="auth-message" aria-live="polite"></div>
        </form>

        <div class="auth-divider"><span>eller</span></div>

        <button
          class="button button--ghost button--full"
          id="magic-link-button"
          type="button"
        >
          Send innloggingslenke på e-post
        </button>
      </section>
    </div>
  `;
}

function setMessage(text, type = "") {
  const message = document.querySelector("#login-message");
  if (!message) return;

  message.className = `auth-message ${type ? `auth-message--${type}` : ""}`;
  message.textContent = text;
}

function setMode(nextMode) {
  mode = nextMode;

  const title = document.querySelector("#auth-title");
  const description = document.querySelector("#auth-description");
  const nameField = document.querySelector("#display-name-field");
  const passwordInput = document.querySelector('[name="password"]');
  const submitButton = document.querySelector('#password-auth-form button[type="submit"]');
  const forgotButton = document.querySelector("#forgot-password");

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });

  if (mode === "signup") {
    title.textContent = "Opprett konto";
    description.textContent =
      "Lag konto med navn, e-post og passord.";
    nameField.hidden = false;
    passwordInput.autocomplete = "new-password";
    submitButton.textContent = "Opprett konto";
    forgotButton.hidden = true;
  } else {
    title.textContent = "Logg inn";
    description.textContent =
      "Bruk e-post og passord. E-postlenke er fortsatt tilgjengelig som reserve.";
    nameField.hidden = true;
    passwordInput.autocomplete = "current-password";
    submitButton.textContent = "Logg inn";
    forgotButton.hidden = false;
  }

  setMessage("");
}

function bindLoginPage() {
  const form = document.querySelector("#password-auth-form");
  const magicButton = document.querySelector("#magic-link-button");
  const forgotButton = document.querySelector("#forgot-password");

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.authMode));
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    submitButton.disabled = true;
    submitButton.textContent = mode === "signup" ? "Oppretter …" : "Logger inn …";
    setMessage("");

    try {
      if (mode === "signup") {
        const result = await signUpWithPassword(
          formData.get("email"),
          formData.get("password"),
          formData.get("displayName")
        );

        if (result.session) {
          window.history.replaceState({}, "", "/tips");
          window.dispatchEvent(new PopStateEvent("popstate"));
          return;
        }

        setMessage(
          "Kontoen er opprettet. Bekreft e-posten før du logger inn.",
          "success"
        );
      } else {
        await signInWithPassword(
          formData.get("email"),
          formData.get("password")
        );

        window.history.replaceState({}, "", "/tips");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === "signup"
        ? "Opprett konto"
        : "Logg inn";
    }
  });

  forgotButton?.addEventListener("click", async () => {
    const email = form.querySelector('[name="email"]').value;

    try {
      await requestPasswordReset(email);
      setMessage(
        "Sjekk e-posten. Lenken lar deg velge et nytt passord.",
        "success"
      );
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  magicButton?.addEventListener("click", async () => {
    const formData = new FormData(form);
    magicButton.disabled = true;
    magicButton.textContent = "Sender …";

    try {
      await sendMagicLink(
        formData.get("email"),
        formData.get("displayName")
      );
      setMessage("Innloggingslenken er sendt.", "success");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      magicButton.disabled = false;
      magicButton.textContent = "Send innloggingslenke på e-post";
    }
  });
}
