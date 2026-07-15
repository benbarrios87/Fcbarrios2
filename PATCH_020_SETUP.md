# Patch 020 – Adaptive Homepage, Sidepotter, Lag og mobil

## 1. Kjør SQL

Kjør:

`supabase/migrations/020_adaptive_home_and_teams.sql`

## 2. Kopier inn filene

Kopier innholdet i patchen over prosjektet og behold samme mappestruktur.

## 3. Nye adminsider

- `/admin/tournament`
  - Påmelding
  - Turnering
  - Ferdig
  - Forhåndsvis alle tre uten å endre offentlig status

- `/admin/teams`
  - legg til og rediger lag
  - FIFA-kode
  - tier
  - gruppe
  - landskode
  - automatisk emoji-flagg
  - aktiver/deaktiver

## Forsidemoduser

Turneringsstatus styrer forsiden:

- `registration` / `planning` → salgs- og påmeldingsside
- `live` / `tipping` → turneringsdashboard
- `finished` → vinner, pall og historikk

## Sidepotter

- Bronse viser alle kvalifiserte
- Sølv viser Sølv + Gull
- Gull viser Gull
- profilsiden viser hvilke potter spilleren konkurrerer om
- samme spiller kan vinne flere potter

## Mobil

Patchen fjerner horisontal overflow, gjør grids responsive og retter innhold som ble kuttet på høyresiden.
