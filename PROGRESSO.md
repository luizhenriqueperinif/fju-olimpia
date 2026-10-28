# Onde paramos — 28/10/2026

## O que já está pronto e no ar

- **Formulário de cadastro** (a equipe cadastra os jovens): <https://fju-olimpia.pages.dev>
- **Painel** (jovens + torneios): <https://fju-olimpia.pages.dev/admin>
- Banco no Supabase, projeto `banco-fju-olimpia` (conta luizhenriqueperinif@gmail.com).
- Site hospedado no Cloudflare Pages, projeto `fju-olimpia` (ver comando de publicação no README).
- Protótipo das telas do painel novo (aprovado): <https://claude.ai/artifact/P4ghGu9HPwjZxahg81UwSP>

## Banco recriado — 28/10/2026

O projeto Supabase foi recriado do zero (ref `liuemzlynonyawezdcgl`, org "FJU Olimpia").
Já rodado nele: `schema.sql` + `torneios.sql` + admin `luizhenriqueperinif@gmail.com`.
`js/config.js` aponta para ele (usando a publishable key). Site publicado com o painel novo.

Falta no Supabase (fazer pelo painel, com a senha escolhida pela pessoa):
1. Authentication → Users → Add user → Create new user (e-mail do admin + senha, marcar "Auto Confirm").
2. Authentication → Sign In / Providers → desligar "Allow new users to sign up".

## Painel novo (torneios) — publicado, falta testar os torneios

Publicado:
- `admin.html` + `css/painel.css` + `js/painel/`:
  - `app.js` — login, rotas por `#`, menu inferior.
  - `nucleo.js` — acesso ao banco, bottom sheet, avisos, ícones, utilidades.
  - `jovens.js` — Início, lista com busca/filtros/seleção, ficha e edição do jovem.
  - `torneios.js` — lista, criar/editar torneio, abas Inscritos / Times / Jogos / Tabela.
  - `chaveamento.js` — regras dos torneios, testadas (`node tests/chaveamento.test.mjs`).
- O `js/admin.js` antigo foi removido.
- Testado no navegador (banco antigo): Início, Jovens e Ficha funcionam.

Próximos passos:
1. Testar um torneio de ponta a ponta (criar → inscrever → sortear times → gerar jogos →
   lançar placares → próxima fase → campeão) no celular.

## Outras ideias anotadas
- Campo "Cadastrado por" (quem da equipe fez o cadastro) — sugerido, ainda não confirmado.
- Para dar acesso ao painel a mais alguém: criar usuário em Supabase → Authentication → Users
  e rodar `insert into public.admins (email) values ('email@...');`
