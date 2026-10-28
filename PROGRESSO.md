# Onde paramos — 28/10/2026

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

## Painel novo (torneios) — código pronto, falta testar com o banco

Tudo escrito (ainda não publicado):
- `admin.html` + `css/painel.css` + `js/painel/`:
  - `app.js` — login, rotas por `#`, menu inferior.
  - `nucleo.js` — acesso ao banco, bottom sheet, avisos, ícones, utilidades.
  - `jovens.js` — Início, lista com busca/filtros/seleção, ficha e edição do jovem.
  - `torneios.js` — lista, criar/editar torneio, abas Inscritos / Times / Jogos / Tabela.
  - `chaveamento.js` — regras dos torneios, testadas (`node tests/chaveamento.test.mjs`).
- O `js/admin.js` antigo foi removido.
- Testado no navegador (localhost): Início, Jovens e Ficha funcionam com os dados reais.
  As telas de torneio mostram o aviso “rode o torneios.sql” até o banco ter as tabelas.

Próximos passos:
1. Rodar `supabase/torneios.sql` (ver seção acima).
2. Testar um torneio de ponta a ponta (criar → inscrever → sortear times → gerar jogos →
   lançar placares → próxima fase → campeão) no celular.
3. Apagar os cadastros de teste (“TESTE Claude”, “Teste Formulario”).
4. Publicar no Cloudflare (comando no README).

## Outras ideias anotadas
- Campo "Cadastrado por" (quem da equipe fez o cadastro) — sugerido, ainda não confirmado.
- Para dar acesso ao painel a mais alguém: criar usuário em Supabase → Authentication → Users
  e rodar `insert into public.admins (email) values ('email@...');`
