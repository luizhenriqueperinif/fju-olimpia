import { configurado } from "../comum.js";
import { supabase, render, carregando, icone, fecharSheet, esquecerCadastros, e } from "./nucleo.js";
import { telaInicio, telaJovens, telaJovem } from "./jovens.js";
import { telaTorneios, telaFormTorneio, telaTorneio } from "./torneios.js";

const $ = (id) => document.getElementById(id);

// ---------- Menu inferior ----------
const ITENS_MENU = { inicio: ["inicio", "Início"], jovens: ["jovens", "Jovens"], torneios: ["trofeu", "Torneios"], cadastrar: ["mais", "Cadastrar"] };
document.querySelectorAll(".nav-inferior a").forEach((a) => {
  const [ic, rotulo] = ITENS_MENU[a.dataset.secao];
  a.innerHTML = icone(ic) + rotulo;
});

// ---------- Rotas ----------
const ROTAS = [
  [/^#?\/?$/, "inicio", () => telaInicio()],
  [/^#\/jovens$/, "jovens", () => telaJovens()],
  [/^#\/jovem\/(\d+)$/, "jovens", (id) => telaJovem(Number(id))],
  [/^#\/torneios$/, "torneios", () => telaTorneios()],
  [/^#\/torneios\/novo$/, "torneios", () => telaFormTorneio()],
  [/^#\/torneio\/(\d+)\/editar$/, "torneios", (id) => telaFormTorneio(Number(id))],
  [/^#\/torneio\/(\d+)(?:\/(\w+))?$/, "torneios", (id, aba) => telaTorneio(Number(id), aba || "inscritos")],
];

let rotaAnterior = null;

async function rotear() {
  fecharSheet();
  const hash = location.hash || "#/";
  const achou = ROTAS.find(([re]) => re.test(hash));
  if (!achou) { location.hash = "#/"; return; }
  const [re, secao, abrir] = achou;
  document.querySelectorAll(".nav-inferior a").forEach((a) => a.classList.toggle("ativo", a.dataset.secao === secao));

  // trocar de aba dentro do mesmo torneio não volta ao topo nem pisca "carregando"
  const mesmaTela = rotaAnterior && rotaAnterior.split("/").slice(0, 3).join("/") === hash.split("/").slice(0, 3).join("/");
  if (!mesmaTela) {
    render(carregando(), {});
    window.scrollTo(0, 0);
  }
  rotaAnterior = hash;
  try {
    await abrir(...hash.match(re).slice(1));
  } catch (erro) {
    console.error(erro);
    const faltaTabela = /schema cache|does not exist/i.test(erro?.message ?? "");
    render(`<div class="pagina"><div class="aviso">${faltaTabela
      ? "O banco ainda não tem as tabelas de torneio. Rode o arquivo <code>supabase/torneios.sql</code> no SQL Editor do Supabase."
      : "Não foi possível abrir esta tela: " + e(erro?.message ?? erro)}</div></div>`, {});
  }
}
window.addEventListener("hashchange", rotear);

// ---------- Login ----------
let usuarioAtual = null;

async function mostrar(sessao) {
  const mesmo = sessao?.user?.id === usuarioAtual;
  usuarioAtual = sessao?.user?.id ?? null;
  $("tela-login").hidden = !!sessao;
  $("tela-app").hidden = !sessao;
  document.body.classList.toggle("painel", !!sessao);
  if (!sessao || mesmo) return;

  const { data: ehAdmin } = await supabase.rpc("is_admin");
  $("sem-permissao").hidden = !!ehAdmin;
  $("app").hidden = !ehAdmin;
  if (ehAdmin) rotear();
}

$("form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const erro = $("erro-login");
  erro.classList.add("oculto");
  const { error } = await supabase.auth.signInWithPassword({ email: $("email").value.trim(), password: $("senha").value });
  if (error) {
    erro.textContent = "E-mail ou senha incorretos.";
    erro.classList.remove("oculto");
  }
});

$("sair").addEventListener("click", () => {
  esquecerCadastros();
  supabase.auth.signOut();
});

// o botão de tema do app usa o mesmo mecanismo do botão da tela de login
function sincronizarBotaoTema() { $("trocar-tema-app").textContent = $("trocar-tema").textContent; }
$("trocar-tema-app").addEventListener("click", () => { $("trocar-tema").click(); sincronizarBotaoTema(); });
document.addEventListener("DOMContentLoaded", sincronizarBotaoTema);
sincronizarBotaoTema();

if (!configurado) {
  document.body.insertAdjacentHTML("afterbegin", `<div class="aviso" style="margin:16px">Sistema ainda não configurado: preencha <code>js/config.js</code>.</div>`);
} else {
  const { data } = await supabase.auth.getSession();
  mostrar(data.session);
  supabase.auth.onAuthStateChange((_evento, sessao) => mostrar(sessao));
}
