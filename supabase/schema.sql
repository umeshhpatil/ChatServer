-- ==============================================================================
-- Discord-Style Chat App Schema for Supabase
-- Tables, Triggers, RLS Policies, Database Functions, and Realtime Configuration
-- Fully Idempotent with Security Definer helpers to prevent RLS recursion
-- ==============================================================================

-- GRANTS: Ensure roles can access public schema
grant usage on schema public to anon, authenticated;

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  status text default 'offline',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Profiles viewable by everyone (public access so anon can view usernames / preview invites)
drop policy if exists "Public profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Trigger to create profile upon Supabase Auth sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  raw_user_name text;
begin
  raw_user_name := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  
  if exists (select 1 from public.profiles where username = raw_user_name) then
    raw_user_name := raw_user_name || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    raw_user_name,
    'https://api.dicebear.com/7.x/bottts/svg?seed=' || raw_user_name
  )
  on conflict (id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url;
    
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. FRIENDSHIPS TABLE
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  constraint unique_friendship unique (requester_id, addressee_id),
  constraint no_self_friending check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

drop policy if exists "Users can view friendships they are part of" on public.friendships;
create policy "Users can view friendships they are part of"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "Users can send friend requests" on public.friendships;
create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

drop policy if exists "Users can update friendships they are part of" on public.friendships;
create policy "Users can update friendships they are part of"
  on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid() or requester_id = auth.uid())
  with check (
    (addressee_id = auth.uid() and status in ('accepted', 'declined')) or
    status = 'declined'
  );


-- 3. GROUPS TABLE
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  icon_url text,
  created_at timestamptz default now()
);

alter table public.groups enable row level security;


-- 4. GROUP MEMBERS TABLE
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  constraint unique_group_member unique (group_id, user_id)
);

alter table public.group_members enable row level security;

-- SECURITY DEFINER HELPERS TO PREVENT RLS INFINITE RECURSION
create or replace function public.is_group_member(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

create or replace function public.is_group_admin(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id and role in ('owner', 'admin')
  );
$$;

-- Group RLS
drop policy if exists "Members can view groups they belong to" on public.groups;
create policy "Members can view groups they belong to"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

drop policy if exists "Users can create groups" on public.groups;
create policy "Users can create groups"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Group owners can update group info" on public.groups;
create policy "Group owners can update group info"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Group owners can delete group" on public.groups;
create policy "Group owners can delete group"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- Group Members RLS (using helper to avoid recursion)
drop policy if exists "Members can view group membership" on public.group_members;
create policy "Members can view group membership"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "Admins and owners can update roles or remove members" on public.group_members;
create policy "Admins and owners can update roles or remove members"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid() or
    public.is_group_admin(group_id)
  );

