import { ESPORTES, ICONES, mascaraTelefone } from "../comum.js";
import {
  supabase, db, e, render, definirAcoes, ir, icone, abrirSheet, fecharSheet, menu, aviso,
  carregarCadastros, esquecerCadastros, SEXO, CAMPEONATO, STATUS,
  iniciais, linkZap, semAcento, plural, dataCurta,
} from "./nucleo.js";

// =========================================================
// Início
// =========================================================
export async function telaInicio() {
  const [cads, torneios, jogos] = await Promise.all([
    carregarCadastros(true),
    supabase.from("torneios").select("*").neq("status", "encerrado").order("criado_em", { ascending: false }),
    supabase.from("jogos")
      .select("*, ta:times!jogos_time_a_fkey(nome, cor), tb:times!jogos_time_b_fkey(nome, cor)")
      .eq("encerrado", false).not("time_b", "is", null)
      .order("data_hora", { nullsFirst: false }).order("rodada").order("ordem"),
  ]);
  const ativos = torneios.data ?? [];
  const pendentes = jogos.data ?? [];

  const contar = (fn) => cads.filter(fn).length;
  const meninos = contar((c) => c.sexo === "menino");
  const meninas = contar((c) => c.sexo === "menina");

  const contagem = {};
  cads.forEach((c) => c.esportes.forEach((s) => (contagem[s] = (contagem[s] || 0) + 1)));
  const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maior = top[0]?.[1] || 1;

  const emAndamento = ativos.find((t) => t.status === "andamento") ?? ativos[0];
  const proximo = emAndamento && pendentes.find((j) => j.torneio_id === emAndamento.id);
  const ultimos = [...cads].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).slice(0, 5);

  render(`
    <div class="pagina">
      <div>
        <p class="sobretitulo">Visão geral</p>
        <div class="cabeca-pagina"><h1>Olá, equipe!</h1></div>
      </div>

      <div class="numeros-app">
        <a class="stat destaque" href="#/jovens"><b>${cads.length}</b><span>jovens cadastrados</span></a>
        <div class="stat"><b>${contar((c) => c.topa_campeonatos === "sim")}</b><span>topam campeonato</span></div>
        <a class="stat" href="#/torneios"><b>${ativos.length}</b><span>${ativos.length === 1 ? "torneio ativo" : "torneios ativos"}</span></a>
        <div class="stat"><b>${contar((c) => !c.frequenta_igreja)}</b><span>não vão à igreja</span></div>
      </div>
      ${meninos + meninas ? `<p class="suave pequeno" style="margin:-4px 2px 0">${plural(meninos, "menino", "meninos")} · ${plural(meninas, "menina", "meninas")}</p>` : ""}

      ${emAndamento ? `
        <a class="cartao" href="#/torneio/${emAndamento.id}/jogos" style="display:flex; flex-direction:column; gap:10px; color:inherit; text-decoration:none">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
            <span class="selo-status ${emAndamento.status}">${STATUS[emAndamento.status]}</span>
            <span class="suave pequeno">${e(emAndamento.esporte)}</span>
          </div>
          <b style="font-size:1.15rem">${e(emAndamento.nome)}</b>
          ${proximo ? `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-radius:12px; background:var(--campo)">
              <span style="display:flex; flex-direction:column; gap:2px">
                <span class="sobretitulo">Próximo jogo${proximo.data_hora ? " · " + e(new Date(proximo.data_hora).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })) : ""}</span>
                <b>${e(proximo.ta?.nome)} × ${e(proximo.tb?.nome)}</b>
              </span>
              <span style="color:var(--primaria); font-weight:700">Ver →</span>
            </div>` : `<span class="suave pequeno">Abrir torneio →</span>`}
        </a>` : `
        <a class="cartao" href="#/torneios/novo" style="display:flex; align-items:center; gap:12px; color:inherit; text-decoration:none">
          ${icone("trofeu")}<span style="flex:1"><b>Nenhum torneio ativo</b><br><span class="suave pequeno">Toque para criar o primeiro</span></span>
        </a>`}

      ${top.length ? `
        <div class="cartao">
          <h3>Esportes mais jogados</h3>
          ${top.map(([nome, n]) => `
            <div class="barra-esporte">
              <div><span>${ICONES[nome] ?? "➕"} ${e(nome)}</span><span class="suave">${n}</span></div>
              <div class="barra-trilho"><span style="width:${Math.round((n / maior) * 100)}%"></span></div>
            </div>`).join("")}
        </div>` : ""}

      <div class="cartao">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <h3 style="margin:0">Últimos cadastrados</h3>
          <a class="link-botao" href="#/jovens">Ver todos</a>
        </div>
        <div class="lista-simples">
          ${ultimos.map((c) => `
            <a class="item" href="#/jovem/${c.id}">
              <span class="avatar">${e(iniciais(c.nome))}</span>
              <span class="item-corpo">
                <span class="item-titulo">${e(c.nome)}</span>
                <span class="item-sub">${e(c.esporte_preferido)} · ${e(c.bairro)} · ${dataCurta(c.criado_em)}</span>
              </span>
            </a>`).join("") || `<p class="suave">Nenhum cadastro ainda.</p>`}
        </div>
      </div>
    </div>`, {});
}

