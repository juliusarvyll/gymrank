do $$ begin
  create type billing_interval as enum ('weekly', 'monthly', 'quarterly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type class_booking_status as enum ('booked', 'waitlisted', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms on delete cascade,
  name text not null,
  description text,
  billing_interval billing_interval not null default 'monthly',
  price_cents int not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table public.gym_memberships
  add column if not exists plan_id uuid references public.membership_plans on delete set null;

alter table public.class_sessions
  add column if not exists capacity int,
  add column if not exists waitlist_capacity int;

create table if not exists public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  status class_booking_status not null default 'booked',
  booked_by_user_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create or replace function public.touch_class_booking_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_class_booking_update on public.class_bookings;
create trigger on_class_booking_update
before update on public.class_bookings
for each row execute procedure public.touch_class_booking_updated_at();

alter table public.membership_plans enable row level security;
create policy "membership plans readable by members"
on public.membership_plans for select
using (public.is_gym_member(gym_id));
create policy "membership plans insert by staff"
on public.membership_plans for insert
with check (public.is_gym_staff(gym_id));
create policy "membership plans update by staff"
on public.membership_plans for update
using (public.is_gym_staff(gym_id));

alter table public.class_bookings enable row level security;
create policy "class bookings readable by members"
on public.class_bookings for select
using (
  public.is_gym_member(
    (select gym_id from public.class_sessions cs where cs.id = session_id)
  )
);
create policy "class bookings insert by staff"
on public.class_bookings for insert
with check (
  public.is_gym_staff(
    (select gym_id from public.class_sessions cs where cs.id = session_id)
  )
);
create policy "class bookings update by staff"
on public.class_bookings for update
using (
  public.is_gym_staff(
    (select gym_id from public.class_sessions cs where cs.id = session_id)
  )
);
