import { ESPORTES } from "../comum.js";
import {
  supabase, db, e, render, ir, icone, abrirSheet, fecharSheet, menu, aviso,
  carregarCadastros, SEXO, CATEGORIA, FORMATO, STATUS,
  iniciais, primeiroNome, semAcento, plural, dataCurta, dataHora, linkCompartilharZap,
} from "./nucleo.js";
import {
  todosContraTodos, dividirGrupos, letraGrupo, primeiraFaseMataMata, proximaFase,
  vencedorDoJogo, classificacao, classificadosDosGrupos, sortearTimes, NOMES_TIMES, CORES_TIMES,
} from "./chaveamento.js";

// =========================================================
// Lista de torneios
// =========================================================
let abaLista = "ativos";

export async function telaTorneios() {
  const [torneios, inscritos, times, jogos] = await Promise.all([
    db(supabase.from("torneios").select("*").order("criado_em", { ascending: false }), "Erro ao carregar torneios"),
    db(supabase.from("torneio_inscritos").select("torneio_id")),
    db(supabase.from("times").select("torneio_id")),
    db(supabase.from("jogos").select("torneio_id, encerrado, time_b")),
  ]);
  const contar = (lista, id, fn = () => true) => lista.filter((x) => x.torneio_id === id && fn(x)).length;
  const visiveis = torneios.filter((t) => (abaLista === "ativos") === (t.status !== "encerrado"));

  render(`
    <div class="pagina">
      <div class="cabeca-pagina">
        <h1>Torneios</h1>
        <a class="botao pequeno" href="#/torneios/novo">+ Novo torneio</a>
      </div>
      <div class="abas-simples">
        <button type="button" class="${abaLista === "ativos" ? "on" : ""}" data-acao="aba" data-aba="ativos">Ativos</button>
        <button type="button" class="${abaLista === "encerrados" ? "on" : ""}" data-acao="aba" data-aba="encerrados">Encerrados</button>
      </div>
      <div class="lista">
        ${visiveis.map((t) => {
          const jogosReais = (j) => j.time_b != null;
          return `
          <a class="cartao" href="#/torneio/${t.id}" style="display:flex; flex-direction:column; gap:12px; color:inherit; text-decoration:none; margin:0">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">
              <span class="selo-status ${t.status}">${STATUS[t.status]}</span>
              <span class="suave pequeno">${t.data_inicio ? dataCurta(t.data_inicio) : ""}</span>
            </div>
            <div>
              <b style="font-size:1.12rem; display:block">${e(t.nome)}</b>
              <span class="suave pequeno">${e(t.esporte)} · ${CATEGORIA[t.categoria]} · ${FORMATO[t.formato]}</span>
            </div>
            <div class="mini-numeros">
              <span><b>${contar(inscritos, t.id)}</b>inscritos</span>
              <span><b>${contar(times, t.id)}</b>times</span>
              <span><b>${contar(jogos, t.id, (j) => jogosReais(j) && j.encerrado)}/${contar(jogos, t.id, jogosReais)}</b>jogos</span>
            </div>
          </a>`;
        }).join("") || `<div class="vazio-estado">${abaLista === "ativos" ? `Nenhum torneio ativo.<a class="botao" href="#/torneios/novo">+ Criar torneio</a>` : "Nenhum torneio encerrado ainda."}</div>`}
      </div>
    </div>`, {
    aba: ({ aba }) => { abaLista = aba; telaTorneios(); },
  });
}

// =========================================================
// Criar / editar torneio
// =========================================================
export async function telaFormTorneio(id) {
  const t = id
    ? await db(supabase.from("torneios").select("*").eq("id", id).single(), "Erro ao carregar torneio")
    : { nome: "", esporte: "Futsal", categoria: "masculino", idade_min: null, idade_max: null, data_inicio: null, local: "", formato: "grupos_mata_mata", jogadores_por_time: 5 };
  const cads = await carregarCadastros();
  const esportes = [...new Set([...ESPORTES, ...cads.flatMap((c) => c.esportes)])];
  const radio = (nome, valor, rotulo) =>
    `<label class="chip"><input type="radio" name="${nome}" value="${valor}" ${t[nome] === valor ? "checked" : ""}><span>${rotulo}</span></label>`;
  const formato = (valor, rotulo, desc) => `
    <label class="formato-op"><input type="radio" name="formato" value="${valor}" ${t.formato === valor ? "checked" : ""}>
      <span><b>${rotulo}</b><small>${desc}</small></span></label>`;

  render(`
    <div class="pagina">
      <div class="cabeca-pagina">
        <a class="icone-botao" href="${id ? `#/torneio/${id}` : "#/torneios"}" aria-label="Voltar">${icone("voltar")}</a>
        <h1 style="flex:1; font-size:1.3rem">${id ? "Editar torneio" : "Novo torneio"}</h1>
      </div>
      <form id="form-torneio" class="cartao" novalidate>
        <div class="campo"><label for="ft-nome">Nome do torneio</label><input id="ft-nome" name="nome" type="text" maxlength="120" placeholder="Ex.: Copa FJU de Futsal" value="${e(t.nome)}"></div>
        <div class="linha">
          <div class="campo"><label for="ft-esporte">Esporte</label>
            <select id="ft-esporte" name="esporte">${esportes.map((s) => `<option ${s === t.esporte ? "selected" : ""}>${e(s)}</option>`).join("")}</select></div>
          <div class="campo"><label for="ft-data">Começa em</label><input id="ft-data" name="data_inicio" type="date" value="${e(t.data_inicio ?? "")}"></div>
        </div>
        <div class="campo"><label for="ft-local">Local <small>(opcional)</small></label><input id="ft-local" name="local" type="text" maxlength="120" placeholder="Quadra, endereço…" value="${e(t.local ?? "")}"></div>
        <div class="campo"><span class="rotulo">Categoria</span><div class="opcoes">${radio("categoria", "masculino", "Masculino")}${radio("categoria", "feminino", "Feminino")}${radio("categoria", "misto", "Misto")}</div></div>
        <div class="linha">
          <div class="campo"><label for="ft-min">Idade mínima <small>(opcional)</small></label><input id="ft-min" name="idade_min" type="number" inputmode="numeric" min="0" max="120" value="${t.idade_min ?? ""}"></div>
          <div class="campo"><label for="ft-max">Idade máxima <small>(opcional)</small></label><input id="ft-max" name="idade_max" type="number" inputmode="numeric" min="0" max="120" value="${t.idade_max ?? ""}"></div>
        </div>
        <div class="campo"><span class="rotulo">Formato</span>
          ${formato("mata_mata", "Mata-mata", "Quem perde sai. Rápido, bom para um dia só.")}
          ${formato("pontos_corridos", "Pontos corridos", "Todos jogam contra todos. Campeão é quem soma mais pontos.")}
          ${formato("grupos_mata_mata", "Grupos + mata-mata", "Fase de grupos e depois semifinal e final.")}
        </div>
        <div class="campo"><label for="ft-jpt">Jogadores por time</label>
          <div class="stepper">
            <button type="button" data-acao="menos" aria-label="Menos">−</button>
            <input id="ft-jpt" name="jogadores_por_time" type="number" inputmode="numeric" min="1" max="30" value="${t.jogadores_por_time}">
            <button type="button" data-acao="mais" aria-label="Mais">+</button>
          </div>
        </div>
        <button type="button" class="botao cheio" data-acao="salvar">${id ? "Salvar alterações" : "Criar e escolher jovens →"}</button>
      </form>
    </div>`, {
    menos: () => { const i = document.getElementById("ft-jpt"); i.value = Math.max(1, Number(i.value) - 1); },
    mais: () => { const i = document.getElementById("ft-jpt"); i.value = Math.min(30, Number(i.value) + 1); },
    salvar: async () => {
      const f = document.getElementById("form-torneio");
      const num = (v) => (v === "" ? null : Number(v));
      const dados = {
        nome: f.nome.value.trim(),
        esporte: f.esporte.value,
        data_inicio: f.data_inicio.value || null,
        local: f.local.value.trim() || null,
        categoria: f.querySelector('input[name="categoria"]:checked')?.value ?? "misto",
        idade_min: num(f.idade_min.value),
        idade_max: num(f.idade_max.value),
        formato: f.querySelector('input[name="formato"]:checked')?.value,
        jogadores_por_time: Number(f.jogadores_por_time.value) || 5,
      };
      if (dados.nome.length < 2) return aviso("Dê um nome ao torneio", "erro");
      if (dados.idade_min != null && dados.idade_max != null && dados.idade_min > dados.idade_max) return aviso("Idade mínima maior que a máxima", "erro");
      if (id) {
        await db(supabase.from("torneios").update(dados).eq("id", id), "Erro ao salvar");
        aviso("Torneio atualizado");
        ir(`#/torneio/${id}`);
      } else {
        const novo = await db(supabase.from("torneios").insert(dados).select("id").single(), "Erro ao criar");
        aviso("Torneio criado!");
        ir(`#/torneio/${novo.id}/inscritos`);
      }
    },
  });
}

