# FC Barrios bonusmotor

## 1. Kjør migrasjon 012

Kjør:

`supabase/migrations/012_bonus_engine.sql`

i Supabase SQL Editor.

## 2. Nye sider

Spillere:

`/bonuses`

Admin:

`/admin/bonuses`

## 3. Admin kan endre

- Toppscorer-pott
- Best Player-pott
- RTG-pott
- maks innsats på én kandidat
- maks antall kandidater
- antall påkrevde valg
- poeng per riktig valg
- terskel for målrik/målfattig kamp

Standard:

- Toppscorer: 5 poeng å fordele
- Best Player: 5 poeng å fordele
- RTG: 10 poeng å fordele
- Kvalifiserte lag: 5 valg, 1 poeng per treff
- Målrike: 5 kamper, 4+ mål, 1 poeng per treff
- Målfattige: 5 kamper, 0–1 mål, 1 poeng per treff

## 4. Kandidater

Migrasjonen oppretter bonusspillene, men ikke kandidater.

Adminmodul for å legge inn kandidater kommer senere. Kandidater kan foreløpig
legges inn i `bonus_candidates` gjennom Supabase Table Editor.

Eksempel Toppscorer:

- bonus_game_id = Toppscorer-spillets id
- candidate_type = player
- label = Kylian Mbappé
- multiplier = 1.8

Eksempel RTG:

- candidate_type = team
- label = Norge
- tier = 3
- multiplier = 5.0

## 5. Scoring

Når vinnere er registrert i `bonus_results`, kjør:

```sql
select public.score_bonus_game('BONUS_GAME_UUID');
```

Poengene legges automatisk til leaderboard gjennom `bonus_scores`.
