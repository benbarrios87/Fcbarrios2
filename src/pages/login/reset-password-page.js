import {
  getAuthSnapshot,
  updatePassword
} from "../../services/auth-service.js";

export async function ResetPasswordPage() {
  const auth = getAuthSnapshot();

  window.setTimeout(bindResetForm, 0);

  return `
    <div class="page auth-page">
      <section class="auth-card">
        <span class="eyebrow"><i></i> Kontosikkerhet</span>
        <h1>Nytt passord</h1>
        <p>
          ${auth.isAuthenticated
            ? "Velg et nytt passord for FC Barrios-kontoen."
            : "Åpne siden fra lenken i e-posten for å velge nytt passord."}
        </p>

        <form id="reset-password-form" class="auth-form">
          <label>
            <span>Nytt passord</span>
            <input
              name="password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              placeholder="Minst 8 tegn"
            />
          </label>

          <label>
            <span>Gjenta passord</span>
            <input
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              placeholder="Gjenta passordet"
            />
          </label>

          <button class="button button--primary button--full" type="submit">
            Lagre nytt passord
          </button>

          <div id="reset-message" class="auth-message" aria-live="polite"></div>
        </form>
      </section>
    </div>
  `;
}

function bindResetForm() {
  const form = document.querySelector("#reset-password-form");
  const message = document.querySelector("#reset-message");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector("button");
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmPassword") || "");

    if (password !== confirmation) {
      message.className = "auth-message auth-message--error";
      message.textContent = "Passordene er ikke like.";
      return;
    }

    button.disabled = true;
    button.textContent = "Lagrer …";

    try {
      await updatePassword(password);
      message.className = "auth-message auth-message--success";
      message.textContent = "Passordet er lagret.";

      window.setTimeout(() => {
        window.history.replaceState({}, "", "/tips");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 700);
    } catch (error) {
      message.className = "auth-message auth-message--error";
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Lagre nytt passord";
    }
  });
}
