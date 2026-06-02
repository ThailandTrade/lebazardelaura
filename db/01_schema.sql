-- Le bazar de Laura — schéma initial (base dédiée bazar_laura)
-- À exécuter en tant que superuser sur la base bazar_laura.

-- Catégories adaptées à une librairie française
do $$ begin
  create type book_category as enum (
    'roman', 'polar_thriller', 'sf_fantasy', 'bd_manga', 'jeunesse',
    'documentaire', 'essai_bio', 'cuisine_loisirs', 'art_beaux_livres',
    'poesie_theatre', 'magazine', 'scolaire_langues', 'autre'
  );
exception when duplicate_object then null; end $$;

-- État du livre
do $$ begin
  create type book_condition as enum (
    'neuf', 'comme_neuf', 'tres_bon', 'bon', 'correct'
  );
exception when duplicate_object then null; end $$;

-- Statut dans le stock
do $$ begin
  create type book_status as enum (
    'disponible', 'reserve', 'vendu', 'masque'
  );
exception when duplicate_object then null; end $$;

create table if not exists books (
  id             uuid primary key default gen_random_uuid(),  -- natif PG 13+
  isbn           text,                          -- ISBN-13 normalisé (null possible : magazines sans ISBN)
  title          text not null,
  subtitle       text,
  authors        text[] default '{}',
  publisher      text,
  published_date text,                          -- format brut de l'API (année ou date)
  description    text,
  cover_url      text,                          -- URL d'API ou chemin /uploads/covers/...
  language       text default 'fr',
  page_count     int,
  category       book_category default 'autre',
  condition      book_condition default 'bon',
  price          numeric(8,2) not null,         -- en THB
  status         book_status default 'disponible',
  notes          text,                          -- notes INTERNES (jamais exposées publiquement)
  source         text,                          -- 'google_books' | 'open_library' | 'manuel'
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists books_status_idx on books (status);
create index if not exists books_category_idx on books (category);

-- Admin (Laura) pour Auth.js credentials
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,                  -- bcrypt / argon2
  created_at    timestamptz default now()
);

-- maintien automatique de updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists books_set_updated_at on books;
create trigger books_set_updated_at
  before update on books
  for each row execute function set_updated_at();
