import { supabase } from "./supabase-client.js";

const AVATAR_BUCKET = "avatars";
const MAX_SOURCE_SIZE = 8 * 1024 * 1024;
const OUTPUT_SIZE = 900;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Kunne ikke lese bildet."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Kunne ikke behandle bildet."));
      },
      "image/webp",
      0.9
    );
  });
}

export async function prepareAvatar(file) {
  if (!(file instanceof File)) {
    throw new Error("Velg et bilde først.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Filen må være et bilde.");
  }

  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error("Bildet kan være maks 8 MB.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const scale = Math.min(
    OUTPUT_SIZE / image.naturalWidth,
    OUTPUT_SIZE / image.naturalHeight
  );

  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (OUTPUT_SIZE - width) / 2;
  const y = (OUTPUT_SIZE - height) / 2;

  context.drawImage(image, x, y, width, height);

  return canvasToBlob(canvas);
}

export function createAvatarPreviewUrl(blob) {
  return URL.createObjectURL(blob);
}

export async function uploadMyAvatar(blob) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const user = sessionData.session?.user;

  if (!user) {
    throw new Error("Du må være logget inn.");
  }

  const folder = user.id;
  const filePath = `${folder}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, blob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Kunne ikke laste opp bildet: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase.rpc(
    "update_my_avatar_url",
    { new_avatar_url: publicUrl }
  );

  if (profileError) {
    throw new Error(`Bildet ble lastet opp, men profilen kunne ikke oppdateres: ${profileError.message}`);
  }

  return publicUrl;
}

export async function removeMyAvatar() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);

  const user = sessionData.session?.user;
  if (!user) throw new Error("Du må være logget inn.");

  const filePath = `${user.id}/avatar.webp`;

  const { error: removeError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([filePath]);

  if (removeError && !removeError.message.toLowerCase().includes("not found")) {
    throw new Error(removeError.message);
  }

  const { error: profileError } = await supabase.rpc(
    "update_my_avatar_url",
    { new_avatar_url: "" }
  );

  if (profileError) throw new Error(profileError.message);
}
