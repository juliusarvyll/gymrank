create table if not exists public.activity_reactions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms on delete cascade,
  activity_event_id uuid not null references public.activity_events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (activity_event_id, user_id)
);

create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms on delete cascade,
  activity_event_id uuid not null references public.activity_events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.activity_reactions enable row level security;
drop policy if exists "activity reactions readable by members" on public.activity_reactions;
create policy "activity reactions readable by members"
on public.activity_reactions for select
using (public.is_gym_member(gym_id));
drop policy if exists "activity reactions insert by members" on public.activity_reactions;
create policy "activity reactions insert by members"
on public.activity_reactions for insert
with check (auth.uid() = user_id and public.is_gym_member(gym_id));
drop policy if exists "activity reactions delete by members" on public.activity_reactions;
create policy "activity reactions delete by members"
on public.activity_reactions for delete
using (auth.uid() = user_id);

alter table public.activity_comments enable row level security;
drop policy if exists "activity comments readable by members" on public.activity_comments;
create policy "activity comments readable by members"
on public.activity_comments for select
using (public.is_gym_member(gym_id));
drop policy if exists "activity comments insert by members" on public.activity_comments;
create policy "activity comments insert by members"
on public.activity_comments for insert
with check (auth.uid() = user_id and public.is_gym_member(gym_id));
drop policy if exists "activity comments delete by members" on public.activity_comments;
create policy "activity comments delete by members"
on public.activity_comments for delete
using (auth.uid() = user_id);
