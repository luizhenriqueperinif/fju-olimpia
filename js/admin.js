import { supabase, configurado, ESPORTES, ICONES, CAMPEONATO_LABEL, escapeHtml, idade } from "./comum.js";

const $ = (id) => document.getElementById(id);
const telaLogin = $("tela-login");
const telaPainel = $("tela-painel");
const filtros = ["f-busca", "f-esporte", "f-preferido", "f-campeonato", "f-sexo", "f-igreja", "f-bairro", "f-idade-min", "f-idade-max"];

let cadastros = [];
let filtrados = [];
const SEXO_LABEL = { menino: "Menino", menina: "Menina" };
let sessaoAtual = null;

// no computador os filtros já começam abertos; no celular ficam recolhidos
if (window.matchMedia("(min-width: 800px)").matches) $("caixa-filtros").open = true;

if (!configurado) {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div class="aviso" style="margin:16px">Sistema ainda não configurado: preencha <code>js/config.js</code>.</div>`,
  );
} else {
  const { data } = await supabase.auth.getSession();
  mostrarTela(data.session);
  supabase.auth.onAuthStateChange((_evento, sessao) => mostrarTela(sessao));
}

function mostrarTela(sessao) {
  const mesmoUsuario = sessao?.user?.id === sessaoAtual?.user?.id;
  sessaoAtual = sessao;
  telaLogin.classList.toggle("oculto", !!sessao);
  telaPainel.classList.toggle("oculto", !sessao);
  if (sessao && !mesmoUsuario) {
    $("usuario").textContent = `Logado como ${sessao.user.email}`;
    carregar();
  }
}

// ---------- Login ----------
$("form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const erro = $("erro-login");
  erro.classList.add("oculto");
  const { error } = await supabase.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("senha").value,
  });
  if (error) {
    erro.textContent = "E-mail ou senha incorretos.";
    erro.classList.remove("oculto");
  }
});

$("sair").addEventListener("click", () => supabase.auth.signOut());
$("atualizar").addEventListener("click", carregar);

// ---------- Dados ----------
async function carregar() {
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  $("sem-permissao").classList.toggle("oculto", !!ehAdmin);

  // busca em páginas de 1000 (limite padrão do Supabase)
  const todos = [];
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase
      .from("cadastros")
      .select("*")
      .order("criado_em", { ascending: false })
      .range(inicio, inicio + 999);
    if (error) {
      console.error(error);
      alert("Erro ao carregar cadastros: " + error.message);
      return;
    }
    todos.push(...data);
    if (data.length < 1000) break;
  }
  cadastros = todos.map((c) => ({ ...c, idade: idade(c.data_nascimento) }));
  preencherOpcoes();
  aplicarFiltros();
}

function preencherOpcoes() {
  const ordenar = (lista) => [...new Set(lista)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const esportes = ordenar([...ESPORTES, ...cadastros.flatMap((c) => c.esportes)]);
  const bairros = ordenar(cadastros.map((c) => normalizarBairro(c.bairro)));

  preencherSelect($("f-esporte"), "Qualquer esporte", esportes);
  preencherSelect($("f-preferido"), "Qualquer", esportes);
  preencherSelect($("f-bairro"), "Todos", bairros);
}

function preencherSelect(select, rotuloVazio, valores) {
  const atual = select.value;
  select.innerHTML =
    `<option value="">${rotuloVazio}</option>` +
    valores.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if (valores.includes(atual)) select.value = atual;
}

function normalizarBairro(b) {
  return (b || "").trim().toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
}

function semAcento(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ---------- Filtros ----------
function aplicarFiltros() {
  const busca = semAcento($("f-busca").value.trim());
  const buscaDigitos = $("f-busca").value.replace(/\D/g, "");
  const esporte = $("f-esporte").value;
  const preferido = $("f-preferido").value;
  const campeonato = $("f-campeonato").value;
  const sexo = $("f-sexo").value;
  const igreja = $("f-igreja").value;
  const bairro = $("f-bairro").value;
  const idadeMin = $("f-idade-min").value === "" ? null : Number($("f-idade-min").value);
  const idadeMax = $("f-idade-max").value === "" ? null : Number($("f-idade-max").value);

  filtrados = cadastros.filter((c) => {
    if (busca) {
      const noNome = semAcento(c.nome).includes(busca);
      const noTel = buscaDigitos.length >= 3 && c.telefone.replace(/\D/g, "").includes(buscaDigitos);
      if (!noNome && !noTel) return false;
    }
    if (esporte && !c.esportes.includes(esporte)) return false;
    if (preferido && c.esporte_preferido !== preferido) return false;
    if (campeonato && !campeonato.split(",").includes(c.topa_campeonatos)) return false;
    if (sexo && c.sexo !== sexo) return false;
    if (igreja && c.frequenta_igreja !== (igreja === "sim")) return false;
    if (bairro && normalizarBairro(c.bairro) !== bairro) return false;
    if (idadeMin !== null && (c.idade === null || c.idade < idadeMin)) return false;
    if (idadeMax !== null && (c.idade === null || c.idade > idadeMax)) return false;
    return true;
  });

  const ativos = filtros.filter((id) => $(id).value !== "").length;
  $("filtros-ativos").textContent = ativos;
  $("filtros-ativos").classList.toggle("oculto", !ativos);

  desenharNumeros();
  desenharContagemEsportes();
  desenharTabela();
}

filtros.forEach((id) => $(id).addEventListener("input", aplicarFiltros));

$("limpar").addEventListener("click", () => {
  filtros.forEach((id) => ($(id).value = ""));
  aplicarFiltros();
});

// ---------- Desenho ----------
function desenharNumeros() {
  $("n-total").textContent = cadastros.length;
  $("n-campeonato").textContent = cadastros.filter((c) => c.topa_campeonatos === "sim").length;
  $("n-sem-igreja").textContent = cadastros.filter((c) => !c.frequenta_igreja).length;
  $("n-filtrados").textContent = filtrados.length;
}

function desenharContagemEsportes() {
  const contagem = {};
  filtrados.forEach((c) => c.esportes.forEach((e) => (contagem[e] = (contagem[e] || 0) + 1)));
  const selecionado = $("f-esporte").value;
  const ordem = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  if (selecionado && !contagem[selecionado]) ordem.unshift([selecionado, 0]);

  $("contagem-esportes").innerHTML = ordem
    .map(([e, n]) =>
      `<button type="button" data-esporte="${escapeHtml(e)}" class="${e === selecionado ? "ativo" : ""}">${ICONES[e] ?? "➕"} ${escapeHtml(e)}<b>${n}</b></button>`)
    .join("");
}

$("contagem-esportes").addEventListener("click", (ev) => {
  const botao = ev.target.closest("button[data-esporte]");
  if (!botao) return;
  const e = botao.dataset.esporte;
  $("f-esporte").value = $("f-esporte").value === e ? "" : e;
  aplicarFiltros();
});

function linkZap(telefone) {
  const d = telefone.replace(/\D/g, "");
  return `https://wa.me/55${d}`;
}

