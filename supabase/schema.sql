create extension if not exists pgcrypto;

-- Re-run safe reset: if the app tables already exist, wipe and recreate them so the SQL can be re-applied without manual deletion.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.redeem_connect_code(text) cascade;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.statuses cascade;
drop table if exists public.connect_codes cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations cascade;
drop table if exists public.profiles cascade;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists bio text;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('text', 'voice')),
  content text,
  audio_url text,
  duration_seconds numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.connect_codes (
  code text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('text', 'image', 'video')),
  content text,
  media_url text,
  caption text,
  background text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.redeem_connect_code(input_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  code_owner uuid;
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  select
    id,
    email,
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'avatar_url'
  from auth.users
  where id = auth.uid()
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);

  update public.connect_codes
  set used_at = now()
  where code = upper(trim(input_code))
    and used_at is null
    and expires_at > now()
    and owner_id <> auth.uid()
  returning owner_id into code_owner;

  if code_owner is null then
    raise exception 'Invalid, expired, or already used connection code';
  end if;

  return code_owner;
end;
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.connect_codes enable row level security;
alter table public.statuses enable row level security;

create policy "Authenticated users can read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Users update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Participants read conversations" on public.conversations
  for select using (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );
create policy "Authenticated users create conversations" on public.conversations
  for insert with check (auth.role() = 'authenticated');
create policy "Users can insert their own conversation membership" on public.conversations
  for insert with check (true);

drop policy if exists "Participants read participant rows" on public.conversation_participants;
create policy "Participants read participant rows" on public.conversation_participants
  for select using (user_id = auth.uid());
create policy "Authenticated users add participants" on public.conversation_participants
  for insert with check (auth.role() = 'authenticated');

create policy "Participants read messages" on public.messages
  for select using (exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  ));
create policy "Participants send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "Users manage their own connect codes" on public.connect_codes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Authenticated users read active statuses" on public.statuses;
create policy "Authenticated users read active statuses" on public.statuses
  for select using (auth.role() = 'authenticated' and expires_at > now());
drop policy if exists "Users create their own statuses" on public.statuses;
create policy "Users create their own statuses" on public.statuses
  for insert with check (auth.uid() = author_id);
drop policy if exists "Users delete their own statuses" on public.statuses;
create policy "Users delete their own statuses" on public.statuses
  for delete using (auth.uid() = author_id);

grant execute on function public.redeem_connect_code(text) to authenticated;