// =========================================================
// Dentro do torneio
// =========================================================
let ctx = null; // { t, inscritos, times, jogos, gols, cads, porId, timePorId }
export const contexto = () => ctx;

export async function carregarTorneio(id) {
  const [t, inscritos, times, jogos, cads] = await Promise.all([
    db(supabase.from("torneios").select("*").eq("id", id).single(), "Torneio não encontrado"),
    db(supabase.from("torneio_inscritos").select("cadastro_id, time_id").eq("torneio_id", id)),
    db(supabase.from("times").select("*").eq("torneio_id", id).order("id")),
    db(supabase.from("jogos").select("*").eq("torneio_id", id).order("rodada").order("ordem").order("id")),
    carregarCadastros(),
  ]);
  const ids = jogos.map((j) => j.id);
  const [gols, penaltis] = ids.length
    ? await Promise.all([
      db(supabase.from("gols").select("*").in("jogo_id", ids)),
      db(supabase.from("eventos").select("jogo_id, time_id").eq("tipo", "penalti_gol").in("jogo_id", ids)),
    ])
    : [[], []];
  const porId = new Map(cads.map((c) => [c.id, c]));
  ctx = {
    t, times, jogos, gols, penaltis, cads, porId,
    inscritos: inscritos.filter((i) => porId.has(i.cadastro_id)),
    timePorId: new Map(times.map((x) => [x.id, x])),
  };
}

// Placar da disputa de pênaltis marcada ao vivo ("4×3"), ou "" se não houve
function placarPenaltis(j) {
  const doJogo = ctx.penaltis.filter((x) => x.jogo_id === j.id);
  if (!doJogo.length) return "";
  const n = (time) => doJogo.filter((x) => x.time_id === time).length;
  return `${n(j.time_a)}×${n(j.time_b)}`;
}

const ABAS = { inscritos: "Inscritos", times: "Times", jogos: "Jogos", tabela: "Tabela" };

export async function telaTorneio(id, aba) {
  if (!ABAS[aba]) aba = "inscritos";
  await carregarTorneio(id);
  const { t } = ctx;
  const faixa = t.idade_min != null || t.idade_max != null
    ? ` · ${t.idade_min ?? "?"}–${t.idade_max ?? "?"} anos` : "";
  const conteudo = { inscritos: abaInscritos, times: abaTimes, jogos: abaJogos, tabela: abaTabela }[aba]();

  render(`
    <div class="pagina">
      <div class="torneio-cabeca">
        <a class="icone-botao" href="#/torneios" aria-label="Voltar">${icone("voltar")}</a>
        <div>
          <h1>${e(t.nome)}</h1>
          <span class="suave pequeno">${e(t.esporte)} · ${CATEGORIA[t.categoria]}${faixa} · ${FORMATO[t.formato]}</span>
        </div>
        <button type="button" class="icone-botao" data-acao="opcoesTorneio" aria-label="Opções do torneio">${icone("pontos")}</button>
      </div>
      <nav class="abas-torneio" aria-label="Seções do torneio">
        ${Object.entries(ABAS).map(([k, r]) => `<a href="#/torneio/${t.id}/${k}" class="${k === aba ? "on" : ""}">${r}</a>`).join("")}
      </nav>
      ${conteudo.html}
    </div>`, {
    ...conteudo.acoes,
    opcoesTorneio: () => menu(t.nome, [
      { rotulo: "Editar torneio", fn: () => ir(`#/torneio/${t.id}/editar`) },
      t.status === "encerrado"
        ? { rotulo: "Reabrir torneio", fn: () => mudarStatus(t.status === "encerrado" && ctx.jogos.length ? "andamento" : "inscricoes", aba) }
        : { rotulo: "Encerrar torneio", fn: () => mudarStatus("encerrado", aba) },
      {
        rotulo: "Excluir torneio", perigo: true, fn: async () => {
          if (!confirm(`Excluir "${t.nome}" com todos os times e jogos? Os cadastros dos jovens continuam.`)) return;
          await db(supabase.from("torneios").delete().eq("id", t.id), "Erro ao excluir");
          aviso("Torneio excluído");
          ir("#/torneios");
        },
      },
    ]),
  });
}

