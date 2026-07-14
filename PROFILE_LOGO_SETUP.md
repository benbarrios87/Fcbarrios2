# Profil 2.0 + FC Barrios-logo

## Logo

Patchen legger logoen inn som:

`public/fcbarrios-logo.png`

Den brukes i:

- toppbaren
- heroen
- FUT-kortet
- profilheaderen

## Kjør migrasjon 009

Kjør:

`supabase/migrations/009_public_profiles_and_career.sql`

i Supabase SQL Editor.

## Nye filer

- `public/fcbarrios-logo.png`
- `supabase/migrations/009_public_profiles_and_career.sql`
- `src/styles/profile-2.css`

## Erstatt

- `src/repositories/profile-repository.js`
- `src/pages/profile/profile-page.js`
- `src/components/layout/app-shell.js`
- `src/components/cards/hero-card.js`
- `src/styles/index.css`

## Test

1. Åpne leaderboard.
2. Klikk på Benjamin eller en annen spiller.
3. Profilen skal vise ekte historikk fra Supabase.
4. Logoen skal vises i toppbaren, heroen og spillerkortet.
