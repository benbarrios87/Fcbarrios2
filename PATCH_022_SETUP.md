# Patch 022 – kampflagg

Ingen SQL-migrasjon er nødvendig.

Patchen:
- henter `country_code` fra `teams`
- kobler kodene til kampene via `home_team_id` / `away_team_id`
- bruker lagnavn som fallback for eldre kamprader
- viser flagg på tipskort og vanlige kampkort

Etter kopiering:

```bash
npm install
npm run build
```
