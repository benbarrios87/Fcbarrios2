// Offentlig kjente klubbfarger (fakta, ikke logoer/varemerker) brukt
// til å tegne enkle, fargede initial-badges — samme prinsipp som
// fallback-identiteten skissert i prosjektvisjonen (punkt 36).

const CLUB_COLORS = {
  ARS: "#EF0107",
  AVL: "#670E36",
  BOU: "#DA291C",
  BRE: "#E30613",
  BHA: "#0057B8",
  CHE: "#034694",
  COV: "#78D0F7",
  CRY: "#1B458F",
  EVE: "#003399",
  FUL: "#000000",
  HUL: "#F18A01",
  IPS: "#0044A9",
  LEE: "#FFCD00",
  LIV: "#C8102E",
  MCI: "#6CABDD",
  MUN: "#DA291C",
  NEW: "#241F20",
  NFO: "#DD0000",
  SUN: "#EB172B",
  TOT: "#132257"
};

const DEFAULT_COLOR = "#2C3E50";

function initialsFor(team) {
  if (team?.short_name) {
    const words = team.short_name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return team.short_name.slice(0, 2).toUpperCase();
  }
  return (team?.code || "??").slice(0, 2).toUpperCase();
}

function isLightColor(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6;
}

export function clubColor(code) {
  return CLUB_COLORS[String(code || "").toUpperCase()] || DEFAULT_COLOR;
}

export function ClubBadge(team, size = 44) {
  const color = clubColor(team?.code);
  const textColor = isLightColor(color) ? "#111820" : "#ffffff";
  const initials = initialsFor(team);

  return `
    <span
      class="club-badge"
      style="
        --club-badge-size:${size}px;
        --club-badge-color:${color};
        --club-badge-text:${textColor};
      "
    >${initials}</span>
  `;
}