function desenharTabela() {
  if (!filtrados.length) {
    $("linhas").innerHTML = `<tr><td colspan="9" class="vazio">${cadastros.length ? "Ninguém encontrado com esses filtros." : "Nenhum cadastro ainda."}</td></tr>`;
    return;
  }
  $("linhas").innerHTML = filtrados
    .map((c) => `
      <tr>
        <td class="nome"><b>${escapeHtml(c.nome)}</b></td>
        <td data-rotulo="WhatsApp"><a class="zap" href="${linkZap(c.telefone)}" target="_blank" rel="noopener">💬 ${escapeHtml(c.telefone)}</a></td>
        <td data-rotulo="Idade">${c.idade ?? "—"}${c.sexo ? ` · ${SEXO_LABEL[c.sexo]}` : ""}</td>
        <td data-rotulo="Endereço"><span>${escapeHtml(c.endereco)}<br><small>${escapeHtml(c.bairro)}</small></span></td>
        <td data-rotulo="Esportes"><span>${c.esportes
          .map((e) => `<span class="tag ${e === c.esporte_preferido ? "pref" : ""}" title="${e === c.esporte_preferido ? "Preferido" : ""}">${e === c.esporte_preferido ? "★ " : ""}${escapeHtml(e)}</span>`)
          .join("")}</span></td>
        <td data-rotulo="Campeonato"><span class="selo selo-${c.topa_campeonatos}">${CAMPEONATO_LABEL[c.topa_campeonatos]}</span></td>
        <td data-rotulo="Igreja"><span>${c.frequenta_igreja ? `Sim${c.igreja_nome ? `<br><small>${escapeHtml(c.igreja_nome)}</small>` : ""}` : "Não"}</span></td>
        <td data-rotulo="Cadastro"><small>${new Date(c.criado_em).toLocaleDateString("pt-BR")}</small></td>
        <td class="excluir"><button class="botao perigo pequeno" data-excluir="${c.id}" type="button">Excluir</button></td>
      </tr>`)
    .join("");
}

$("linhas").addEventListener("click", async (ev) => {
  const botao = ev.target.closest("button[data-excluir]");
  if (!botao) return;
  const id = Number(botao.dataset.excluir);
  const pessoa = cadastros.find((c) => c.id === id);
  if (!confirm(`Excluir o cadastro de ${pessoa.nome}? Isso não pode ser desfeito.`)) return;
  const { error } = await supabase.from("cadastros").delete().eq("id", id);
  if (error) return alert("Erro ao excluir: " + error.message);
  cadastros = cadastros.filter((c) => c.id !== id);
  aplicarFiltros();
});

// ---------- Exportar ----------
$("exportar").addEventListener("click", () => {
  const cabecalho = ["Nome", "Menino/menina", "WhatsApp", "Nascimento", "Idade", "Endereço", "Bairro", "Esportes",
    "Preferido", "Topa campeonato", "Frequenta igreja", "Igreja", "Cadastrado em"];
  const linhas = filtrados.map((c) => [
    c.nome, SEXO_LABEL[c.sexo] ?? "", c.telefone,
    c.data_nascimento ? c.data_nascimento.split("-").reverse().join("/") : "",
    c.idade ?? "", c.endereco, c.bairro, c.esportes.join(", "), c.esporte_preferido,
    CAMPEONATO_LABEL[c.topa_campeonatos], c.frequenta_igreja ? "Sim" : "Não", c.igreja_nome ?? "",
    new Date(c.criado_em).toLocaleString("pt-BR"),
  ]);
  const celula = (v) => `"${String(v).replace(/"/g, '""')}"`;
  // ";" e BOM para o Excel em português abrir certinho
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `cadastros-fju-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
});

$("copiar-zaps").addEventListener("click", async () => {
  const texto = filtrados.map((c) => `${c.nome} - ${c.telefone}`).join("\n");
  await navigator.clipboard.writeText(texto);
  $("copiar-zaps").textContent = `Copiado (${filtrados.length})!`;
  setTimeout(() => ($("copiar-zaps").textContent = "Copiar telefones"), 2000);
});
