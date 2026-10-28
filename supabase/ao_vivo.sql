-- =============================================================
--  Banco FJU Olímpia — jogo ao vivo (cronômetro e lance a lance)
--  Rode DEPOIS do torneios.sql (pode rodar mais de uma vez)
-- =============================================================

-- Cronômetro do jogo: segundos já corridos + quando foi (re)iniciado, se estiver rodando
alter table public.jogos add column if not exists cronometro_seg    int not null default 0;
alter table public.jogos add column if not exists cronometro_inicio timestamptz;
alter table public.jogos add column if not exists periodo           int not null default 1;

-- Lances do jogo: gol, falta, cartões, bola fora
create table if not exists public.eventos (
  id           bigint generated always as identity primary key,
  jogo_id      bigint not null references public.jogos (id) on delete cascade,
  time_id      bigint not null references public.times (id) on delete cascade,
  cadastro_id  bigint references public.cadastros (id) on delete set null,  -- vazio = não identificado
  tipo         text not null,
  periodo      int not null default 1,
  segundo      int not null default 0,
  criado_em    timestamptz not null default now()
);
create index if not exists eventos_jogo_idx on public.eventos (jogo_id);

alter table public.eventos enable row level security;
grant select, insert, update, delete on public.eventos to authenticated;
drop policy if exists "admins gerenciam" on public.eventos;
create policy "admins gerenciam" on public.eventos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tipos de lance (inclui a disputa de pênaltis: período 5)
alter table public.eventos drop constraint if exists eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('gol', 'falta', 'amarelo', 'vermelho', 'fora', 'penalti_gol', 'penalti_fora'));

-- Duração dos tempos (minutos) e acréscimo do tempo atual (segundos)
alter table public.torneios add column if not exists minutos_tempo       int check (minutos_tempo between 1 and 90);
alter table public.torneios add column if not exists minutos_prorrogacao int check (minutos_prorrogacao between 1 and 30);
alter table public.jogos    add column if not exists acrescimo_seg       int not null default 0 check (acrescimo_seg between 0 and 1800);
