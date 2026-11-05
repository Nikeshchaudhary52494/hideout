-- Runs on every start; every statement is idempotent.
-- Lives in its own schema (not `public`), so Supabase's auto-generated REST API never exposes it.
create schema if not exists hideout;

create table if not exists hideout.users (
  id          text primary key,             -- random UUID made by the phone
  username    text not null,
  push_token  text,                         -- Expo push token for disguised nudges
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create unique index if not exists users_username_ci on hideout.users (lower(username));

-- One-way contact list: user_id sees friend_id in their chats.
create table if not exists hideout.friends (
  user_id    text not null references hideout.users (id) on delete cascade,
  friend_id  text not null references hideout.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Archive of every message. Phones keep their own copy; this one is the backup.
create table if not exists hideout.messages (
  id            text primary key,
  sender_id     text not null references hideout.users (id) on delete cascade,
  recipient_id  text not null references hideout.users (id) on delete cascade,
  text          text not null default '',
  image         jsonb,                      -- {w, h} only; photo bytes stay on the phones
  reply_to      text,
  reactions     jsonb not null default '{}', -- userId -> emoji
  edited        boolean not null default false,
  sent_at       timestamptz not null,
  read_at       timestamptz
);
create index if not exists messages_conversation on hideout.messages (sender_id, recipient_id, sent_at);

-- Events waiting for someone who is offline (including photos). Deleted once delivered.
create table if not exists hideout.mailbox (
  id          bigserial primary key,
  user_id     text not null references hideout.users (id) on delete cascade,
  payload     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists mailbox_user on hideout.mailbox (user_id, id);
