# Onde paramos — 28/10/2026

## O que já está pronto e no ar

- **Formulário de cadastro** (a equipe cadastra os jovens): <https://fju-olimpia.pages.dev>
- **Painel** (jovens + torneios): <https://fju-olimpia.pages.dev/admin>
- Banco no Supabase, projeto `banco-fju-olimpia` (conta luizhenriqueperinif@gmail.com).
- Site hospedado no Cloudflare Pages, projeto `fju-olimpia` (ver comando de publicação no README).
- Protótipo das telas do painel novo (aprovado): <https://claude.ai/artifact/P4ghGu9HPwjZxahg81UwSP>

## Banco recriado — 28/10/2026

O projeto Supabase foi recriado do zero (ref `liuemzlynonyawezdcgl`, org "FJU Olimpia").
Já rodado nele: `schema.sql` + `torneios.sql` + `ao_vivo.sql` + admin `luizhenriqueperinif@gmail.com`.
`js/config.js` aponta para ele (usando a publishable key). Site publicado com o painel novo.

Login do admin criado e cadastros novos (sign up) desligados.

## Painel novo (torneios) — publicado e testado

Publicado:
- `admin.html` + `css/painel.css` + `js/painel/`:
  - `app.js` — login, rotas por `#`, menu inferior.
  - `nucleo.js` — acesso ao banco, bottom sheet, avisos, ícones, utilidades.
  - `jovens.js` — Início, lista com busca/filtros/seleção, ficha e edição do jovem.
  - `torneios.js` — lista, criar/editar torneio, abas Inscritos / Times / Jogos / Tabela.
  - `aovivo.js` — jogo ao vivo (`#/jogo/:id`): cronômetro por tempo (1º/2º tempo, prorrogação em
    2 tempos, disputa de pênaltis = período 5), gol/falta/cartões/bola fora
    por time e jogador, lance a lance com desfazer, faltas por tempo, sincroniza entre celulares
    a cada 4 s. Placar e artilharia saem dos lances de gol. Duração dos tempos fica no torneio
    (`minutos_tempo`, `minutos_prorrogacao`); acréscimo por tempo em `jogos.acrescimo_seg`.
  - `chaveamento.js` — regras dos torneios, testadas (`node tests/chaveamento.test.mjs`).
- O `js/admin.js` antigo foi removido.
- Testado no navegador (banco antigo): Início, Jovens e Ficha funcionam.

Teste completo feito no site publicado (28/10): criar torneio → sugestão de inscritos →
sortear 4 times → grupo → final com pênaltis → campeão, tabela, artilharia e ficha do jovem.
Os dados de teste foram apagados; o banco está zerado.

Também testado (28/10): os 3 formatos (mata-mata com 5 times e quem passa direto, pontos corridos,
2 grupos + mata-mata), ações de times/inscritos/jovens, formulário real, login automático
(quem já entrou abre o link e cai direto no painel; o formulário fica em `index.html#cadastrar`)
e o jogo ao vivo de ponta a ponta. Dados de teste apagados.

## Outras ideias anotadas
- Campo "Cadastrado por" (quem da equipe fez o cadastro) — sugerido, ainda não confirmado.
- Para dar acesso ao painel a mais alguém: criar usuário em Supabase → Authentication → Users
  e rodar `insert into public.admins (email) values ('email@...');`
