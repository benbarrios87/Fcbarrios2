-- FC Barrios 2.0
-- Migration 009: Public player profiles and career data
-- Run after migration 008.

begin;

create or replace function public.get_public_player_profile(
  target_player_id uuid,
  target_tournament_slug text default 'euro-2028'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  profile_data jsonb;
  career_data jsonb;
  current_data jsonb;
begin
  select jsonb_build_object(
    'player_id', hof.player_id,
    'name', hof.name,
    'tournaments_played', hof.tournaments_played,
    'titles', hof.titles,
    'podiums', hof.podiums,
    'best_finish', hof.best_finish,
    'average_finish', hof.average_finish,
    'total_correct_predictions', hof.total_correct_predictions,
    'average_percentile', hof.average_percentile
  )
  into profile_data
  from public.hall_of_fame_view hof
  where hof.player_id = target_player_id;

  if profile_data is null then
    select jsonb_build_object(
      'player_id', p.id,
      'name', p.display_name,
      'tournaments_played', 0,
      'titles', 0,
      'podiums', 0,
      'best_finish', null,
      'average_finish', null,
      'total_correct_predictions', 0,
      'average_percentile', 0
    )
    into profile_data
    from public.players p
    where p.id = target_player_id;
  end if;

  if profile_data is null then
    raise exception 'Spilleren finnes ikke.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tournament', ch.tournament_name,
        'slug', ch.tournament_slug,
        'year', ch.year,
        'competition_type', ch.competition_type,
        'rank', ch.final_rank,
        'field_size', ch.field_size,
        'correct_predictions', ch.correct_predictions,
        'points', ch.points,
        'is_champion', ch.is_champion,
        'percentile', ch.percentile
      )
      order by ch.year desc
    ),
    '[]'::jsonb
  )
  into career_data
  from public.career_history_view ch
  where ch.player_id = target_player_id;

  select coalesce(
    jsonb_build_object(
      'rank', lv.rank,
      'points', lv.points,
      'exact_hits', lv.exact_hits,
      'difference_hits', coalesce(lv.difference_hits, 0),
      'outcome_hits', coalesce(lv.outcome_hits, 0),
      'form_points', lv.form_points
    ),
    jsonb_build_object(
      'rank', null,
      'points', 0,
      'exact_hits', 0,
      'difference_hits', 0,
      'outcome_hits', 0,
      'form_points', 0
    )
  )
  into current_data
  from public.tournaments t
  left join public.leaderboard_view lv
    on lv.tournament_id = t.id
   and lv.id = target_player_id
  where t.slug = target_tournament_slug
  limit 1;

  return profile_data
    || jsonb_build_object(
      'career', career_data,
      'current', current_data
    );
end;
$$;

grant execute on function public.get_public_player_profile(uuid, text)
to anon, authenticated;

commit;
