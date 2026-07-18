# Patch 025 – Admin lagkontroll

## Innhold

Admin → Lag kan nå redigere:

- navn, FIFA-kode og landskode
- tier og gruppe
- RTG-multiplikator
- turneringsstatus
- aktiv/inaktiv

RTG-multiplikator og status synkroniseres også til lagets RTG-kandidat når RTG-spillet finnes.

## Installer

1. Kopier patchfilene over prosjektet.
2. Kjør `supabase/migrations/025_admin_team_control.sql` i Supabase SQL Editor.
3. Push til GitHub/Vercel.

Patchen inneholder også den offentlige `getTournamentTeams`-eksporten, slik at bonus- og tipssidene fortsatt bygger.
