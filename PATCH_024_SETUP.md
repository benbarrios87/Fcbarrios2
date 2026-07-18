# Patch 024 – Lagkontroll

Denne patchen gjør **Admin → Lag** til ett samlet kontrollpunkt for:

- navn, kode, tier og gruppe
- landskode/flagg
- RTG-multiplikator
- turneringsstatus (videre, bronsekamp, finalist, mester, utslått osv.)

## Installer

1. Legg patch-filene over prosjektet.
2. Kjør `supabase/migrations/024_admin_team_control.sql` i Supabase SQL Editor.
3. Deploy som vanlig.

Når et lag lagres, synkroniseres RTG-multiplikatoren til lagets kandidat i bonusspillet med kode `rtg`.