async function mudarStatus(status, aba) {
  await db(supabase.from("torneios").update({ status }).eq("id", ctx.t.id), "Erro ao salvar");
  aviso(status === "encerrado" ? "Torneio encerrado" : "Torneio reaberto");
  telaTorneio(ctx.t.id, aba);
}

const recarregar = (aba) => telaTorneio(ctx.t.id, aba);

function combina(t, c) {
  if (!c.esportes.includes(t.esporte)) return false;
  if (t.categoria === "masculino" && c.sexo === "menina") return false;
  if (t.categoria === "feminino" && c.sexo === "menino") return false;
  if (c.idade != null) {
    if (t.idade_min != null && c.idade < t.idade_min) return false;
    if (t.idade_max != null && c.idade > t.idade_max) return false;
  }
  return c.topa_campeonatos !== "nao";
}

function descricaoCriterio(t) {
  const partes = [`jogam ${t.esporte.toLowerCase()}`];
  if (t.categoria !== "misto") partes.push(t.categoria === "masculino" ? "são meninos" : "são meninas");
  if (t.idade_min != null || t.idade_max != null) partes.push(`têm ${t.idade_min ?? 0} a ${t.idade_max ?? "∞"} anos`);
  partes.push("não recusaram campeonato");
  return partes.join(", ");
}

// ---------------- Inscritos ----------------
function abaInscritos() {
  const { t, inscritos, porId, timePorId, cads } = ctx;
  const ids = new Set(inscritos.map((i) => i.cadastro_id));
  const sugeridos = cads.filter((c) => !ids.has(c.id) && combina(t, c));
  const lista = inscritos
    .map((i) => ({ ...i, c: porId.get(i.cadastro_id) }))
    .sort((a, b) => a.c.nome.localeCompare(b.c.nome, "pt-BR"));
  const semTime = lista.filter((i) => !i.time_id).length;

  const inscrever = async (cadastroIds) => {
    if (!cadastroIds.length) return;
    await db(supabase.from("torneio_inscritos").upsert(
      cadastroIds.map((cadastro_id) => ({ torneio_id: t.id, cadastro_id })),
      { onConflict: "torneio_id,cadastro_id", ignoreDuplicates: true },
    ), "Erro ao inscrever");
    aviso(`${plural(cadastroIds.length, "jovem adicionado", "jovens adicionados")}`);
    recarregar("inscritos");
  };

  const html = `
    ${sugeridos.length ? `
      <div class="dica">
        <div>${icone("brilho")}<span><b>${plural(sugeridos.length, "jovem combina", "jovens combinam")}</b> com este torneio: ${e(descricaoCriterio(t))}.</span></div>
        <div class="linha-acoes">
          <button type="button" class="botao pequeno" data-acao="addTodos">Adicionar todos</button>
          <button type="button" class="botao secundario pequeno" data-acao="escolher">Escolher um a um</button>
        </div>
      </div>` : `
      <button type="button" class="botao secundario" data-acao="escolher">+ Escolher jovens</button>`}

    <div class="barra-info">
      <span>${plural(lista.length, "inscrito", "inscritos")}</span>
      ${lista.length ? `<span>${semTime ? plural(semTime, "sem time", "sem time") : "todos em times"}</span>` : ""}
    </div>
    <div class="lista">
      ${lista.map(({ c, time_id }) => {
        const time = timePorId.get(time_id);
        return `
        <div class="item">
          <span class="avatar">${e(iniciais(c.nome))}</span>
          <a class="item-corpo" href="#/jovem/${c.id}" style="color:inherit; text-decoration:none">
            <span class="item-titulo">${e(c.nome)}</span>
            <span class="item-tags">
              ${c.idade != null ? `<span class="tag">${c.idade} anos</span>` : ""}
              ${c.sexo ? `<span class="tag">${SEXO[c.sexo]}</span>` : ""}
              ${time ? `<span class="tag" style="border-color:${time.cor}">${e(time.nome)}</span>` : `<span class="tag" style="color:var(--vermelho)">Sem time</span>`}
            </span>
          </a>
          <button type="button" class="icone-botao" data-acao="remover" data-id="${c.id}" aria-label="Tirar ${e(c.nome)} do torneio">${icone("x")}</button>
        </div>`;
      }).join("") || `<div class="vazio-estado">Ninguém inscrito ainda.</div>`}
    </div>
    ${lista.length >= 2 ? `<a class="botao cheio" href="#/torneio/${t.id}/times">Montar times →</a>` : ""}`;

  return {
    html,
    acoes: {
      addTodos: () => inscrever(sugeridos.map((c) => c.id)),
      escolher: () => escolherJovens(cads.filter((c) => !ids.has(c.id)), new Set(sugeridos.map((c) => c.id)), inscrever),
      remover: async ({ id }) => {
        const c = porId.get(Number(id));
        if (!confirm(`Tirar ${c.nome} do torneio?`)) return;
        await db(supabase.from("torneio_inscritos").delete().eq("torneio_id", t.id).eq("cadastro_id", c.id), "Erro ao remover");
        await db(supabase.from("times").update({ capitao_id: null }).eq("torneio_id", t.id).eq("capitao_id", c.id));
        recarregar("inscritos");
      },
    },
  };
}

