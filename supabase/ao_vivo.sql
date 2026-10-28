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
  tipo         text not null check (tipo in ('gol', 'falta', 'amarelo', 'vermelho', 'fora')),
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
