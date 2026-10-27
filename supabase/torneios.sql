-- =============================================================
--  Banco FJU Olímpia — torneios, times, jogos e gols
--  Rode DEPOIS do schema.sql: Supabase > SQL Editor > New query > Run
--  (pode rodar mais de uma vez sem problema)
-- =============================================================

-- Menino / menina no cadastro
alter table public.cadastros
  add column if not exists sexo text check (sexo in ('menino', 'menina'));

-- Torneios
create table if not exists public.torneios (
  id                 bigint generated always as identity primary key,
  criado_em          timestamptz not null default now(),
  nome               text not null check (char_length(nome) between 2 and 120),
  esporte            text not null,
  categoria          text not null default 'misto' check (categoria in ('masculino', 'feminino', 'misto')),
  idade_min          int check (idade_min between 0 and 120),
  idade_max          int check (idade_max between 0 and 120),
  data_inicio        date,
  local              text check (char_length(local) <= 120),
  formato            text not null check (formato in ('mata_mata', 'pontos_corridos', 'grupos_mata_mata')),
  jogadores_por_time int not null default 5 check (jogadores_por_time between 1 and 30),
  status             text not null default 'inscricoes' check (status in ('inscricoes', 'times', 'andamento', 'encerrado'))
);

-- Times de cada torneio
create table if not exists public.times (
  id          bigint generated always as identity primary key,
  torneio_id  bigint not null references public.torneios (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 60),
  cor         text not null default '#4f8cff',
  grupo       text,
  capitao_id  bigint references public.cadastros (id) on delete set null
);
create index if not exists times_torneio_idx on public.times (torneio_id);

-- Jovens inscritos em cada torneio (e em qual time estão)
create table if not exists public.torneio_inscritos (
  torneio_id   bigint not null references public.torneios (id) on delete cascade,
  cadastro_id  bigint not null references public.cadastros (id) on delete cascade,
  time_id      bigint references public.times (id) on delete set null,
  inscrito_em  timestamptz not null default now(),
  primary key (torneio_id, cadastro_id)
);
create index if not exists inscritos_cadastro_idx on public.torneio_inscritos (cadastro_id);

-- Jogos
create table if not exists public.jogos (
  id           bigint generated always as identity primary key,
  torneio_id   bigint not null references public.torneios (id) on delete cascade,
  fase         text not null,             -- 'Grupo A', 'Rodada 1', 'Semifinal', 'Final'...
  mata_mata    boolean not null default false,
  rodada       int not null default 1,
  ordem        int not null default 0,
  time_a       bigint references public.times (id) on delete cascade,
  time_b       bigint references public.times (id) on delete cascade,  -- vazio = passa direto
  gols_a       int check (gols_a >= 0),
  gols_b       int check (gols_b >= 0),
  vencedor_id  bigint references public.times (id) on delete set null,  -- mata-mata (inclui pênaltis)
  data_hora    timestamptz,
  local        text,
  encerrado    boolean not null default false
);
create index if not exists jogos_torneio_idx on public.jogos (torneio_id);

-- Gols por jogador (artilharia)
create table if not exists public.gols (
  jogo_id      bigint not null references public.jogos (id) on delete cascade,
  cadastro_id  bigint not null references public.cadastros (id) on delete cascade,
  quantidade   int not null check (quantidade > 0),
  primary key (jogo_id, cadastro_id)
);

-- ---------- Segurança: só administradores ----------
do $$
declare t text;
begin
  foreach t in array array['torneios', 'times', 'torneio_inscritos', 'jogos', 'gols'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "admins gerenciam" on public.%I', t);
    execute format('create policy "admins gerenciam" on public.%I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Admins também podem editar cadastros (ficha do jovem)
grant update on public.cadastros to authenticated;