function escolherJovens(disponiveis, sugeridos, aoConfirmar) {
  const ordenados = [...disponiveis].sort((a, b) =>
    (sugeridos.has(b.id) - sugeridos.has(a.id)) || a.nome.localeCompare(b.nome, "pt-BR"));
  const marcados = new Set();
  let busca = "";

  const linhas = () => {
    const termo = semAcento(busca);
    const lista = ordenados.filter((c) => !termo || semAcento(c.nome).includes(termo));
    return lista.map((c) => `
      <label class="escolha">
        <input type="checkbox" value="${c.id}" ${marcados.has(c.id) ? "checked" : ""} data-ao-mudar="marcar">
        <span class="item-corpo">
          <span class="item-titulo">${e(c.nome)}</span>
          <span class="item-sub">${[c.idade != null ? c.idade + " anos" : null, SEXO[c.sexo], c.esporte_preferido].filter(Boolean).map(e).join(" · ")}${sugeridos.has(c.id) ? ` · <b style="color:var(--primaria)">combina</b>` : ""}</span>
        </span>
      </label>`).join("") || `<p class="suave">Ninguém encontrado.</p>`;
  };
  const atualizarBotao = () => {
    document.getElementById("ej-confirmar").textContent = marcados.size ? `Adicionar ${plural(marcados.size, "jovem", "jovens")}` : "Marque os jovens";
  };

  abrirSheet("Escolher jovens", `
    <div class="busca"><label>${icone("busca")}<input type="search" placeholder="Buscar nome" aria-label="Buscar" data-ao-digitar="buscar"></label></div>
    <div id="ej-lista">${linhas()}</div>
    <button type="button" id="ej-confirmar" class="botao cheio" data-acao="confirmar">Marque os jovens</button>`, {
    buscar: (el) => { busca = el.value; document.getElementById("ej-lista").innerHTML = linhas(); },
    marcar: (el) => { const id = Number(el.value); el.checked ? marcados.add(id) : marcados.delete(id); atualizarBotao(); },
    confirmar: async () => { if (!marcados.size) return; fecharSheet(); await aoConfirmar([...marcados]); },
  });
}