// =========================================================
// Lista de jovens
// =========================================================
const filtro = { busca: "", rapidos: new Set(), esporte: "", preferido: "", bairro: "", idadeMin: "", idadeMax: "" };
const selecionados = new Set();
let filtrados = [];

const RAPIDOS = {
  meninos: ["Meninos", (c) => c.sexo === "menino"],
  meninas: ["Meninas", (c) => c.sexo === "menina"],
  campeonato: ["Topa campeonato", (c) => c.topa_campeonatos === "sim"],
  "sem-igreja": ["Sem igreja", (c) => !c.frequenta_igreja],
};

const normalizarBairro = (b) => (b || "").trim().toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

function aplicarFiltro(cads) {
  const busca = semAcento(filtro.busca.trim());
  const digitos = filtro.busca.replace(/\D/g, "");
  const min = filtro.idadeMin === "" ? null : Number(filtro.idadeMin);
  const max = filtro.idadeMax === "" ? null : Number(filtro.idadeMax);
  return cads.filter((c) => {
    if (busca && !semAcento(c.nome).includes(busca) && !(digitos.length >= 3 && c.telefone.replace(/\D/g, "").includes(digitos))) return false;
    for (const r of filtro.rapidos) if (!RAPIDOS[r][1](c)) return false;
    if (filtro.esporte && !c.esportes.includes(filtro.esporte)) return false;
    if (filtro.preferido && c.esporte_preferido !== filtro.preferido) return false;
    if (filtro.bairro && normalizarBairro(c.bairro) !== filtro.bairro) return false;
    if (min !== null && (c.idade === null || c.idade < min)) return false;
    if (max !== null && (c.idade === null || c.idade > max)) return false;
    return true;
  });
}

const qtdFiltrosAvancados = () => ["esporte", "preferido", "bairro", "idadeMin", "idadeMax"].filter((k) => filtro[k] !== "").length;

function itemJovem(c) {
  const sel = selecionados.has(c.id);
  const outros = c.esportes.filter((s) => s !== c.esporte_preferido);
  return `
    <div class="item ${sel ? "selecionado" : ""}">
      <button type="button" class="marcador ${sel ? "on" : ""}" data-acao="marcar" data-id="${c.id}" aria-label="Selecionar ${e(c.nome)}" aria-pressed="${sel}">${icone("check")}</button>
      <a class="item-corpo" href="#/jovem/${c.id}" style="color:inherit; text-decoration:none">
        <span class="item-linha"><span class="item-titulo">${e(c.nome)}</span><span class="item-sub">${c.idade != null ? c.idade + " anos" : ""}${c.sexo ? " · " + SEXO[c.sexo] : ""}</span></span>
        <span class="item-tags"><span class="tag pref">★ ${e(c.esporte_preferido)}</span>${outros.map((s) => `<span class="tag">${e(s)}</span>`).join("")}</span>
        <span class="item-sub">${e(c.bairro)} · ${CAMPEONATO[c.topa_campeonatos]} campeonato${c.frequenta_igreja ? "" : " · sem igreja"}</span>
      </a>
    </div>`;
}

