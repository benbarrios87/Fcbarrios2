import { getAuthSnapshot, refreshIdentity } from "../../services/auth-service.js";
import {
  prepareAvatar,
  createAvatarPreviewUrl,
  uploadMyAvatar,
  removeMyAvatar
} from "../../services/avatar-service.js";

let preparedBlob = null;
let previewUrl = null;

function currentAvatar(snapshot) {
  return snapshot.player?.avatar_url || "/fcbarrios-logo.png";
}

export async function EditProfilePage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>🔒</span>
          <h1>Logg inn først</h1>
          <p>Du må være logget inn for å endre profilbildet.</p>
          <a class="button button--primary" href="/login" data-link>Logg inn</a>
        </section>
      </div>
    `;
  }

  window.setTimeout(() => bindAvatarEditor(auth), 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Min profil</span>
        <h1>Profilbilde</h1>
        <p>
          Last opp et kvadratisk bilde. Transparente PNG- og WebP-bilder
          beholder den fjernede bakgrunnen.
        </p>
      </header>

      <section class="avatar-editor panel">
        <div class="avatar-editor__preview">
          <div class="avatar-stage">
            <img
              id="avatar-preview"
              src="${currentAvatar(auth)}"
              alt="Forhåndsvisning av profilbilde"
            />
          </div>

          <small>
            Bildet skaleres til 900 × 900 px og lagres som WebP.
          </small>
        </div>

        <div class="avatar-editor__controls">
          <label class="avatar-file-picker">
            <span>Velg bilde</span>
            <input
              id="avatar-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>

          <div class="avatar-editor__note">
            <strong>Bakgrunn:</strong>
            Har bildet allerede transparent bakgrunn, beholdes den.
            Automatisk bakgrunnsfjerning kommer som egen funksjon.
          </div>

          <button
            id="save-avatar"
            class="button button--primary button--full"
            type="button"
            disabled
          >
            Lagre profilbilde
          </button>

          <button
            id="remove-avatar"
            class="button button--ghost button--full"
            type="button"
          >
            Fjern profilbilde
          </button>

          <div id="avatar-message" class="auth-message" aria-live="polite"></div>
        </div>
      </section>
    </div>
  `;
}

function setMessage(text, type = "") {
  const target = document.querySelector("#avatar-message");
  if (!target) return;

  target.className = `auth-message ${type ? `auth-message--${type}` : ""}`;
  target.textContent = text;
}

function bindAvatarEditor(auth) {
  const input = document.querySelector("#avatar-file");
  const preview = document.querySelector("#avatar-preview");
  const saveButton = document.querySelector("#save-avatar");
  const removeButton = document.querySelector("#remove-avatar");

  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    saveButton.disabled = true;
    setMessage("Behandler bildet …");

    try {
      preparedBlob = await prepareAvatar(file);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = createAvatarPreviewUrl(preparedBlob);

      preview.src = previewUrl;
      saveButton.disabled = false;
      setMessage("Bildet er klart til opplasting.", "success");
    } catch (error) {
      preparedBlob = null;
      setMessage(error.message, "error");
    }
  });

  saveButton?.addEventListener("click", async () => {
    if (!preparedBlob) return;

    saveButton.disabled = true;
    saveButton.textContent = "Laster opp …";

    try {
      const avatarUrl = await uploadMyAvatar(preparedBlob);
      preview.src = avatarUrl;
      await refreshIdentity();
      setMessage("Profilbildet er lagret.", "success");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Lagre profilbilde";
    }
  });

  removeButton?.addEventListener("click", async () => {
    removeButton.disabled = true;
    removeButton.textContent = "Fjerner …";

    try {
      await removeMyAvatar();
      await refreshIdentity();
      preview.src = "/fcbarrios-logo.png";
      preparedBlob = null;
      setMessage("Profilbildet er fjernet.", "success");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      removeButton.disabled = false;
      removeButton.textContent = "Fjern profilbilde";
    }
  });
}
