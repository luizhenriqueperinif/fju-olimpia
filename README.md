# Cadastro Esportivo — FJU Olímpia

Site para cadastrar a galera (nome, WhatsApp, endereço, esportes, esporte preferido,
se topa campeonatos e se frequenta igreja) e um painel da equipe para filtrar,
exportar para Excel e chamar no WhatsApp.

- `index.html` — formulário público de cadastro (é esse link que vocês divulgam)
- `admin.html` — painel com login, filtros, contagem por esporte, exportar CSV, excluir
- `supabase/schema.sql` — cria o banco de dados e as regras de segurança
- `js/config.js` — onde vão as chaves do Supabase

Tudo roda de graça: o banco fica no **Supabase** e o site no **Netlify**.

---

## 1. Criar o banco (Supabase) — ~5 min

1. Crie uma conta em <https://supabase.com> e clique em **New project**
   (região: *South America (São Paulo)*). Guarde a senha do banco.
2. No menu lateral, abra **SQL Editor → New query**, cole todo o conteúdo de
   `supabase/schema.sql` e clique em **Run**.
3. Vá em **Authentication → Sign In / Providers** e **desligue** "Allow new users to sign up"
   (assim ninguém de fora cria conta).
4. Vá em **Authentication → Users → Add user → Create new user**, coloque seu e-mail e uma
   senha e marque *Auto Confirm User*. Repita para cada pessoa da equipe.
5. Volte no **SQL Editor** e libere esses e-mails como administradores:
   ```sql
   insert into public.admins (email) values ('seuemail@gmail.com');
   ```
6. Em **Project Settings → API** copie a **Project URL** e a chave **anon public**
   e cole em `js/config.js`.

## No ar (Cloudflare Pages)

- Formulário: <https://fju-olimpia.pages.dev>
- Painel da equipe: <https://fju-olimpia.pages.dev/admin>

Para publicar uma alteração, rode na pasta do projeto (Git Bash):

```
D=$(mktemp -d) && cp -r index.html admin.html css js img "$D"/ && npx wrangler pages deploy "$D" --project-name fju-olimpia --branch main
```

(Só os arquivos do site são enviados; README e SQL ficam de fora.)

## 2. Alternativa: Netlify — ~2 min

1. Acesse <https://app.netlify.com/drop> (crie a conta se pedir).
2. Arraste a pasta **Banco_FJU** inteira para a página.
3. Pronto: o Netlify gera um link tipo `https://algum-nome.netlify.app`.
   Em **Site configuration → Change site name** dá para trocar para algo como
   `fju-olimpia-esportes.netlify.app`.

- Link para divulgar: `https://SEU-SITE.netlify.app`
- Painel da equipe: `https://SEU-SITE.netlify.app/admin.html`

Para atualizar o site depois de mudar algum arquivo, é só arrastar a pasta de novo em
**Deploys** no Netlify.

## Testar no computador

Os arquivos usam módulos JavaScript, então não abra o `index.html` com duplo clique.
Na pasta do projeto rode:

```
npx serve .
```

e acesse o endereço que aparecer (ex.: `http://localhost:3000`).

## Como usar o painel

- **Filtros**: esporte que joga, esporte preferido, topa campeonato, frequenta igreja,
  bairro, faixa de idade e busca por nome/telefone. Os botões com contagem por esporte
  também filtram ao clicar.
- **Baixar planilha (CSV)**: baixa só o que está filtrado; abre direto no Excel.
- **Copiar telefones**: copia nome + WhatsApp de quem está no filtro, para colar num grupo.
- Clique no telefone para abrir a conversa no WhatsApp.

Exemplo para montar um campeonato de futsal: *Joga = Futsal* + *Topa campeonato = Sim ou talvez*
→ **Baixar planilha**.

## Bom saber

- **Segurança**: qualquer pessoa consegue *enviar* um cadastro, mas só e-mails que estão na
  tabela `admins` conseguem *ver* os dados. A chave "anon" no `config.js` pode ser pública.
- **LGPD**: o formulário pede autorização para guardar os dados. Se alguém pedir para sair,
  é só excluir pelo painel.
- **Plano grátis do Supabase**: o projeto é pausado se ficar 7 dias sem nenhum acesso.
  Se acontecer, entre no Supabase e clique em *Restore* — nada é perdido.
- Para mudar a lista de esportes, edite `ESPORTES` em `js/comum.js`.
- **Tema escuro**: segue o tema do celular automaticamente; o botão 🌙/☀️ no topo troca na hora
  e a escolha fica salva naquele aparelho. As cores ficam em `css/estilo.css` (início do arquivo).
- **Logos**: `img/logo-tema-claro.png` (azul, para fundo claro) e `img/logo-tema-escuro.png`
  (branco, para fundo escuro). Para trocar, substitua os arquivos mantendo os nomes.
