-- FC Barrios 2.0
-- Migration 010: Player avatar uploads through Supabase Storage
-- Run after migration 009.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view avatars"
  on storage.objects;

create policy "Public can view avatars"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "Players can upload own avatars"
  on storage.objects;

create policy "Players can upload own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Players can update own avatars"
  on storage.objects;

create policy "Players can update own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Players can delete own avatars"
  on storage.objects;

create policy "Players can delete own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = auth.uid()::text
);

create or replace function public.update_my_avatar_url(
  new_avatar_url text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_url text;
begin
  if auth.uid() is null then
    raise exception 'Du må være logget inn.';
  end if;

  update public.players
  set avatar_url = nullif(trim(new_avatar_url), '')
  where auth_user_id = auth.uid()
  returning avatar_url into updated_url;

  if not found then
    raise exception 'Fant ingen spiller koblet til kontoen.';
  end if;

  return updated_url;
end;
$$;

grant execute on function public.update_my_avatar_url(text)
to authenticated;

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
    'player_id', p.id,
    'name', p.display_name,
    'avatar_url', p.avatar_url,
    'tournaments_played', coalesce(hof.tournaments_played, 0),
    'titles', coalesce(hof.titles, 0),
    'podiums', coalesce(hof.podiums, 0),
    'best_finish', hof.best_finish,
    'average_finish', hof.average_finish,
    'total_correct_predictions', coalesce(hof.total_correct_predictions, 0),
    'average_percentile', coalesce(hof.average_percentile, 0)
  )
  into profile_data
  from public.players p
  left join public.hall_of_fame_view hof
    on hof.player_id = p.id
  where p.id = target_player_id;

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

notify pgrst, 'reload schema';
