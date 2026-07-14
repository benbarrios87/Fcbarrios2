# Profilbilder

## 1. Kjør migrasjon 010

Kjør:

`supabase/migrations/010_player_avatars.sql`

i Supabase SQL Editor.

Den oppretter:

- offentlig Storage-bucket `avatars`
- maks filstørrelse 8 MB
- PNG, JPEG og WebP
- RLS: hver bruker kan bare endre sin egen mappe
- RPC for å lagre avatar-URL på spilleren

## 2. Legg inn filene

Nye:

- `src/services/avatar-service.js`
- `src/pages/profile/edit-profile-page.js`
- `src/styles/avatar.css`

Erstatt:

- `src/repositories/profile-repository.js`
- `src/pages/profile/profile-page.js`
- `src/components/layout/auth-control.js`
- `src/router/routes.js`
- `src/styles/index.css`

## 3. Test

1. Logg inn.
2. Åpne `/profile`.
3. Trykk `Endre profilbilde`.
4. Velg PNG, JPEG eller WebP.
5. Lagre.
6. Oppdater siden.

Bildet skal vises på profilen og i toppbaren.

## Bakgrunnsfjerning

Denne patchen bevarer transparens i PNG/WebP og konverterer til en
komprimert 900 × 900 WebP.

Den fjerner ikke automatisk en eksisterende bakgrunn. Automatisk
bakgrunnsfjerning blir en separat funksjon, siden den krever en egen
modell eller ekstern bildeservice.
