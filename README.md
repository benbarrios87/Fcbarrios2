# FC Barrios 2.0

Turneringsmotor for FC Barrios – bygget for EM 2028 og kommende mesterskap.

## Lokal start

```bash
npm install
npm run dev
```

## Supabase

Prosjektet fungerer med mock-data uten miljøvariabler.

For å koble til Supabase:

1. Opprett et Supabase-prosjekt.
2. Kjør SQL-filene i `supabase/migrations` i nummerrekkefølge.
3. Kopier `.env.example` til `.env.local`.
4. Fyll inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Start prosjektet på nytt.

Aldri legg en secret/service-role-nøkkel i frontend eller i Vercel-variabler med `VITE_`-prefiks.

## Arkitektur

```text
Page -> Repository -> Supabase/mock data
Page -> Components -> HTML
main.js -> Router -> Page
```

- `repositories/` bestemmer hvor data kommer fra.
- `services/` inneholder infrastruktur som Supabase-klienten.
- `components/` er gjenbrukbar UI.
- `pages/` setter sammen data og komponenter.
- Alle turneringsdata knyttes til `tournament_id`.
