do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
exception when duplicate_object then null; end $$;

create table if not exists public.member_invoices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  plan_id uuid references public.membership_plans on delete set null,
  invoice_number text not null unique,
  description text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'USD',
  due_date date not null,
  status invoice_status not null default 'draft',
  issued_by uuid references auth.users on delete set null,
  emailed_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists member_invoices_gym_id_idx on public.member_invoices (gym_id, created_at desc);
create index if not exists member_invoices_user_id_idx on public.member_invoices (user_id, created_at desc);

alter table public.member_invoices enable row level security;

drop policy if exists "member invoices readable by members" on public.member_invoices;
create policy "member invoices readable by members"
on public.member_invoices for select
using (
  public.is_gym_staff(gym_id)
  or auth.uid() = user_id
);

drop policy if exists "member invoices insert by staff" on public.member_invoices;
create policy "member invoices insert by staff"
on public.member_invoices for insert
with check (public.is_gym_staff(gym_id));

drop policy if exists "member invoices update by staff" on public.member_invoices;
create policy "member invoices update by staff"
on public.member_invoices for update
using (public.is_gym_staff(gym_id));
