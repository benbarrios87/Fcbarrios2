import {
  getAuthSnapshot,
  signInWithPassword,
  signUpWithPassword,
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
      <section class="auth-card auth-card--simple">
        <img
          class="auth-card__logo"
          src="/fcbarrios-logo.png"
          alt="FC Barrios"
        />

        <span class="eyebrow"><i></i> FC Barrios</span>
        <h1 id="auth-title">Logg inn</h1>
        <p id="auth-description">
          Bruk e-post og passord.
        </p>

        <form id="auth-form" class="auth-form">
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

          <label>
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

          <div id="auth-message" class="auth-message" aria-live="polite"></div>
        </form>

        <div class="auth-simple-links">
          <button type="button" id="toggle-auth-mode">
            Ny spiller? Opprett konto
          </button>

          <button type="button" id="forgot-password">
            Glemt passord?
          </button>
        </div>
      </section>
    </div>
  `;
}

function setMessage(text, type = "") {
  const target = document.querySelector("#auth-message");
  if (!target) return;

  target.className = `auth-message ${type ? `auth-message--${type}` : ""}`;
  target.textContent = text;
}

function updateMode() {
  const isSignup = mode === "signup";
  const title = document.querySelector("#auth-title");
  const description = document.querySelector("#auth-description");
  const nameField = document.querySelector("#display-name-field");
  const passwordInput = document.querySelector('[name="password"]');
  const submitButton = document.querySelector('#auth-form button[type="submit"]');
  const toggleButton = document.querySelector("#toggle-auth-mode");
  const forgotButton = document.querySelector("#forgot-password");

  title.textContent = isSignup ? "Opprett konto" : "Logg inn";
  description.textContent = isSignup
    ? "Skriv navn, e-post og passord."
    : "Bruk e-post og passord.";

  nameField.hidden = !isSignup;
  passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
  submitButton.textContent = isSignup ? "Opprett konto" : "Logg inn";
  toggleButton.textContent = isSignup
    ? "Har du konto? Logg inn"
    : "Ny spiller? Opprett konto";
  forgotButton.hidden = isSignup;
  setMessage("");
}

function bindLoginPage() {
  const form = document.querySelector("#auth-form");
  const toggleButton = document.querySelector("#toggle-auth-mode");
  const forgotButton = document.querySelector("#forgot-password");

  toggleButton?.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    updateMode();
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

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    submitButton.disabled = true;
    submitButton.textContent = mode === "signup"
      ? "Oppretter …"
      : "Logger inn …";
    setMessage("");

    try {
      if (mode === "signup") {
        const result = await signUpWithPassword(
          formData.get("email"),
          formData.get("password"),
          formData.get("displayName")
        );

        if (!result.session) {
          setMessage(
            "Kontoen er opprettet. Du kan nå logge inn.",
            "success"
          );
          mode = "login";
          updateMode();
          return;
        }
      } else {
        await signInWithPassword(
          formData.get("email"),
          formData.get("password")
        );
      }

      window.history.replaceState({}, "", "/tips");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === "signup"
        ? "Opprett konto"
        : "Logg inn";
    }
  });
}
