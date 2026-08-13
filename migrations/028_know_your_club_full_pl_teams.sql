-- FC Barrios 2.0
-- Patch 028: Know Your Club — fullt Premier League-lag 2026/27
--
-- Utvider laglisten fra Patch 027 (8 lag) til alle 20 klubbene i
-- Premier League 2026/27-sesongen, slik at alle i vennegjengen kan
-- velge sitt faktiske lag. Idempotent — kan kjøres selv om noen av
-- de 8 opprinnelige lagene allerede finnes (on conflict do nothing).
--
-- Rører ikke EM 2028 eller noe annet. Trygg å kjøre etter 027.

begin;

insert into public.teams (tournament_id, code, name, short_name, country_code)
select t.id, v.code, v.name, v.short_name, 'GB-ENG'
from public.tournaments t
cross join (values
  ('ARS', 'Arsenal', 'Arsenal'),
  ('AVL', 'Aston Villa', 'Aston Villa'),
  ('BOU', 'AFC Bournemouth', 'Bournemouth'),
  ('BRE', 'Brentford', 'Brentford'),
  ('BHA', 'Brighton & Hove Albion', 'Brighton'),
  ('CHE', 'Chelsea', 'Chelsea'),
  ('COV', 'Coventry City', 'Coventry'),
  ('CRY', 'Crystal Palace', 'Crystal Palace'),
  ('EVE', 'Everton', 'Everton'),
  ('FUL', 'Fulham', 'Fulham'),
  ('HUL', 'Hull City', 'Hull'),
  ('IPS', 'Ipswich Town', 'Ipswich'),
  ('LEE', 'Leeds United', 'Leeds'),
  ('LIV', 'Liverpool', 'Liverpool'),
  ('MCI', 'Manchester City', 'Man City'),
  ('MUN', 'Manchester United', 'Man United'),
  ('NEW', 'Newcastle United', 'Newcastle'),
  ('NFO', 'Nottingham Forest', 'Nottm Forest'),
  ('SUN', 'Sunderland', 'Sunderland'),
  ('TOT', 'Tottenham Hotspur', 'Tottenham')
) as v(code, name, short_name)
where t.slug = 'know-your-club-2026'
on conflict (tournament_id, code) do nothing;

commit;
