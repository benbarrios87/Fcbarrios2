# Levende forside

## Legg inn nye filer

- `src/components/cards/tournament-progress.js`
- `src/styles/home-live.css`

## Erstatt

- `src/repositories/home-repository.js`
- `src/components/cards/status-strip.js`
- `src/components/cards/match-card.js`
- `src/components/cards/news-card.js`
- `src/components/cards/leaderboard-preview.js`
- `src/components/cards/community-card.js`
- `src/pages/home/home-page.js`
- `src/styles/index.css`

## Hva som nå er ekte

- deltakerantall fra `tournament_members`
- kampantall fra `matches`
- kommende kamper fra `matches`
- innlogget spillers tips via `get_my_predictions`
- leaderboard fra `leaderboard_view`
- siste nytt fra `announcements`
- turneringsprogresjon

## Viktig

Leaderboardet vil ha 0 poeng frem til resultater og scoring er koblet til.
Folkets tips får egen database-query i neste sprint.
