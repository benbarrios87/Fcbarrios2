# Patch 019B – Leaderboard 2.0

## 1. Kjør SQL

Kjør:

`supabase/migrations/019_leaderboard_2.sql`

SQL-en lager en ny RPC og endrer ikke eksisterende `leaderboard_view`.

## 2. Kopier inn filene

Behold samme mappestruktur og erstatt filene når Windows spør.

## 3. Commit og push

Forslag til commit:

`Patch 019B - Leaderboard 2.0`

## Inneholder

- profilbilder
- Bronse/Sølv/Gull-merke
- betalt-status
- filter for pulje og betalt
- egen spiller tydelig markert
- kvalifiserte premiepotter per spiller
- poeng fra siste ferdigspilte kamp
- forbedret mobilvisning
- oppgradert leaderboard på forsiden

Merk: `movement` bruker eksisterende felt og vil stå som `–` til rank-historikk blir lagret i en senere patch.
