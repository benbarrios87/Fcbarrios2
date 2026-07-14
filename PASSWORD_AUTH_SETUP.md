# Innlogging med passord

Denne patchen krever ingen ny SQL-migrasjon.

## Nye filer

- `src/pages/login/reset-password-page.js`
- `src/styles/password-auth.css`

## Erstatt

- `src/services/auth-service.js`
- `src/pages/login/login-page.js`
- `src/router/routes.js`
- `src/styles/index.css`

## Supabase-oppsett

Gå til:

Authentication → Providers → Email

Pass på at Email-provider er aktiv.

I Authentication → URL Configuration må produksjonsadressen fortsatt ligge
som Site URL og med `/**` under Redirect URLs.

Eksempel:

- `https://fcbarrios2.vercel.app`
- `https://fcbarrios2.vercel.app/**`

## Eksisterende brukere

Brukeren trenger ikke opprette ny konto.

1. Åpne `/login`
2. Skriv e-post
3. Trykk `Glemt passord?`
4. Åpne e-postlenken
5. Velg nytt passord
6. Logg deretter inn vanlig med e-post og passord

## Nye brukere

De kan velge `Opprett konto`, skrive navn, e-post og passord.

Hvis e-postbekreftelse er aktivert i Supabase, må de bekrefte e-posten før
første innlogging.