export async function telaJovens() {
  const cads = await carregarCadastros();

  function desenharLista() {
    filtrados = aplicarFiltro(cads);
    document.getElementById("lista-jovens").innerHTML = filtrados.length
      ? filtrados.map(itemJovem).join("")
      : `<div class="vazio-estado">${cads.length ? "Ninguém encontrado com esses filtros." : "Nenhum jovem cadastrado ainda."}</div>`;
    document.getElementById("info-lista").textContent =
      `${plural(filtrados.length, "jovem", "jovens")}${selecionados.size ? ` · ${selecionados.size} selecionado${selecionados.size > 1 ? "s" : ""}` : ""}`;
    const barra = document.getElementById("barra-selecao");
    barra.hidden = !selecionados.size;
    barra.querySelector("span").textContent = plural(selecionados.size, "selecionado", "selecionados");
  }

  function desenharChips() {
    document.getElementById("chips-rapidos").innerHTML = Object.entries(RAPIDOS)
      .map(([k, [rotulo]]) => `<button type="button" class="chip-filtro ${filtro.rapidos.has(k) ? "on" : ""}" data-acao="rapido" data-k="${k}">${rotulo}</button>`)
      .join("");
    const n = qtdFiltrosAvancados();
    document.getElementById("qtd-filtros").hidden = !n;
    document.getElementById("qtd-filtros").textContent = n;
  }

  render(`
    <div class="pagina">
      <div class="cabeca-pagina">
        <h1>Jovens</h1>
        <button type="button" class="icone-botao" data-acao="atualizar" aria-label="Atualizar lista">${icone("atualizar")}</button>
      </div>
      <div class="busca">
        <label>${icone("busca")}<input type="search" placeholder="Buscar nome ou telefone" aria-label="Buscar" value="${e(filtro.busca)}" data-ao-digitar="buscar"></label>
        <button type="button" class="icone-botao" data-acao="filtros" aria-label="Mais filtros">${icone("filtro")}<span id="qtd-filtros" class="contador" hidden></span></button>
      </div>
      <div id="chips-rapidos" class="chips-rolagem"></div>
      <div class="barra-info">
        <span id="info-lista"></span>
        <span class="linha-links">
          <button type="button" class="link-botao" data-acao="selecionarTodos">Selecionar todos</button>
          <button type="button" class="link-botao" data-acao="exportar">Planilha</button>
          <button type="button" class="link-botao" data-acao="copiar">Copiar telefones</button>
        </span>
      </div>
      <div id="lista-jovens" class="lista"></div>
    </div>
    <div id="barra-selecao" class="barra-selecao" hidden>
      <span></span>
      <button type="button" class="link-botao" data-acao="limparSelecao">Limpar</button>
      <button type="button" class="botao pequeno" data-acao="adicionarATorneio">Adicionar a torneio</button>
    </div>`, {
    buscar: (input) => { filtro.busca = input.value; desenharLista(); },
    rapido: ({ k }) => {
      if (filtro.rapidos.has(k)) filtro.rapidos.delete(k);
      else {
        filtro.rapidos.add(k);
        if (k === "meninos") filtro.rapidos.delete("meninas");
        if (k === "meninas") filtro.rapidos.delete("meninos");
      }
      desenharChips();
      desenharLista();
    },
    marcar: ({ id }) => {
      id = Number(id);
      selecionados.has(id) ? selecionados.delete(id) : selecionados.add(id);
      desenharLista();
    },
    selecionarTodos: () => { filtrados.forEach((c) => selecionados.add(c.id)); desenharLista(); },
    limparSelecao: () => { selecionados.clear(); desenharLista(); },
    adicionarATorneio: () => escolherTorneio([...selecionados], () => { selecionados.clear(); desenharLista(); }),
    filtros: () => abrirFiltros(cads, () => { desenharChips(); desenharLista(); }),
    exportar: () => exportarCsv(filtrados),
    copiar: async () => {
      await navigator.clipboard.writeText(filtrados.map((c) => `${c.nome} - ${c.telefone}`).join("\n"));
      aviso(`${plural(filtrados.length, "telefone copiado", "telefones copiados")}`);
    },
    atualizar: async () => { await carregarCadastros(true); telaJovens(); },
  });
  desenharChips();
  desenharLista();
}

