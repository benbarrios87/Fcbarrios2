# Resultater og live scoring

## 1. Kjør migrasjonen

Kjør:

`supabase/migrations/008_results_and_live_scoring.sql`

i Supabase SQL Editor.

## 2. Legg inn filene

Nye filer:

- `src/repositories/results-repository.js`
- `src/pages/admin/results-page.js`
- `src/styles/results.css`

Erstatt:

- `src/pages/admin/admin-page.js`
- `src/router/routes.js`
- `src/styles/index.css`

## 3. Test

1. Sørg for at du er `owner` eller `admin`.
2. Åpne `/admin/results`.
3. Registrer et resultat på en kamp som har minst ett tips.
4. Åpne `/leaderboard`.
5. Poengene skal være oppdatert.
6. Endre resultatet i admin.
7. Leaderboardet skal beregnes på nytt uten duplikater.

## Viktig

Dette avhenger av at migrasjon 007 og scoremodellen finnes.
Poengverdiene må være lagt inn i den aktive scoremodellen.
Hvis alle verdier er 0, vil leaderboardet naturlig nok vise 0.
