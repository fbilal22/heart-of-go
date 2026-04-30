-- Profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text not null default 'Utilisateur',
  last_name text not null default '',
  avatar_url text,
  monthly_income numeric(10,2),
  risk_level text check (risk_level in ('CONSERVATIVE','MODERATE','AGGRESSIVE')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete using (auth.uid() = id);

-- Bank accounts
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text not null,
  account_name text not null,
  account_type text not null default 'CHECKING' check (account_type in ('CHECKING','SAVINGS','INVESTMENT')),
  balance numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  is_mock boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.bank_accounts enable row level security;
create policy "own accounts" on public.bank_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  label text not null,
  category text not null default 'OTHER' check (category in ('HOUSING','TRANSPORT','FOOD','HEALTH','ENTERTAINMENT','SHOPPING','SAVINGS','INVESTMENT','SALARY','SUBSCRIPTION','OTHER')),
  category_confidence numeric(3,2),
  is_recurring boolean not null default false,
  is_unexpected boolean not null default false,
  transaction_date date not null,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  category text not null,
  planned_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, month, year, category)
);
alter table public.budgets enable row level security;
create policy "own budgets" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Savings goals
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_amount numeric(10,2) not null,
  current_amount numeric(10,2) not null default 0,
  target_date date,
  emoji text not null default '🎯',
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.savings_goals enable row level security;
create policy "own goals" on public.savings_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.alerts enable row level security;
create policy "own alerts" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "own chat" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Risk assessments
create table public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null,
  score integer not null,
  risk_level text not null,
  created_at timestamptz not null default now()
);
alter table public.risk_assessments enable row level security;
create policy "own risk" on public.risk_assessments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger for profiles
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
for each row execute procedure public.touch_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();