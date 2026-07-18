# Patch 021 – Flagg i hele appen

## Innhold
- Live flagg-preview i Admin → Lag.
- Flagg i kamptips.
- Flagg på kampkort på forsiden.
- Flagg i Folkets tips.
- Flagg på lagkandidater i Road to Glory/bonusspill.
- Felles `countryCodeToFlag()` brukes overalt.

## Oppsett
1. Legg filene fra patchen inn i prosjektet og behold mappestrukturen.
2. Kjør `supabase/migrations/021_flag_ui.sql` i Supabase SQL Editor.
3. Kontroller at lagene har ISO-landskode på to bokstaver i Admin → Lag, f.eks. `NO`, `ES`, `AR`.
4. Push/deploy som vanlig.

## Merk
Kamper må være koblet til `home_team_id` og `away_team_id` for at flaggene skal følge laget automatisk. Manglende kode vises med ⚽.
