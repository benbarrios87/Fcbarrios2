# Patch 023 – ekte flagg på Mine tips

Kopier innholdet i patchen over prosjektroten.

Ingen SQL nødvendig.

Endringer:
- Henter `country_code` fra `teams` og kobler det til kampene via lagnavn/kode.
- Viser ekte emoji-flagg på Mine tips.
- Beholder ⚽ som fallback dersom et lag mangler gyldig landskode.

Testet med `npm run build`.
