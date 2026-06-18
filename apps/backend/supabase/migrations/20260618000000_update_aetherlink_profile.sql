create or replace function public.update_aetherlink_profile(p_fields jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  update public.profiles
  set
    full_name = coalesce(p_fields->>'full_name', full_name),
    headline = coalesce(p_fields->>'headline', headline),
    location = coalesce(p_fields->>'location', location),
    preferred_job_types = coalesce(p_fields->'preferred_job_types', to_jsonb(preferred_job_types))::text[],
    salary_floor = coalesce((p_fields->>'salary_floor')::integer, salary_floor),
    auto_apply_enabled = coalesce((p_fields->>'auto_apply_enabled')::boolean, auto_apply_enabled),
    auto_apply_threshold = coalesce((p_fields->>'auto_apply_threshold')::integer, auto_apply_threshold),
    skills = coalesce(p_fields->'skills', to_jsonb(skills))::text[],
    certifications = coalesce(p_fields->'certifications', to_jsonb(certifications))::text[],
    gmail_email = coalesce(p_fields->>'gmail_email', gmail_email),
    gmail_refresh_token_encrypted = coalesce(p_fields->>'gmail_refresh_token_encrypted', gmail_refresh_token_encrypted),
    consent_given_at = coalesce((p_fields->>'consent_given_at')::timestamptz, consent_given_at),
    daily_apply_count = coalesce((p_fields->>'daily_apply_count')::integer, daily_apply_count),
    daily_apply_reset_at = coalesce((p_fields->>'daily_apply_reset_at')::date, daily_apply_reset_at)
  where user_id = v_user_id;

  select *
  into v_profile
  from public.profiles
  where user_id = v_user_id;

  if v_profile is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;
