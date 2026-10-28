-- =============================================================
--  Banco FJU Olímpia — estrutura do banco de dados (Supabase)
--  Cole tudo isto em: Supabase > SQL Editor > New query > Run
-- =============================================================

-- Tabela principal de cadastros
create table if not exists public.cadastros (
  id                bigint generated always as identity primary key,
  criado_em         timestamptz not null default now(),
  nome              text not null check (char_length(nome) between 2 and 120),
  sexo              text check (sexo in ('menino', 'menina')),
  telefone          text not null check (char_length(telefone) between 8 and 20),
  data_nascimento   date,
  endereco          text not null check (char_length(endereco) between 3 and 200),
  bairro            text not null check (char_length(bairro) between 2 and 80),
  esportes          text[] not null check (cardinality(esportes) between 1 and 20),
  esporte_preferido text not null,
  topa_campeonatos  text not null check (topa_campeonatos in ('sim', 'talvez', 'nao')),
  frequenta_igreja  boolean not null,
  igreja_nome       text check (char_length(igreja_nome) <= 120),
  consentimento     boolean not null check (consentimento = true),
  constraint preferido_esta_na_lista check (esporte_preferido = any (esportes))
);

-- (bancos criados antes deste campo existir)
alter table public.cadastros add column if not exists sexo text check (sexo in ('menino', 'menina'));

create index if not exists cadastros_esportes_idx on public.cadastros using gin (esportes);
create index if not exists cadastros_criado_em_idx on public.cadastros (criado_em desc);

-- Lista de e-mails que podem ver/gerenciar os cadastros
create table if not exists public.admins (
  email text primary key
);

-- Retorna true se o usuário logado está na lista de admins
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

grant execute on function public.is_admin() to authenticated;

grant select, insert, update, delete on public.cadastros to authenticated;

-- ---------- Segurança (Row Level Security) ----------
alter table public.cadastros enable row level security;
alter table public.admins    enable row level security;  -- sem policies = ninguém acessa pela API

-- só os admins cadastram jovens (o formulário exige login)
drop policy if exists "qualquer pessoa pode se cadastrar" on public.cadastros;
drop policy if exists "admins podem cadastrar" on public.cadastros;
create policy "admins podem cadastrar"
  on public.cadastros for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins podem ver" on public.cadastros;
create policy "admins podem ver"
  on public.cadastros for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins podem editar" on public.cadastros;
create policy "admins podem editar"
  on public.cadastros for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins podem excluir" on public.cadastros;
create policy "admins podem excluir"
  on public.cadastros for delete
  to authenticated
  using (public.is_admin());

-- =============================================================
--  DEPOIS de criar seu usuário em Authentication > Users,
--  rode a linha abaixo trocando pelo seu e-mail (uma por admin):
--
--  insert into public.admins (email) values ('seuemail@exemplo.com');
-- =============================================================