function abrirFiltros(cads, aoMudar) {
  const ordenar = (l) => [...new Set(l)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const esportes = ordenar([...ESPORTES, ...cads.flatMap((c) => c.esportes)]);
  const bairros = ordenar(cads.map((c) => normalizarBairro(c.bairro)));
  const opcoes = (lista, atual, vazio) => `<option value="">${vazio}</option>` +
    lista.map((v) => `<option value="${e(v)}" ${v === atual ? "selected" : ""}>${e(v)}</option>`).join("");

  abrirSheet("Filtros", `
    <div class="campo"><label for="ff-esporte">Joga</label><select id="ff-esporte" data-ao-mudar="mudou" data-k="esporte">${opcoes(esportes, filtro.esporte, "Qualquer esporte")}</select></div>
    <div class="campo"><label for="ff-pref">Esporte preferido</label><select id="ff-pref" data-ao-mudar="mudou" data-k="preferido">${opcoes(esportes, filtro.preferido, "Qualquer")}</select></div>
    <div class="campo"><label for="ff-bairro">Bairro</label><select id="ff-bairro" data-ao-mudar="mudou" data-k="bairro">${opcoes(bairros, filtro.bairro, "Todos")}</select></div>
    <div class="linha">
      <div class="campo"><label for="ff-min">Idade mínima</label><input id="ff-min" type="number" inputmode="numeric" min="0" max="120" value="${e(filtro.idadeMin)}" data-ao-digitar="mudou" data-k="idadeMin"></div>
      <div class="campo"><label for="ff-max">Idade máxima</label><input id="ff-max" type="number" inputmode="numeric" min="0" max="120" value="${e(filtro.idadeMax)}" data-ao-digitar="mudou" data-k="idadeMax"></div>
    </div>
    <div class="linha-acoes">
      <button type="button" class="botao secundario" data-acao="limpar">Limpar filtros</button>
      <button type="button" class="botao" data-acao="fechar">Ver resultado</button>
    </div>`, {
    mudou: (el) => { filtro[el.dataset.k] = el.value; aoMudar(); },
    limpar: () => {
      Object.assign(filtro, { busca: filtro.busca, esporte: "", preferido: "", bairro: "", idadeMin: "", idadeMax: "" });
      filtro.rapidos.clear();
      aoMudar();
      fecharSheet();
    },
  });
}

function exportarCsv(lista) {
  const cab = ["Nome", "Menino/menina", "WhatsApp", "Nascimento", "Idade", "Endereço", "Bairro", "Esportes",
    "Preferido", "Topa campeonato", "Frequenta igreja", "Igreja", "Cadastrado em"];
  const linhas = lista.map((c) => [
    c.nome, SEXO[c.sexo] ?? "", c.telefone,
    c.data_nascimento ? c.data_nascimento.split("-").reverse().join("/") : "",
    c.idade ?? "", c.endereco, c.bairro, c.esportes.join(", "), c.esporte_preferido,
    CAMPEONATO[c.topa_campeonatos], c.frequenta_igreja ? "Sim" : "Não", c.igreja_nome ?? "",
    new Date(c.criado_em).toLocaleString("pt-BR"),
  ]);
  const celula = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + [cab, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  Object.assign(document.createElement("a"), { href: url, download: `jovens-fju-${new Date().toISOString().slice(0, 10)}.csv` }).click();
  URL.revokeObjectURL(url);
}

// Sheet para escolher em qual torneio colocar os jovens selecionados
export async function escolherTorneio(ids, depois) {
  if (!ids.length) return;
  const torneios = await db(supabase.from("torneios").select("id, nome, esporte, status").neq("status", "encerrado").order("criado_em", { ascending: false }), "Erro ao carregar torneios");
  if (!torneios.length) {
    abrirSheet("Adicionar a torneio", `<div class="vazio-estado">Nenhum torneio ativo.<a class="botao" href="#/torneios/novo">+ Criar torneio</a></div>`);
    return;
  }
  const acoes = {};
  const html = torneios.map((t) => {
    acoes["t" + t.id] = async () => {
      await db(supabase.from("torneio_inscritos").upsert(
        ids.map((cadastro_id) => ({ torneio_id: t.id, cadastro_id })),
        { onConflict: "torneio_id,cadastro_id", ignoreDuplicates: true },
      ), "Erro ao inscrever");
      fecharSheet();
      aviso(`${plural(ids.length, "jovem adicionado", "jovens adicionados")} em ${t.nome}`);
      depois?.();
    };
    return `<button type="button" class="opcao-menu" data-acao="t${t.id}">${e(t.nome)} <span class="suave pequeno">· ${e(t.esporte)}</span></button>`;
  }).join("");
  abrirSheet(`Adicionar ${plural(ids.length, "jovem", "jovens")} a…`, `<div class="lista-opcoes">${html}</div>`, acoes);
}

// =========================================================
// Ficha do jovem
// =========================================================
export async function telaJovem(id, editando = false) {
  const cads = await carregarCadastros();
  const c = cads.find((x) => x.id === id);
  if (!c) {
    render(`<div class="pagina"><div class="vazio-estado">Jovem não encontrado.<a class="botao secundario" href="#/jovens">Voltar</a></div></div>`, {});
    return;
  }
  if (editando) return telaEditarJovem(c);

  const participacoes = await db(
    supabase.from("torneio_inscritos").select("torneio_id, torneios(nome, status, esporte), times(nome, cor)").eq("cadastro_id", id),
    "Erro ao carregar torneios",
  ).catch(() => []);
  const gols = await db(supabase.from("gols").select("quantidade, jogos(torneio_id)").eq("cadastro_id", id)).catch(() => []);
  const golsPorTorneio = {};
  gols.forEach((g) => (golsPorTorneio[g.jogos?.torneio_id] = (golsPorTorneio[g.jogos?.torneio_id] || 0) + g.quantidade));

  const outros = c.esportes.filter((s) => s !== c.esporte_preferido);
  render(`
    <div class="pagina">
      <div class="cabeca-pagina">
        <a class="icone-botao" href="#/jovens" aria-label="Voltar">${icone("voltar")}</a>
        <button type="button" class="icone-botao" data-acao="opcoes" aria-label="Opções">${icone("pontos")}</button>
      </div>
      <div class="ficha-topo">
        <span class="avatar grande">${e(iniciais(c.nome))}</span>
        <h1>${e(c.nome)}</h1>
        <span class="suave">${[SEXO[c.sexo], c.idade != null ? c.idade + " anos" : null, c.bairro].filter(Boolean).map(e).join(" · ")}</span>
        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin-top:4px">
          <span class="selo ${c.topa_campeonatos === "nao" ? "selo-nao" : c.topa_campeonatos === "talvez" ? "selo-talvez" : "selo-sim"}">${CAMPEONATO[c.topa_campeonatos]} campeonato</span>
          <span class="selo azul">${c.frequenta_igreja ? "Vai à igreja" + (c.igreja_nome ? ": " + e(c.igreja_nome) : "") : "Não vai à igreja"}</span>
        </div>
      </div>

      <a class="botao zap-botao" href="${linkZap(c.telefone)}" target="_blank" rel="noopener">${icone("zap")} Chamar no WhatsApp</a>

      <div class="cartao">
        <h3>Esportes</h3>
        <div class="item-tags"><span class="tag pref">★ ${ICONES[c.esporte_preferido] ?? ""} ${e(c.esporte_preferido)}</span>${outros.map((s) => `<span class="tag">${ICONES[s] ?? ""} ${e(s)}</span>`).join("")}</div>
      </div>

      <div class="cartao">
        <h3>Torneios</h3>
        <div class="lista-simples">
          ${participacoes.map((p) => `
            <a class="item" href="#/torneio/${p.torneio_id}">
              <span class="item-corpo">
                <span class="item-titulo">${e(p.torneios?.nome)}</span>
                <span class="item-sub">${p.times ? "Time " + e(p.times.nome) : "Sem time"}${golsPorTorneio[p.torneio_id] ? " · " + plural(golsPorTorneio[p.torneio_id], "gol", "gols") : ""}</span>
              </span>
              <span class="selo-status ${p.torneios?.status}">${STATUS[p.torneios?.status] ?? ""}</span>
            </a>`).join("")}
          <button type="button" class="item link-botao" data-acao="addTorneio">+ Adicionar a um torneio</button>
        </div>
      </div>

      <div class="cartao">
        <h3>Dados</h3>
        <div class="dado"><span>WhatsApp</span><span>${e(c.telefone)}</span></div>
        <div class="dado"><span>Nascimento</span><span>${c.data_nascimento ? c.data_nascimento.split("-").reverse().join("/") : "—"}</span></div>
        <div class="dado"><span>Endereço</span><span>${e(c.endereco)}</span></div>
        <div class="dado"><span>Bairro</span><span>${e(c.bairro)}</span></div>
        <div class="dado"><span>Cadastrado em</span><span>${new Date(c.criado_em).toLocaleDateString("pt-BR")}</span></div>
      </div>
    </div>`, {
    addTorneio: () => escolherTorneio([c.id], () => telaJovem(id)),
    opcoes: () => menu(c.nome, [
      { rotulo: "Editar dados", fn: () => telaJovem(id, true) },
      {
        rotulo: "Excluir cadastro", perigo: true, fn: async () => {
          if (!confirm(`Excluir o cadastro de ${c.nome}? Ele também sai dos torneios. Não dá para desfazer.`)) return;
          await db(supabase.from("cadastros").delete().eq("id", id), "Erro ao excluir");
          esquecerCadastros();
          aviso("Cadastro excluído");
          ir("#/jovens");
        },
      },
    ]),
  });
}

function telaEditarJovem(c) {
  const todos = [...new Set([...ESPORTES, ...c.esportes])];
  const radio = (nome, valor, rotulo, atual) =>
    `<label class="chip"><input type="radio" name="${nome}" value="${valor}" ${atual === valor ? "checked" : ""}><span>${rotulo}</span></label>`;

  render(`
    <div class="pagina">
      <div class="cabeca-pagina">
        <a class="icone-botao" href="#/jovem/${c.id}" aria-label="Cancelar">${icone("voltar")}</a>
        <h1 style="flex:1; font-size:1.25rem">Editar jovem</h1>
      </div>
      <form id="form-jovem" class="cartao" novalidate>
        <div class="campo"><label for="ej-nome">Nome completo</label><input id="ej-nome" name="nome" type="text" maxlength="120" value="${e(c.nome)}"></div>
        <div class="campo"><span class="rotulo">Menino ou menina?</span><div class="opcoes">${radio("sexo", "menino", "Menino", c.sexo)}${radio("sexo", "menina", "Menina", c.sexo)}</div></div>
        <div class="linha">
          <div class="campo"><label for="ej-tel">WhatsApp</label><input id="ej-tel" name="telefone" type="tel" inputmode="numeric" value="${e(c.telefone)}" data-ao-digitar="mascara"></div>
          <div class="campo"><label for="ej-nasc">Nascimento</label><input id="ej-nasc" name="data_nascimento" type="date" value="${e(c.data_nascimento ?? "")}"></div>
        </div>
        <div class="linha">
          <div class="campo"><label for="ej-end">Endereço</label><input id="ej-end" name="endereco" type="text" maxlength="200" value="${e(c.endereco)}"></div>
          <div class="campo"><label for="ej-bairro">Bairro</label><input id="ej-bairro" name="bairro" type="text" maxlength="80" value="${e(c.bairro)}"></div>
        </div>
        <div class="campo"><span class="rotulo">Esportes</span>
          <div class="chips">${todos.map((s) => `<label class="chip"><input type="checkbox" name="esportes" value="${e(s)}" ${c.esportes.includes(s) ? "checked" : ""}><span><i>${ICONES[s] ?? "➕"}</i>${e(s)}</span></label>`).join("")}</div>
        </div>
        <div class="campo"><label for="ej-pref">Esporte preferido</label>
          <select id="ej-pref" name="esporte_preferido">${todos.map((s) => `<option ${s === c.esporte_preferido ? "selected" : ""}>${e(s)}</option>`).join("")}</select>
        </div>
        <div class="campo"><span class="rotulo">Topa campeonatos?</span><div class="opcoes">${radio("topa", "sim", "Sim", c.topa_campeonatos)}${radio("topa", "talvez", "Talvez", c.topa_campeonatos)}${radio("topa", "nao", "Não", c.topa_campeonatos)}</div></div>
        <div class="campo"><span class="rotulo">Frequenta igreja?</span><div class="opcoes">${radio("igreja", "sim", "Sim", c.frequenta_igreja ? "sim" : "nao")}${radio("igreja", "nao", "Não", c.frequenta_igreja ? "sim" : "nao")}</div></div>
        <div class="campo"><label for="ej-igreja">Qual igreja?</label><input id="ej-igreja" name="igreja_nome" type="text" maxlength="120" value="${e(c.igreja_nome ?? "")}"></div>
        <div class="linha-acoes">
          <a class="botao secundario" href="#/jovem/${c.id}">Cancelar</a>
          <button type="button" class="botao" data-acao="salvar">Salvar</button>
        </div>
      </form>
    </div>`, {
    mascara: (el) => { el.value = mascaraTelefone(el.value); },
    salvar: async () => {
      const f = document.getElementById("form-jovem");
      const val = (n) => f.querySelector(`input[name="${n}"]:checked`)?.value;
      const esportes = [...f.querySelectorAll('input[name="esportes"]:checked')].map((i) => i.value);
      const dados = {
        nome: f.nome.value.trim(),
        sexo: val("sexo") ?? null,
        telefone: f.telefone.value.trim(),
        data_nascimento: f.data_nascimento.value || null,
        endereco: f.endereco.value.trim(),
        bairro: f.bairro.value.trim(),
        esportes,
        esporte_preferido: f.esporte_preferido.value,
        topa_campeonatos: val("topa"),
        frequenta_igreja: val("igreja") === "sim",
        igreja_nome: val("igreja") === "sim" ? f.igreja_nome.value.trim() || null : null,
      };
      if (dados.nome.length < 2) return aviso("Informe o nome", "erro");
      if (dados.telefone.replace(/\D/g, "").length < 10) return aviso("WhatsApp inválido", "erro");
      if (!esportes.length) return aviso("Marque pelo menos um esporte", "erro");
      if (!esportes.includes(dados.esporte_preferido)) return aviso("O preferido precisa estar marcado nos esportes", "erro");
      await db(supabase.from("cadastros").update(dados).eq("id", c.id), "Erro ao salvar");
      await carregarCadastros(true);
      aviso("Dados salvos");
      telaJovem(c.id);
    },
  });
}
