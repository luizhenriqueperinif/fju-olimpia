// Peças compartilhadas pelas telas do painel: acesso ao banco, cache de
// cadastros, ações por data-atributo, bottom sheet, avisos e formatação.
import { supabase, escapeHtml, idade } from "../comum.js";

export { supabase };
export const e = escapeHtml;

// ---------- Banco ----------
export async function db(consulta, contexto = "Erro") {
  const { data, error } = await consulta;
  if (error) {
    console.error(error);
    aviso(`${contexto}: ${error.message}`, "erro");
    throw error;
  }
  return data;
}

let cacheCadastros = null;

export async function carregarCadastros(forcar = false) {
  if (cacheCadastros && !forcar) return cacheCadastros;
  const todos = [];
  for (let inicio = 0; ; inicio += 1000) {
    const pagina = await db(
      supabase.from("cadastros").select("*").order("nome").range(inicio, inicio + 999),
      "Erro ao carregar jovens",
    );
    todos.push(...pagina);
    if (pagina.length < 1000) break;
  }
  cacheCadastros = todos.map((c) => ({ ...c, idade: idade(c.data_nascimento) }));
  return cacheCadastros;
}

export const esquecerCadastros = () => { cacheCadastros = null; };

// ---------- Ações: elementos com data-acao / data-ao-digitar / data-ao-mudar ----------
function ligarAcoes(raiz, obterAcoes) {
  raiz.addEventListener("click", (ev) => {
    const alvo = ev.target.closest("[data-acao]");
    if (!alvo || !raiz.contains(alvo)) return;
    const fn = obterAcoes()[alvo.dataset.acao];
    if (!fn) return;
    ev.preventDefault();
    fn(alvo.dataset, alvo);
  });
  raiz.addEventListener("input", (ev) => obterAcoes()[ev.target.dataset?.aoDigitar]?.(ev.target));
  raiz.addEventListener("change", (ev) => obterAcoes()[ev.target.dataset?.aoMudar]?.(ev.target));
}

export const app = document.getElementById("app");
let acoesTela = {};
ligarAcoes(app, () => acoesTela);

// Desenha a tela inteira e registra as ações dela.
export function render(html, acoes = acoesTela) {
  acoesTela = acoes;
  app.innerHTML = html;
}
export const definirAcoes = (acoes) => { acoesTela = acoes; };

export const ir = (rota) => { location.hash = rota; };

// ---------- Bottom sheet ----------
const sheet = document.getElementById("sheet");
const sheetFundo = document.getElementById("sheet-fundo");
let acoesSheet = {};
ligarAcoes(sheet, () => acoesSheet);
sheetFundo.addEventListener("click", () => fecharSheet());

export function abrirSheet(titulo, html, acoes = {}) {
  acoesSheet = { fechar: fecharSheet, ...acoes };
  sheet.innerHTML = `
    <div class="sheet-alca" aria-hidden="true"></div>
    <div class="sheet-cabeca">
      <h2>${e(titulo)}</h2>
      <button type="button" class="icone-botao" data-acao="fechar" aria-label="Fechar">${icone("x")}</button>
    </div>
    <div class="sheet-corpo">${html}</div>`;
  sheet.hidden = false;
  sheetFundo.hidden = false;
  document.body.classList.add("sheet-aberto");
}

export function fecharSheet() {
  sheet.hidden = true;
  sheetFundo.hidden = true;
  sheet.innerHTML = "";
  document.body.classList.remove("sheet-aberto");
}

// Uma lista de opções simples no sheet: [{rotulo, perigo?, fn}]
export function menu(titulo, opcoes) {
  const acoes = {};
  const html = opcoes.map((o, i) => {
    acoes["op" + i] = async () => { fecharSheet(); await o.fn(); };
    return `<button type="button" class="opcao-menu ${o.perigo ? "perigo" : ""}" data-acao="op${i}">${e(o.rotulo)}</button>`;
  }).join("");
  abrirSheet(titulo, `<div class="lista-opcoes">${html}</div>`, acoes);
}

// ---------- Avisos ----------
const caixaAviso = document.getElementById("aviso");
let timerAviso;
export function aviso(texto, tipo = "ok") {
  caixaAviso.textContent = texto;
  caixaAviso.className = "aviso-flutuante " + tipo;
  caixaAviso.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { caixaAviso.hidden = true; }, tipo === "erro" ? 6000 : 2500);
}

// ---------- Formatação ----------
export const SEXO = { menino: "Menino", menina: "Menina" };
export const CAMPEONATO = { sim: "Topa", talvez: "Talvez", nao: "Não topa" };
export const CATEGORIA = { masculino: "Masculino", feminino: "Feminino", misto: "Misto" };
export const FORMATO = {
  mata_mata: "Mata-mata",
  pontos_corridos: "Pontos corridos",
  grupos_mata_mata: "Grupos + mata-mata",
};
export const STATUS = {
  inscricoes: "INSCRIÇÕES",
  times: "MONTANDO TIMES",
  andamento: "EM ANDAMENTO",
  encerrado: "ENCERRADO",
};

export function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)[0] : "")).toUpperCase();
}

export function primeiroNome(nome) {
  const p = nome.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p.at(-1)[0]}.` : p[0];
}

export const linkZap = (telefone) => `https://wa.me/55${telefone.replace(/\D/g, "")}`;
export const linkCompartilharZap = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

export function dataCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function dataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function semAcento(t) {
  return (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

// ---------- Ícones (traço, herdam a cor do texto) ----------
const ICONES = {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  jovens: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
  trofeu: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5"/>',
  mais: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  voltar: '<path d="m15 5-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  pontos: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  zap: '<path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.2-4.6A9 9 0 1 1 21 12z"/>',
  sortear: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  brilho: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  atualizar: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
};
export const icone = (nome) => `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;

export const carregando = () => `<div class="carregando" role="status"><span></span>Carregando…</div>`;
