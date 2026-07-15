# Patch 019C – Sidepotter

## Kjør SQL først

`supabase/migrations/016_side_pot_prize_engine.sql`

## Modellen

- Bronse 250 kr: konkurrerer om Bronsepotten.
- Sølv 500 kr: 250 kr til Bronse + 250 kr til Sølv.
- Gull 800 kr: 250 kr til Bronse + 250 kr til Sølv + 300 kr til Gull.
- Hver pott beregnes uavhengig.
- Samme spiller kan vinne premier i flere potter.

## Nye sider

- `/admin/prizes`
- Leaderboard har filter for Alle, Bronse, Sølv og Gull.

## Viktig

Legg til denne linjen nederst i `src/styles/index.css` dersom patchfilen ikke allerede er importert:

`@import "./patch-019c.css";`
