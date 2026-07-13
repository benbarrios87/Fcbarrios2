insert into public.tournaments (
  id,
  slug,
  name,
  short_name,
  status,
  host_label,
  starts_at,
  tips_deadline,
  buy_in,
  participant_count,
  prize_pool
)
values (
  '11111111-1111-1111-1111-111111111111',
  'euro-2028',
  'EM 2028',
  'EURO 2028',
  'planning',
  'Storbritannia og Irland',
  '2028-06-09 18:00:00+02',
  '2028-06-09 17:45:00+02',
  600,
  0,
  0
)
on conflict (slug) do nothing;

insert into public.achievements (code, name, description, icon)
values
  ('exact-five', 'Fulltreffer', 'Fem eksakte resultater i samme turnering.', '🎯'),
  ('tier-four-hit', 'Gærning', 'Treff på en tier 4-outsider.', '🧨'),
  ('champion', 'Mester', 'Vinn en FC Barrios-turnering.', '🏆')
on conflict (code) do nothing;