// ---------------- Times ----------------
function abaTimes() {
  const { t, inscritos, times, porId } = ctx;
  const jogadoresDo = (timeId) => inscritos
    .filter((i) => i.time_id === timeId)
    .map((i) => porId.get(i.cadastro_id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const semTime = jogadoresDo(null);
  const chip = (c, capitaoId) =>
    `<button type="button" class="jogador ${c.id === capitaoId ? "capitao" : ""}" data-acao="jogador" data-id="${c.id}">${e(primeiroNome(c.nome))}</button>`;
  const sugestaoQtd = Math.max(2, Math.round(inscritos.length / t.jogadores_por_time));

  const html = `
    <div class="linha-acoes">
      <button type="button" class="botao" data-acao="sortear">${icone("sortear")} Sortear times</button>
      <button type="button" class="botao secundario" data-acao="novoTime">+ Novo time</button>
    </div>
    ${!inscritos.length ? `<div class="vazio-estado">Inscreva jovens primeiro.<a class="botao secundario" href="#/torneio/${t.id}/inscritos">Ir para inscritos</a></div>` : ""}
    ${semTime.length ? `
      <div class="sem-time">
        <div class="item-linha"><b style="color:var(--vermelho)">${plural(semTime.length, "sem time", "sem time")}</b><span class="item-sub">toque para colocar num time</span></div>
        <div class="jogadores">${semTime.map((c) => chip(c)).join("")}</div>
      </div>` : ""}
    ${times.map((tm) => {
      const jog = jogadoresDo(tm.id);
      return `
      <div class="cartao" style="margin:0">
        <div class="time-cabeca">
          <span class="bolinha" style="background:${tm.cor}"></span>
          <b>${e(tm.nome)}</b>
          ${tm.grupo ? `<span class="tag">Grupo ${e(tm.grupo)}</span>` : ""}
          <span class="suave pequeno">${jog.length}/${t.jogadores_por_time}</span>
          <button type="button" class="icone-botao" data-acao="menuTime" data-id="${tm.id}" aria-label="Opções do time ${e(tm.nome)}">${icone("pontos")}</button>
        </div>
        <div class="jogadores">${jog.map((c) => chip(c, tm.capitao_id)).join("") || `<span class="suave pequeno">Nenhum jogador ainda</span>`}</div>
      </div>`;
    }).join("")}
    ${times.length >= 2 && !ctx.jogos.length ? `<a class="botao cheio" href="#/torneio/${t.id}/jogos">Gerar jogos →</a>` : ""}`;

  const salvarTimeDe = async (cadastroId, timeId) => {
    await db(supabase.from("torneio_inscritos").update({ time_id: timeId }).eq("torneio_id", t.id).eq("cadastro_id", cadastroId), "Erro ao mover");
    // quem sai do time deixa de ser capitão dele
    await db(supabase.from("times").update({ capitao_id: null }).eq("torneio_id", t.id).eq("capitao_id", cadastroId).neq("id", timeId ?? 0));
    recarregar("times");
  };

  return {
    html,
    acoes: {
      sortear: () => {
        abrirSheet("Sortear times", `
          <p class="suave" style="margin:0">Os ${inscritos.length} inscritos serão divididos equilibrando as idades.${times.length ? " <b>Os times atuais" + (ctx.jogos.length ? " e os jogos" : "") + " serão apagados.</b>" : ""}</p>
          <div class="campo"><label for="st-qtd">Quantos times?</label>
            <div class="stepper">
              <button type="button" data-acao="menos" aria-label="Menos">−</button>
              <input id="st-qtd" type="number" inputmode="numeric" min="2" max="16" value="${Math.min(16, sugestaoQtd)}">
              <button type="button" data-acao="mais" aria-label="Mais">+</button>
            </div>
            <small class="suave">Sugestão para ${t.jogadores_por_time} por time: ${sugestaoQtd} times</small>
          </div>
          <button type="button" class="botao cheio" data-acao="confirmar">${icone("sortear")} Sortear</button>`, {
          menos: () => { const i = document.getElementById("st-qtd"); i.value = Math.max(2, Number(i.value) - 1); },
          mais: () => { const i = document.getElementById("st-qtd"); i.value = Math.min(16, Number(i.value) + 1); },
          confirmar: async () => {
            const qtd = Number(document.getElementById("st-qtd").value);
            if (inscritos.length < 2) return aviso("Inscreva pelo menos 2 jovens", "erro");
            fecharSheet();
            const grupos = sortearTimes(inscritos.map((i) => ({ id: i.cadastro_id, idade: porId.get(i.cadastro_id).idade })), qtd);
            await db(supabase.from("jogos").delete().eq("torneio_id", t.id), "Erro ao limpar jogos");
            await db(supabase.from("times").delete().eq("torneio_id", t.id), "Erro ao limpar times");
            const novos = await db(supabase.from("times").insert(grupos.map((_, i) => ({
              torneio_id: t.id, nome: NOMES_TIMES[i % NOMES_TIMES.length], cor: CORES_TIMES[i % CORES_TIMES.length],
            }))).select("id").order("id"), "Erro ao criar times");
            await Promise.all(grupos.map((ids, i) => db(supabase.from("torneio_inscritos")
              .update({ time_id: novos[i].id }).eq("torneio_id", t.id).in("cadastro_id", ids))));
            await db(supabase.from("torneios").update({ status: "times" }).eq("id", t.id));
            aviso(`${plural(grupos.length, "time sorteado", "times sorteados")}!`);
            recarregar("times");
          },
        });
      },
      novoTime: async () => {
        const usados = new Set(times.map((x) => x.nome));
        const sugestao = NOMES_TIMES.find((n) => !usados.has(n)) ?? `Time ${times.length + 1}`;
        const nome = prompt("Nome do novo time:", sugestao)?.trim();
        if (!nome) return;
        await db(supabase.from("times").insert({ torneio_id: t.id, nome: nome.slice(0, 60), cor: CORES_TIMES[times.length % CORES_TIMES.length] }), "Erro ao criar time");
        recarregar("times");
      },
      menuTime: ({ id }) => {
        const tm = ctx.timePorId.get(Number(id));
        menu(tm.nome, [
          {
            rotulo: "Renomear", fn: async () => {
              const nome = prompt("Novo nome do time:", tm.nome)?.trim();
              if (!nome) return;
              await db(supabase.from("times").update({ nome: nome.slice(0, 60) }).eq("id", tm.id), "Erro ao renomear");
              recarregar("times");
            },
          },
          {
            rotulo: "Excluir time", perigo: true, fn: async () => {
              const temJogos = ctx.jogos.some((j) => j.time_a === tm.id || j.time_b === tm.id);
              if (!confirm(`Excluir o time ${tm.nome}?${temJogos ? " Os jogos dele também serão apagados." : ""} Os jogadores ficam sem time.`)) return;
              await db(supabase.from("times").delete().eq("id", tm.id), "Erro ao excluir time");
              recarregar("times");
            },
          },
        ]);
      },
      jogador: ({ id }) => {
        const c = porId.get(Number(id));
        const atual = inscritos.find((i) => i.cadastro_id === c.id)?.time_id ?? null;
        const timeAtual = ctx.timePorId.get(atual);
        menu(c.nome, [
          ...times.filter((tm) => tm.id !== atual).map((tm) => ({ rotulo: `Mover para ${tm.nome}`, fn: () => salvarTimeDe(c.id, tm.id) })),
          ...(atual ? [
            timeAtual.capitao_id === c.id
              ? { rotulo: "Tirar de capitão", fn: async () => { await db(supabase.from("times").update({ capitao_id: null }).eq("id", atual)); recarregar("times"); } }
              : { rotulo: `Definir como capitão do ${timeAtual.nome}`, fn: async () => { await db(supabase.from("times").update({ capitao_id: c.id }).eq("id", atual), "Erro ao salvar"); recarregar("times"); } },
            { rotulo: "Tirar do time", fn: () => salvarTimeDe(c.id, null) },
          ] : []),
          { rotulo: "Ver ficha", fn: () => ir(`#/jovem/${c.id}`) },
        ]);
      },
    },
  };
}

// ---------------- Jogos ----------------
function situacaoMataMata() {
  const { t, jogos, times } = ctx;
  const mm = jogos.filter((j) => j.mata_mata);
  if (t.formato === "grupos_mata_mata" && !mm.length) {
    const grupos = jogos.filter((j) => !j.mata_mata);
    if (grupos.length && grupos.every((j) => j.encerrado)) {
      const classificados = classificadosDosGrupos(classificacao(times, jogos));
      return { proxima: primeiraFaseMataMata(classificados), rodada: 100 };
    }
    return {};
  }
  if (!mm.length) return {};
  const ultimaRodada = Math.max(...mm.map((j) => j.rodada));
  const ultimos = mm.filter((j) => j.rodada === ultimaRodada).sort((a, b) => a.ordem - b.ordem);
  if (!ultimos.every((j) => j.encerrado)) return {};
  const vencedores = ultimos.map(vencedorDoJogo);
  if (vencedores.some((v) => v == null)) return {};
  if (vencedores.length === 1) return { campeao: vencedores[0] };
  return { proxima: proximaFase(vencedores), rodada: ultimaRodada + 1 };
}

function campeaoPontosCorridos() {
  const { t, jogos, times } = ctx;
  if (t.formato !== "pontos_corridos" || !jogos.length || !jogos.every((j) => j.encerrado)) return null;
  return classificacao(times, jogos)[0]?.linhas[0]?.time_id ?? null;
}

async function inserirJogos(lista) {
  await db(supabase.from("jogos").insert(lista.map((j) => ({ torneio_id: ctx.t.id, ...j }))), "Erro ao criar jogos");
}

const jogosMataMata = ({ fase, jogos }, rodada) => jogos.map(([a, b], i) => ({
  // num insert em lote, toda linha precisa ter as mesmas colunas (senão as ausentes viram null)
  fase, mata_mata: true, rodada, ordem: i, time_a: a, time_b: b,
  encerrado: b == null, vencedor_id: b == null ? a : null,
}));

function textoJogosZap() {
  const { t, jogos, timePorId } = ctx;
  const nome = (id) => timePorId.get(id)?.nome ?? "?";
  const linhas = [`*${t.nome}* — jogos`];
  let faseAtual = "";
  for (const j of jogos) {
    if (j.time_b == null) continue;
    const fase = j.mata_mata ? j.fase : `${j.fase}${ctx.t.formato === "grupos_mata_mata" ? " · Rodada " + j.rodada : ""}`;
    if (fase !== faseAtual) { linhas.push("", `*${fase}*`); faseAtual = fase; }
    const pen = j.encerrado && placarPenaltis(j) ? ` (pên. ${placarPenaltis(j)})` : "";
    const placar = j.encerrado ? ` ${j.gols_a} × ${j.gols_b}${pen} ` : " × ";
    linhas.push(`${nome(j.time_a)}${placar}${nome(j.time_b)}${!j.encerrado && j.data_hora ? " — " + dataHora(j.data_hora) : ""}`);
  }
  return linhas.join("\n");
}

function abaJogos() {
  const { t, jogos, times, timePorId } = ctx;
  const nome = (id) => e(timePorId.get(id)?.nome ?? "?");
  const cor = (id) => timePorId.get(id)?.cor ?? "var(--borda)";

  if (!jogos.length) {
    const explicacao = {
      mata_mata: "Os times se enfrentam e quem perde sai. Se o número de times não fechar a chave, alguns passam direto para a próxima fase.",
      pontos_corridos: "Cada time joga uma vez contra todos os outros.",
      grupos_mata_mata: "Os times são divididos em grupos de até 4. Os 2 melhores de cada grupo vão para o mata-mata.",
    }[t.formato];
    return {
      html: `
        <div class="vazio-estado">
          <b style="color:var(--texto)">${FORMATO[t.formato]}</b>
          <span>${explicacao}</span>
          ${times.length >= 2
            ? `<button type="button" class="botao" data-acao="gerar">Gerar jogos com ${plural(times.length, "time", "times")}</button>`
            : `<span>Monte pelo menos 2 times antes.</span><a class="botao secundario" href="#/torneio/${t.id}/times">Ir para times</a>`}
        </div>`,
      acoes: {
        gerar: async () => {
          const ids = times.map((x) => x.id);
          const lista = [];
          if (t.formato === "pontos_corridos") {
            todosContraTodos(ids).forEach((rodada, r) => rodada.forEach(([a, b], i) =>
              lista.push({ fase: `Rodada ${r + 1}`, rodada: r + 1, ordem: i, time_a: a, time_b: b })));
          } else if (t.formato === "grupos_mata_mata") {
            const grupos = dividirGrupos([...ids].sort(() => Math.random() - 0.5));
            await Promise.all(grupos.flatMap((g, gi) => g.map((id) =>
              db(supabase.from("times").update({ grupo: letraGrupo(gi) }).eq("id", id)))));
            grupos.forEach((g, gi) => todosContraTodos(g).forEach((rodada, r) => rodada.forEach(([a, b], i) =>
              lista.push({ fase: `Grupo ${letraGrupo(gi)}`, rodada: r + 1, ordem: gi * 100 + i, time_a: a, time_b: b }))));
          } else {
            lista.push(...jogosMataMata(primeiraFaseMataMata([...ids].sort(() => Math.random() - 0.5)), 1));
          }
          await inserirJogos(lista);
          await db(supabase.from("torneios").update({ status: "andamento" }).eq("id", t.id));
          aviso(`${plural(lista.filter((j) => j.time_b != null).length, "jogo criado", "jogos criados")}!`);
          recarregar("jogos");
        },
      },
    };
  }

  const { proxima, rodada, campeao } = situacaoMataMata();
  const campeaoFinal = campeao ?? campeaoPontosCorridos();

  // agrupa por fase (e rodada, nos grupos)
  const blocos = [];
  for (const j of [...jogos].sort((a, b) => a.rodada - b.rodada || a.ordem - b.ordem || a.id - b.id)) {
    const titulo = j.mata_mata ? j.fase : t.formato === "grupos_mata_mata" ? `Rodada ${j.rodada}` : j.fase;
    if (blocos.at(-1)?.titulo !== titulo) blocos.push({ titulo, jogos: [] });
    blocos.at(-1).jogos.push(j);
  }

  const cartaoJogo = (j) => {
    if (j.time_b == null) {
      return `<div class="jogo direto"><span class="bolinha" style="background:${cor(j.time_a)}"></span><span><b>${nome(j.time_a)}</b> passa direto para a próxima fase</span></div>`;
    }
    const v = vencedorDoJogo(j);
    const estado = (id) => (!j.encerrado || v == null ? "" : v === id ? "venceu" : "perdeu");
    const aoVivo = !j.encerrado && (j.cronometro_inicio || j.cronometro_seg > 0 || j.periodo > 1);
    const mostraPlacar = j.encerrado || aoVivo;
    const quando = j.encerrado
      ? (j.vencedor_id && j.gols_a === j.gols_b ? `PÊNALTIS${placarPenaltis(j) ? "<br>" + placarPenaltis(j) : ""}` : "ENCERRADO")
      : aoVivo ? `<span class="selo-vivo">AO VIVO</span>`
      : j.data_hora ? e(dataHora(j.data_hora)).toUpperCase() : "A JOGAR";
    return `
      <button type="button" class="jogo ${aoVivo ? "vivo" : ""}" data-acao="abrirJogo" data-id="${j.id}">
        <span class="jogo-times">
          <span class="${estado(j.time_a)}"><span class="bolinha" style="background:${cor(j.time_a)}"></span>${nome(j.time_a)}<b>${mostraPlacar ? j.gols_a ?? 0 : "–"}</b></span>
          <span class="${estado(j.time_b)}"><span class="bolinha" style="background:${cor(j.time_b)}"></span>${nome(j.time_b)}<b>${mostraPlacar ? j.gols_b ?? 0 : "–"}</b></span>
        </span>
        <span class="jogo-quando">${!j.mata_mata && t.formato === "grupos_mata_mata" ? `${e(j.fase)}<br>` : ""}${quando}</span>
      </button>`;
  };

  const html = `
    ${campeaoFinal ? `
      <div class="campeao">${icone("trofeu")}<div><span>CAMPEÃO</span><b>${nome(campeaoFinal)}</b></div></div>
      ${t.status !== "encerrado" ? `<button type="button" class="botao" data-acao="encerrar">Encerrar torneio</button>` : ""}` : ""}
    ${proxima ? `
      <div class="dica">
        <div>${icone("brilho")}<span>Fase concluída! Próxima: <b>${e(proxima.fase)}</b> (${plural(proxima.jogos.length, "jogo", "jogos")}).</span></div>
        <button type="button" class="botao pequeno" data-acao="proximaFase">Gerar ${e(proxima.fase.toLowerCase())}</button>
      </div>` : ""}
    <div class="linha-acoes">
      <a class="botao secundario pequeno" href="${linkCompartilharZap(textoJogosZap())}" target="_blank" rel="noopener">${icone("zap")} Enviar no WhatsApp</a>
      <button type="button" class="botao secundario pequeno" data-acao="refazer">Refazer jogos</button>
    </div>
    ${blocos.map((b) => `<p class="fase-titulo">${e(b.titulo)}</p><div class="lista">${b.jogos.map(cartaoJogo).join("")}</div>`).join("")}`;

  return {
    html,
    acoes: {
      abrirJogo: ({ id }) => ir(`#/jogo/${id}`),
      proximaFase: async () => {
        await inserirJogos(jogosMataMata(proxima, rodada));
        aviso(`${proxima.fase} gerada!`);
        recarregar("jogos");
      },
      encerrar: () => mudarStatus("encerrado", "jogos"),
      refazer: async () => {
        if (!confirm("Apagar TODOS os jogos e placares deste torneio para gerar de novo?")) return;
        await db(supabase.from("jogos").delete().eq("torneio_id", t.id), "Erro ao apagar jogos");
        await db(supabase.from("times").update({ grupo: null }).eq("torneio_id", t.id));
        await db(supabase.from("torneios").update({ status: "times" }).eq("id", t.id));
        recarregar("jogos");
      },
    },
  };
}

// Editor do placar "na mão" (também usado pela tela ao vivo para encerrar com pênaltis)
export function editarJogo(j, depois = () => recarregar("jogos")) {
  const { inscritos, porId, timePorId, gols } = ctx;
  const ta = timePorId.get(j.time_a);
  const tb = timePorId.get(j.time_b);
  const golsDe = new Map(gols.filter((g) => g.jogo_id === j.id).map((g) => [g.cadastro_id, g.quantidade]));
  const jogadores = (tm) => inscritos.filter((i) => i.time_id === tm.id).map((i) => porId.get(i.cadastro_id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const stepper = (id, valor, rotulo) => `
    <div class="stepper">
      <button type="button" data-acao="menos" data-alvo="${id}" aria-label="Menos ${e(rotulo)}">−</button>
      <input id="${id}" type="number" inputmode="numeric" min="0" max="99" value="${valor}" aria-label="${e(rotulo)}" data-ao-digitar="mudouPlacar">
      <button type="button" data-acao="mais" data-alvo="${id}" aria-label="Mais ${e(rotulo)}">+</button>
    </div>`;
  const listaGols = (tm) => jogadores(tm).map((c) => `
    <div class="gols-jogador"><span>${e(primeiroNome(c.nome))}</span>${stepper("g-" + c.id, golsDe.get(c.id) ?? 0, "gols de " + c.nome)}</div>`).join("")
    || `<p class="suave pequeno" style="margin:4px 0">Time sem jogadores</p>`;
  const localData = j.data_hora ? new Date(new Date(j.data_hora).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

  const atualizarPenaltis = () => {
    const a = Number(document.getElementById("pl-a").value);
    const b = Number(document.getElementById("pl-b").value);
    document.getElementById("penaltis").hidden = !(j.mata_mata && a === b);
  };

  abrirSheet(j.mata_mata ? j.fase : `${j.fase}${ctx.t.formato === "grupos_mata_mata" ? " · Rodada " + j.rodada : ""}`, `
    <div class="placar-edicao">
      <div><span><span class="bolinha" style="background:${ta.cor}"></span> ${e(ta.nome)}</span>${stepper("pl-a", j.gols_a ?? 0, "gols " + ta.nome)}</div>
      <span class="x">×</span>
      <div><span><span class="bolinha" style="background:${tb.cor}"></span> ${e(tb.nome)}</span>${stepper("pl-b", j.gols_b ?? 0, "gols " + tb.nome)}</div>
    </div>
    <div id="penaltis" class="campo" hidden>
      <span class="rotulo">Empate no mata-mata: quem venceu nos pênaltis?</span>
      <div class="opcoes">
        <label class="chip"><input type="radio" name="penaltis" value="${ta.id}" ${j.vencedor_id === ta.id ? "checked" : ""}><span>${e(ta.nome)}</span></label>
        <label class="chip"><input type="radio" name="penaltis" value="${tb.id}" ${j.vencedor_id === tb.id ? "checked" : ""}><span>${e(tb.nome)}</span></label>
      </div>
    </div>
    <details class="cartao" style="padding:12px 14px; margin:0">
      <summary style="cursor:pointer; font-weight:700">Quem fez os gols? <span class="suave pequeno">(artilharia)</span></summary>
      <p class="sobretitulo" style="margin-top:12px">${e(ta.nome)}</p>${listaGols(ta)}
      <p class="sobretitulo" style="margin-top:12px">${e(tb.nome)}</p>${listaGols(tb)}
    </details>
    <div class="linha">
      <div class="campo"><label for="jg-data">Dia e hora</label><input id="jg-data" type="datetime-local" value="${localData}"></div>
      <div class="campo"><label for="jg-local">Local</label><input id="jg-local" type="text" maxlength="80" value="${e(j.local ?? ctx.t.local ?? "")}"></div>
    </div>
    <div class="linha-acoes">
      ${j.encerrado
        ? `<button type="button" class="botao secundario" data-acao="salvar" data-encerrar="nao">Reabrir jogo</button>`
        : `<button type="button" class="botao secundario" data-acao="salvar" data-encerrar="nao">Salvar sem encerrar</button>`}
      <button type="button" class="botao" data-acao="salvar" data-encerrar="sim">${j.encerrado ? "Salvar placar" : "Encerrar e salvar"}</button>
    </div>`, {
    menos: ({ alvo }) => { const i = document.getElementById(alvo); i.value = Math.max(0, Number(i.value) - 1); atualizarPenaltis(); },
    mais: ({ alvo }) => { const i = document.getElementById(alvo); i.value = Math.min(99, Number(i.value) + 1); atualizarPenaltis(); },
    mudouPlacar: atualizarPenaltis,
    salvar: async ({ encerrar }) => {
      const gols_a = Number(document.getElementById("pl-a").value) || 0;
      const gols_b = Number(document.getElementById("pl-b").value) || 0;
      const fechar = encerrar === "sim";
      let vencedor_id = null;
      if (j.mata_mata && fechar && gols_a === gols_b) {
        vencedor_id = Number(document.querySelector('input[name="penaltis"]:checked')?.value) || null;
        if (!vencedor_id) return aviso("No mata-mata, escolha quem venceu nos pênaltis", "erro");
      }
      const data = document.getElementById("jg-data").value;
      await db(supabase.from("jogos").update({
        gols_a, gols_b, vencedor_id, encerrado: fechar,
        data_hora: data ? new Date(data).toISOString() : null,
        local: document.getElementById("jg-local").value.trim() || null,
      }).eq("id", j.id), "Erro ao salvar jogo");

      const marcadores = [...document.querySelectorAll('#sheet input[id^="g-"]')]
        .map((i) => ({ jogo_id: j.id, cadastro_id: Number(i.id.slice(2)), quantidade: Number(i.value) || 0 }))
        .filter((g) => g.quantidade > 0);
      await db(supabase.from("gols").delete().eq("jogo_id", j.id), "Erro ao salvar gols");
      if (marcadores.length) await db(supabase.from("gols").insert(marcadores), "Erro ao salvar gols");

      fecharSheet();
      aviso(fechar ? "Placar salvo!" : "Jogo salvo");
      depois();
    },
  });
  atualizarPenaltis();
}

// ---------------- Tabela ----------------
function abaTabela() {
  const { t, jogos, times, timePorId, gols, porId, inscritos } = ctx;
  const nome = (id) => e(timePorId.get(id)?.nome ?? "?");
  if (!jogos.length) {
    return { html: `<div class="vazio-estado">A tabela aparece depois que os jogos forem gerados.<a class="botao secundario" href="#/torneio/${t.id}/jogos">Ir para jogos</a></div>`, acoes: {} };
  }

  const comGrupos = t.formato !== "mata_mata";
  const tabelas = comGrupos ? classificacao(times.filter((x) => t.formato === "pontos_corridos" || x.grupo), jogos) : [];
  const classificam = t.formato === "grupos_mata_mata" ? 2 : 1;
  const { campeao } = situacaoMataMata();
  const campeaoFinal = campeao ?? campeaoPontosCorridos();

  const tabelaHtml = (tab) => `
    ${tab.grupo ? `<p class="fase-titulo">Grupo ${e(tab.grupo)}</p>` : ""}
    <div class="tabela-class" role="table">
      <div class="lin cab" role="row"><span>#</span><span>Time</span><span>J</span><span>V</span><span>E</span><span>D</span><span>SG</span><span>PTS</span></div>
      ${tab.linhas.map((l, i) => `
        <div class="lin" role="row">
          <span><span class="pos ${i < classificam ? "classifica" : ""}">${i + 1}</span></span>
          <span><span class="bolinha" style="background:${timePorId.get(l.time_id)?.cor}"></span>${nome(l.time_id)}</span>
          <span>${l.j}</span><span>${l.v}</span><span>${l.e}</span><span>${l.d}</span><span>${l.sg > 0 ? "+" : ""}${l.sg}</span>
          <span class="pts">${l.pts}</span>
        </div>`).join("")}
    </div>`;

  const mm = jogos.filter((j) => j.mata_mata && j.time_b != null);
  const fases = [...new Set(mm.sort((a, b) => a.rodada - b.rodada || a.ordem - b.ordem).map((j) => j.fase))];

  const timeDoJogador = new Map(inscritos.map((i) => [i.cadastro_id, i.time_id]));
  const artilharia = Object.entries(gols.reduce((acc, g) => ((acc[g.cadastro_id] = (acc[g.cadastro_id] || 0) + g.quantidade), acc), {}))
    .map(([id, n]) => ({ c: porId.get(Number(id)), n }))
    .filter((a) => a.c)
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  const textoZap = [
    `*${t.nome}*`,
    campeaoFinal ? `🏆 Campeão: *${timePorId.get(campeaoFinal)?.nome}*` : null,
    ...tabelas.flatMap((tab) => ["", tab.grupo ? `*Grupo ${tab.grupo}*` : "*Classificação*",
      ...tab.linhas.map((l, i) => `${i + 1}º ${timePorId.get(l.time_id)?.nome} — ${l.pts} pts (${l.v}V ${l.e}E ${l.d}D, saldo ${l.sg})`)]),
    ...(artilharia.length ? ["", "*Artilharia*", ...artilharia.slice(0, 5).map((a, i) => `${i + 1}º ${a.c.nome} — ${a.n}`)] : []),
  ].filter((x) => x !== null).join("\n");

  const html = `
    ${campeaoFinal ? `<div class="campeao">${icone("trofeu")}<div><span>CAMPEÃO</span><b>${nome(campeaoFinal)}</b></div></div>` : ""}
    ${tabelas.map(tabelaHtml).join("")}
    ${t.formato === "grupos_mata_mata" ? `<p class="suave pequeno" style="margin:0 4px">Os 2 primeiros de cada grupo vão para o mata-mata.</p>` : ""}
    ${fases.map((fase) => `
      <p class="fase-titulo">${e(fase)}</p>
      <div class="cartao lista-simples" style="margin:0; padding:4px 14px">
        ${mm.filter((j) => j.fase === fase).map((j) => {
          const v = vencedorDoJogo(j);
          return `<div class="item" style="cursor:default">
            <span class="item-corpo"><span class="item-titulo">${nome(j.time_a)} ${j.encerrado ? `${j.gols_a} × ${j.gols_b}` : "×"} ${nome(j.time_b)}</span>
            ${v ? `<span class="item-sub">Classificado: ${nome(v)}${j.vencedor_id && j.gols_a === j.gols_b ? ` (pênaltis${placarPenaltis(j) ? " " + placarPenaltis(j).replace("×", " × ") : ""})` : ""}</span>` : `<span class="item-sub">A jogar</span>`}</span></div>`;
        }).join("")}
      </div>`).join("")}
    <p class="fase-titulo">Artilharia</p>
    <div class="cartao lista-simples" style="margin:0; padding:4px 14px">
      ${artilharia.map((a, i) => `
        <a class="item" href="#/jovem/${a.c.id}">
          <span style="width:26px; font-weight:800" class="suave">${i + 1}º</span>
          <span class="item-corpo"><span class="item-titulo">${e(a.c.nome)}</span><span class="item-sub">${nome(timeDoJogador.get(a.c.id))}</span></span>
          <b style="font-size:1.1rem">${a.n}</b>
        </a>`).join("") || `<p class="suave pequeno">Os gols aparecem aqui quando forem lançados nos jogos.</p>`}
    </div>
    <a class="botao secundario" href="${linkCompartilharZap(textoZap)}" target="_blank" rel="noopener">${icone("zap")} Compartilhar tabela no WhatsApp</a>`;

  return { html, acoes: {} };
}
