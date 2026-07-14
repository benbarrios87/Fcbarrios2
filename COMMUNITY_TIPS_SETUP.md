# Folkets tips

## 1. Kjør migrasjon 011

Kjør:

`supabase/migrations/011_community_predictions.sql`

i Supabase SQL Editor.

## 2. Nye filer

- `src/repositories/community-repository.js`
- `src/styles/community.css`

## 3. Erstatt

- `src/repositories/home-repository.js`
- `src/components/cards/community-card.js`
- `src/styles/index.css`

## 4. Synlighetsregel

Folkets tips vises bare når:

- innlogget spiller selv har levert tips på kampen, eller
- kampens tipsfrist er utløpt, eller
- kampen er live/ferdig

Dermed kan ingen bruke fordelingen til å kopiere flokken før de selv har tippet.

## 5. Test

1. Logg inn og lever tips på én kamp.
2. Åpne forsiden.
3. Den kampen skal vise prosentfordeling.
4. Kamper du ikke har tippet skal stå som skjult.