-- Database function to create a group and automatically enroll the creator as 'owner'
create or replace function public.create_group_with_owner(group_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_group_id uuid;
begin
  insert into public.groups (name, owner_id)
  values (group_name, auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'owner');

  return new_group_id;
end;
$$;

-- Trigger to broadcast celebratory join message in real time when a new member joins
create or replace function public.on_group_member_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  grp_owner_id uuid;
begin
  select owner_id into grp_owner_id from public.groups where id = new.group_id;

  -- Broadcast join event for all joins (skip only the very first creation by owner)
  if grp_owner_id is distinct from new.user_id or new.role <> 'owner' then
    insert into public.messages (
      chat_type,
      chat_id,
      sender_id,
      body,
      created_at
    )
    values (
      'group',
      new.group_id,
      new.user_id,
      'joined the server. Welcome! 🎉',
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists tr_on_group_member_joined on public.group_members;
create trigger tr_on_group_member_joined
  after insert on public.group_members
  for each row execute procedure public.on_group_member_joined();


-- 5. GROUP INVITES TABLE (Direct friend invitations)
create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  constraint unique_group_invite unique (group_id, invitee_id)
);

alter table public.group_invites enable row level security;

drop policy if exists "members can invite" on public.group_invites;
create policy "members can invite"
  on public.group_invites for insert
  to authenticated
  with check (
    inviter_id = auth.uid() and public.is_group_member(group_id)
  );

drop policy if exists "see own invites" on public.group_invites;
create policy "see own invites"
  on public.group_invites for select
  to authenticated
  using (invitee_id = auth.uid() or inviter_id = auth.uid());

drop policy if exists "decline own invite" on public.group_invites;
create policy "decline own invite"
  on public.group_invites for update
  to authenticated
  using (invitee_id = auth.uid())
  with check (status = 'declined');

-- Function to accept a direct group invite
create or replace function public.accept_group_invite(invite uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  g uuid;
begin
  update public.group_invites
  set status = 'accepted'
  where id = invite and invitee_id = auth.uid() and status = 'pending'
  returning group_id into g;

  if g is null then
    raise exception 'Invite not found or already processed';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (g, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
end;
$$;


-- 6. GROUP INVITE LINKS TABLE (Shareable links)
create table if not exists public.group_invite_links (
  code text primary key default substr(md5(random()::text), 1, 10),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses int not null default 25,
  uses int not null default 0,
  created_at timestamptz default now()
);

alter table public.group_invite_links enable row level security;

drop policy if exists "admins create links" on public.group_invite_links;
create policy "admins create links"
  on public.group_invite_links for insert
  to authenticated
  with check (
    created_by = auth.uid() and public.is_group_admin(group_id)
  );

drop policy if exists "members can see group invite links" on public.group_invite_links;
create policy "members can see group invite links"
  on public.group_invite_links for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "admins can revoke links" on public.group_invite_links;
create policy "admins can revoke links"
  on public.group_invite_links for delete
  to authenticated
  using (public.is_group_admin(group_id));

-- Function to join group using shareable code
create or replace function public.join_group_with_code(invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  g uuid;
begin
  select group_id into g
  from public.group_invite_links
  where code = invite_code
    and expires_at > now()
    and uses < max_uses;

  if g is null then
    raise exception 'Invite link is invalid or expired';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (g, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  update public.group_invite_links
  set uses = uses + 1
  where code = invite_code;

  return g;
end;
$$;

-- Function to preview invite code details for unjoined users
create or replace function public.preview_invite_code(invite_code text)
returns table (
  code text,
  group_id uuid,
  group_name text,
  member_count bigint,
  is_valid boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    gil.code,
    g.id as group_id,
    g.name as group_name,
    (select count(*) from public.group_members gm where gm.group_id = g.id) as member_count,
    (gil.expires_at > now() and gil.uses < gil.max_uses) as is_valid
  from public.group_invite_links gil
  join public.groups g on g.id = gil.group_id
  where gil.code = invite_code;
end;
$$;


-- 7. MESSAGES TABLE
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_type text not null check (chat_type in ('dm', 'group')),
  chat_id uuid not null, -- references either friendships(id) or groups(id)
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  client_id text unique,
  created_at timestamptz default now()
);

create index if not exists idx_messages_chat on public.messages (chat_id, created_at asc);

alter table public.messages enable row level security;

drop policy if exists "Users can view messages in their chats" on public.messages;
create policy "Users can view messages in their chats"
  on public.messages for select
  to authenticated
  using (
    (chat_type = 'dm' and exists (
      select 1 from public.friendships f
      where f.id = messages.chat_id
        and f.status = 'accepted'
        and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    ))
    or
    (chat_type = 'group' and public.is_group_member(chat_id))
  );

drop policy if exists "Users can insert messages into their chats" on public.messages;
create policy "Users can insert messages into their chats"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid() and
    (
      (chat_type = 'dm' and exists (
        select 1 from public.friendships f
        where f.id = messages.chat_id
          and f.status = 'accepted'
          and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
      ))
      or
      (chat_type = 'group' and public.is_group_member(chat_id))
    )
  );


-- 8. LEAST-PRIVILEGE PERMISSION GRANTS
-- Revoke broad permissions and grant only what is required
revoke all on all tables in schema public from anon;
revoke all on all routines in schema public from anon;

-- Anon role: read-only access to profiles and invite link validation
grant usage on schema public to anon;
grant select on public.profiles to anon;
grant execute on function public.preview_invite_code(text) to anon;

-- Authenticated role: full access guarded strictly by Row-Level Security (RLS)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all routines in schema public to authenticated;


-- 9. SUPABASE REALTIME CONFIGURATION
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.group_invites;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.group_members;
exception when others then null;
end $$;
