# Onde paramos — 27/10/2026

## O que já está pronto e no ar

- **Formulário de cadastro** (a equipe cadastra os jovens): <https://fju-olimpia.pages.dev>
- **Painel simples** (lista, filtros, planilha, excluir): <https://fju-olimpia.pages.dev/admin>
- Banco no Supabase, projeto `banco-fju-olimpia` (conta luizhenriqueperinif@gmail.com).
- Site hospedado no Cloudflare Pages, projeto `fju-olimpia` (ver comando de publicação no README).
- Protótipo das telas do painel novo (aprovado): <https://claude.ai/artifact/P4ghGu9HPwjZxahg81UwSP>

## ⚠️ Pendente ANTES de publicar de novo

O código local já tem o campo **menino/menina** (formulário, filtro e planilha do painel),
mas o banco ainda **não tem a coluna**. Se publicar agora, os cadastros novos vão falhar.

1. Entrar no Supabase com a conta certa (o Chrome do trabalho estava logado em outra conta).
2. Projeto `banco-fju-olimpia` → SQL Editor → colar e rodar **`supabase/torneios.sql`**
   (cria a coluna `sexo` + tabelas de torneios, times, inscritos, jogos e gols, com segurança só para admins).
3. Conferir: <https://mzvmzajlamxdzerfeazg.supabase.co/rest/v1/cadastros?select=sexo&limit=1>
   com a anon key não pode dar erro `42703`.
4. Só então publicar (comando no README).

## Painel novo (torneios) — em construção

Telas aprovadas no protótipo: Início, Jovens, Ficha do jovem, Torneios, Criar torneio,
Torneio › Inscritos / Times / Jogos / Tabela.

Feito:
- `supabase/torneios.sql` — estrutura do banco (ainda não rodado).
- `js/painel/chaveamento.js` — regras dos torneios, testadas (`node tests/chaveamento.test.mjs`):
  todos contra todos, divisão em grupos, mata-mata com quem passa direto, próxima fase,
  classificação (pontos, vitórias, saldo, gols), classificados dos grupos e sorteio de
  times equilibrado por idade.

Falta (próximos passos, nesta ordem):
1. `css/painel.css` — estilos do app (menu inferior, abas, cartões, "bottom sheet", aviso/toast).
2. Substituir `admin.html` + `js/admin.js` por um app de uma página com rotas por `#`:
   `#/` início · `#/jovens` · `#/jovem/:id` · `#/torneios` · `#/torneios/novo` ·
   `#/torneio/:id/inscritos|times|jogos|tabela`. Manter o login atual (Supabase Auth + tabela `admins`).
3. Jovens: busca, filtros (inclui menino/menina), seleção de vários → "Adicionar a torneio";
   ficha com WhatsApp, edição, torneios do jovem.
4. Torneio › Inscritos: sugerir quem combina (esporte, categoria, idade, topa campeonato) +
   "Adicionar todos" / escolher um a um.
5. Times: sortear (`sortearTimes`), criar/renomear/excluir time, mover jogador, capitão.
6. Jogos: gerar conforme o formato, lançar placar e gols por jogador, pênaltis no mata-mata,
   "Gerar próxima fase", enviar no WhatsApp.
7. Tabela: classificação por grupo, chave do mata-mata, campeão, artilharia.
8. Rodar `torneios.sql`, testar tudo no celular e publicar.

## Outras ideias anotadas
- Campo "Cadastrado por" (quem da equipe fez o cadastro) — sugerido, ainda não confirmado.
- Para dar acesso ao painel a mais alguém: criar usuário em Supabase → Authentication → Users
  e rodar `insert into public.admins (email) values ('email@...');`
