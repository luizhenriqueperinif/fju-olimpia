import { supabase, db, e, render, ir, icone, abrirSheet, fecharSheet, menu, aviso, primeiroNome } from "./nucleo.js";
import { carregarTorneio, contexto, editarJogo } from "./torneios.js";

// =========================================================
// Jogo ao vivo: cronômetro + lance a lance
// =========================================================
const TIPOS = {
  gol: ["⚽", "Gol"],
  falta: ["🚫", "Falta"],
  amarelo: ["🟨", "Amarelo"],
  vermelho: ["🟥", "Vermelho"],
  fora: ["↗️", "Bola fora"],
  penalti_gol: ["✅", "Pênalti convertido"],
  penalti_fora: ["❌", "Pênalti perdido"],
};
const BOTOES_JOGO = ["gol", "falta", "amarelo", "vermelho", "fora"];
const BOTOES_PENALTIS = ["penalti_gol", "penalti_fora"];
const PEDE_JOGADOR = new Set(["gol", "falta", "amarelo", "vermelho", "penalti_gol", "penalti_fora"]);
const PENALTIS = 5; // período da disputa de pênaltis

let relogio = null;     // atualiza o cronômetro na tela a cada segundo
let sincronia = null;   // busca lances de outros celulares a cada poucos segundos
let assinatura = "";    // detecta se algo mudou no banco

const segundosDe = (j) => j.cronometro_seg + (j.cronometro_inicio ? Math.max(0, Math.floor((Date.now() - new Date(j.cronometro_inicio)) / 1000)) : 0);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
// 1 e 2 = tempo normal · 3 e 4 = prorrogação · 5 = pênaltis
const nomePeriodo = (p) => ["", "1º tempo", "2º tempo", "1º tempo da prorrogação", "2º tempo da prorrogação", "Pênaltis"][p] ?? `${p}º período`;
const siglaPeriodo = (p) => ["", "1ºT", "2ºT", "1ºP", "2ºP", "PÊN"][p] ?? `${p}º`;

function pararTimers() {
  clearInterval(relogio);
  clearInterval(sincronia);
  relogio = sincronia = null;
}

async function carregarJogo(id) {
  const [jogo, eventos] = await Promise.all([
    db(supabase.from("jogos").select("*").eq("id", id).single(), "Jogo não encontrado"),
    db(supabase.from("eventos").select("*").eq("jogo_id", id).order("periodo").order("segundo").order("id")),
  ]);
  return { jogo, eventos };
}

export async function telaJogo(id) {
  pararTimers();
  let { jogo: j, eventos } = await carregarJogo(id);
  await carregarTorneio(j.torneio_id);
  const { t, timePorId, inscritos, porId } = contexto();
  const ta = timePorId.get(j.time_a);
  const tb = timePorId.get(j.time_b);
  if (!ta || !tb) return ir(`#/torneio/${j.torneio_id}/jogos`);
  const rota = location.hash;

  const jogadores = (tm) => inscritos.filter((i) => i.time_id === tm.id).map((i) => porId.get(i.cadastro_id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  function desenhar() {
    assinatura = JSON.stringify([j, eventos.map((x) => x.id)]);
    const rodando = !!j.cronometro_inicio;
    const comecou = rodando || j.cronometro_seg > 0 || j.periodo > 1 || eventos.length > 0;
    // no futsal, as faltas do 2º tempo seguem acumulando na prorrogação
    const futsal = t.esporte === "Futsal";
    const periodosDasFaltas = futsal && j.periodo >= 2 ? [2, 3, 4] : [j.periodo];
    const doPeriodo = (tm, tipo) => eventos.filter((x) => x.time_id === tm.id && x.tipo === tipo && periodosDasFaltas.includes(x.periodo)).length;
    const naDisputa = !j.encerrado && j.periodo === PENALTIS;
    const teveDisputa = eventos.some((x) => x.periodo === PENALTIS);
    const bolinhas = (tm) => eventos.filter((x) => x.time_id === tm.id && x.periodo === PENALTIS)
      .map((x) => `<span class="cobranca ${x.tipo === "penalti_gol" ? "convertido" : "perdido"}">${icone(x.tipo === "penalti_gol" ? "check" : "x")}</span>`).join("")
      || `<span class="suave pequeno">nenhuma cobrança</span>`;
    const total = (tm, tipo) => eventos.filter((x) => x.time_id === tm.id && x.tipo === tipo).length;
    const limiteFaltas = futsal ? 5 : Infinity; // futsal: a partir da 6ª, tiro livre sem barreira
    const nomeJog = (cid) => (cid ? porId.get(cid)?.nome : null);

    const coluna = (tm, lado) => `
      <div class="lado-lances">
        <p class="lado-nome"><span class="bolinha" style="background:${tm.cor}"></span>${e(tm.nome)}</p>
        ${(naDisputa ? BOTOES_PENALTIS : BOTOES_JOGO).map((tipo) => [tipo, ...TIPOS[tipo]]).map(([tipo, emoji, rotulo]) => `
          <button type="button" class="botao-lance ${tipo}" data-acao="lance" data-tipo="${tipo}" data-lado="${lado}" ${j.encerrado ? "disabled" : ""}>
            <span>${emoji}</span>${rotulo}
          </button>`).join("")}
      </div>`;

    const numeros = (rotulo, tipo, porPeriodo) => {
      const a = porPeriodo ? doPeriodo(ta, tipo) : total(ta, tipo);
      const b = porPeriodo ? doPeriodo(tb, tipo) : total(tb, tipo);
      if (!a && !b && tipo !== "falta") return "";
      return `<div class="numero-lance">
        <b class="${a >= limiteFaltas && tipo === "falta" ? "alerta" : ""}">${a}</b><span>${rotulo}</span><b class="${b >= limiteFaltas && tipo === "falta" ? "alerta" : ""}">${b}</b>
      </div>`;
    };

    render(`
      <div class="pagina">
        <div class="torneio-cabeca">
          <a class="icone-botao" href="#/torneio/${t.id}/jogos" aria-label="Voltar">${icone("voltar")}</a>
          <div>
            <h1>${e(j.fase)}</h1>
            <span class="suave pequeno">${e(t.nome)}${j.local ?? t.local ? " · " + e(j.local ?? t.local) : ""}</span>
          </div>
          <button type="button" class="icone-botao" data-acao="opcoes" aria-label="Opções do jogo">${icone("pontos")}</button>
        </div>

        <div class="placar-vivo">
          <div class="placar-time"><span class="bolinha" style="background:${ta.cor}"></span><b>${e(ta.nome)}</b></div>
          <div class="placar-numeros"><b>${j.gols_a ?? 0}</b><span>×</span><b>${j.gols_b ?? 0}</b></div>
          <div class="placar-time"><span class="bolinha" style="background:${tb.cor}"></span><b>${e(tb.nome)}</b></div>
          <div class="cronometro ${rodando ? "rodando" : ""}">
            ${j.encerrado
              ? `<span class="periodo">ENCERRADO${teveDisputa ? ` · PÊNALTIS ${pen(ta)} × ${pen(tb)}` : ""}</span>`
              : naDisputa
              ? `<span class="periodo">DISPUTA DE PÊNALTIS</span><span class="tempo rodando">${pen(ta)} × ${pen(tb)}</span>`
              : `<span class="periodo">${rodando ? `<span class="selo-vivo">AO VIVO</span> ` : comecou ? "PAUSADO · " : ""}${nomePeriodo(j.periodo).toUpperCase()}</span>
                 <span id="relogio" class="tempo">${mmss(segundosDe(j))}</span>`}
          </div>
          ${naDisputa ? `
          <div class="cobrancas">
            <div><b>${e(ta.nome)}</b><span>${bolinhas(ta)}</span></div>
            <div><b>${e(tb.nome)}</b><span>${bolinhas(tb)}</span></div>
          </div>
          <button type="button" class="botao" data-acao="encerrarPenaltis" style="grid-column:1/-1">Encerrar disputa de pênaltis</button>` : ""}
          ${j.encerrado || naDisputa ? "" : `
          <div class="controles-relogio">
            ${rodando
              ? `<button type="button" class="botao secundario" data-acao="pausar">⏸ Pausar</button>`
              : `<button type="button" class="botao" data-acao="iniciar">▶ ${comecou && j.cronometro_seg > 0 ? "Continuar" : `Começar ${nomePeriodo(j.periodo)}`}</button>`}
            ${rodando || j.cronometro_seg > 0 ? `<button type="button" class="botao secundario" data-acao="fimPeriodo">Fim do ${nomePeriodo(j.periodo)}</button>` : ""}
          </div>
          ${comecou ? `<button type="button" class="botao secundario encerrar-jogo" data-acao="encerrarJogo">Encerrar jogo</button>` : ""}`}
        </div>

        <div class="numeros-lances">
          ${naDisputa ? "" : numeros(futsal && j.periodo >= 3 ? "Faltas (2º tempo + prorrogação)" : `Faltas no ${nomePeriodo(j.periodo)}`, "falta", true)}
          ${numeros("Amarelos", "amarelo", false)}
          ${numeros("Vermelhos", "vermelho", false)}
          ${numeros("Bolas fora", "fora", false)}
        </div>

        ${j.encerrado ? "" : `<div class="grade-lances">${coluna(ta, "a")}${coluna(tb, "b")}</div>`}

        <p class="fase-titulo">Lance a lance</p>
        <div class="cartao lista-simples lances" style="margin:0; padding:4px 14px">
          ${[...eventos].reverse().map((x) => {
            const tm = timePorId.get(x.time_id);
            const [emoji, rotulo] = TIPOS[x.tipo];
            const quem = nomeJog(x.cadastro_id);
            return `
            <div class="lance">
              <span class="lance-tempo">${x.periodo === PENALTIS ? "" : mmss(x.segundo)}<small>${siglaPeriodo(x.periodo)}</small></span>
              <span class="lance-emoji">${emoji}</span>
              <span class="item-corpo">
                <span class="item-titulo">${rotulo}${quem ? " · " + e(quem) : ""}</span>
                <span class="item-sub"><span class="bolinha" style="background:${tm?.cor}"></span> ${e(tm?.nome ?? "")}</span>
              </span>
              <button type="button" class="icone-botao" data-acao="desfazer" data-id="${x.id}" aria-label="Apagar lance">${icone("x")}</button>
            </div>`;
          }).join("") || `<p class="suave pequeno">Os lances aparecem aqui conforme forem marcados.</p>`}
        </div>
      </div>`, acoes);
  }

  // ---------- gravação ----------
  async function atualizarJogo(dados) {
    j = await db(supabase.from("jogos").update(dados).eq("id", j.id).select("*").single(), "Erro ao salvar o jogo");
    desenhar();
  }

  // placar e artilharia saem dos lances de gol
  async function recontarGols() {
    const gols = eventos.filter((x) => x.tipo === "gol");
    const porJogador = new Map();
    for (const g of gols) if (g.cadastro_id) porJogador.set(g.cadastro_id, (porJogador.get(g.cadastro_id) ?? 0) + 1);
    await db(supabase.from("gols").delete().eq("jogo_id", j.id), "Erro ao salvar gols");
    if (porJogador.size) {
      await db(supabase.from("gols").insert([...porJogador].map(([cadastro_id, quantidade]) => ({ jogo_id: j.id, cadastro_id, quantidade }))), "Erro ao salvar gols");
    }
    await atualizarJogo({
      gols_a: gols.filter((g) => g.time_id === ta.id).length,
      gols_b: gols.filter((g) => g.time_id === tb.id).length,
    });
  }

  // recarrega o torneio (gols atualizados) antes de abrir o editor de placar
  async function abrirEditor() {
    await carregarTorneio(t.id);
    editarJogo(contexto().jogos.find((x) => x.id === j.id) ?? j, () => telaJogo(j.id));
  }

  async function registrar(tipo, tm, cadastroId, segundo) {
    const novo = await db(supabase.from("eventos").insert({
      jogo_id: j.id, time_id: tm.id, cadastro_id: cadastroId, tipo, periodo: j.periodo, segundo,
    }).select("*").single(), "Erro ao marcar lance");
    eventos.push(novo);
    eventos.sort((a, b) => a.periodo - b.periodo || a.segundo - b.segundo || a.id - b.id);
    if (tipo === "gol") await recontarGols(); else desenhar();
    const [emoji, rotulo] = TIPOS[tipo];
    aviso(`${emoji} ${rotulo} · ${tm.nome}`);
  }

  const pen = (tm) => eventos.filter((x) => x.time_id === tm.id && x.tipo === "penalti_gol").length;

  async function encerrarNormal() {
    await atualizarJogo({ encerrado: true, vencedor_id: null, cronometro_seg: segundosDe(j), cronometro_inicio: null, gols_a: j.gols_a ?? 0, gols_b: j.gols_b ?? 0 });
    aviso("Jogo encerrado!");
  }

  // Quando o tempo acaba: encerrar, prorrogação ou pênaltis
  function decidirFim(titulo) {
    const placar = `${ta.nome} ${j.gols_a ?? 0} × ${j.gols_b ?? 0} ${tb.nome}`;
    if ((j.gols_a ?? 0) !== (j.gols_b ?? 0)) {
      if (confirm(`Encerrar o jogo? ${placar}`)) encerrarNormal();
      return;
    }
    const zerado = { cronometro_seg: 0, cronometro_inicio: null };
    menu(`${titulo} · empate ${j.gols_a ?? 0} × ${j.gols_b ?? 0}`, [
      ...(j.periodo <= 2 ? [{ rotulo: "⏱️ Ir para a prorrogação", fn: () => atualizarJogo({ periodo: 3, ...zerado }) }] : []),
      { rotulo: "🥅 Disputa de pênaltis", fn: () => atualizarJogo({ periodo: PENALTIS, ...zerado }) },
      ...(j.mata_mata
        ? [{ rotulo: "Escolher o vencedor sem marcar os pênaltis", fn: async () => { await atualizarJogo({ cronometro_seg: segundosDe(j), cronometro_inicio: null }); abrirEditor(); } }]
        : [{ rotulo: "Encerrar empatado", fn: encerrarNormal }]),
    ]);
  }

  const acoes = {
    iniciar: () => atualizarJogo({ cronometro_inicio: new Date().toISOString(), gols_a: j.gols_a ?? 0, gols_b: j.gols_b ?? 0 }),
    pausar: () => atualizarJogo({ cronometro_seg: segundosDe(j), cronometro_inicio: null }),
    fimPeriodo: () => {
      // fim do 1º tempo (normal ou da prorrogação): segue para o próximo
      if (j.periodo === 1 || j.periodo === 3) {
        if (!confirm(`Encerrar o ${nomePeriodo(j.periodo)}? O cronômetro volta para 00:00 no próximo tempo.`)) return;
        return atualizarJogo({ periodo: j.periodo + 1, cronometro_seg: 0, cronometro_inicio: null });
      }
      return decidirFim(`Fim do ${nomePeriodo(j.periodo)}`);
    },
    encerrarJogo: () => decidirFim("Encerrar jogo"),
    encerrarPenaltis: async () => {
      const a = pen(ta), b = pen(tb);
      if (a === b) return aviso(`Pênaltis empatados em ${a} × ${b} — continuem as cobranças`, "erro");
      const vencedor = a > b ? ta : tb;
      if (!confirm(`${vencedor.nome} venceu nos pênaltis por ${Math.max(a, b)} × ${Math.min(a, b)}. Encerrar o jogo?`)) return;
      await atualizarJogo({ encerrado: true, vencedor_id: vencedor.id, cronometro_inicio: null, gols_a: j.gols_a ?? 0, gols_b: j.gols_b ?? 0 });
      aviso(`🏆 ${vencedor.nome} venceu nos pênaltis!`);
    },
    lance: ({ tipo, lado }) => {
      const tm = lado === "a" ? ta : tb;
      const segundo = segundosDe(j); // o tempo do lance é o da hora do toque
      if (!PEDE_JOGADOR.has(tipo)) return registrar(tipo, tm, null, segundo);
      const [emoji, rotulo] = TIPOS[tipo];
      menu(`${emoji} ${rotulo} · ${tm.nome} — quem?`, [
        ...jogadores(tm).map((c) => ({ rotulo: c.nome, fn: () => registrar(tipo, tm, c.id, segundo) })),
        { rotulo: "Não sei / não identificar", fn: () => registrar(tipo, tm, null, segundo) },
      ]);
    },
    desfazer: async ({ id }) => {
      const x = eventos.find((ev) => ev.id === Number(id));
      if (!x || !confirm(`Apagar este lance (${TIPOS[x.tipo][1]} aos ${mmss(x.segundo)})?`)) return;
      await db(supabase.from("eventos").delete().eq("id", x.id), "Erro ao apagar lance");
      eventos = eventos.filter((ev) => ev.id !== x.id);
      if (x.tipo === "gol") await recontarGols(); else desenhar();
    },
    opcoes: () => menu("Jogo", [
      { rotulo: j.encerrado ? "Reabrir / corrigir placar" : "Editar placar, data e local", fn: abrirEditor },
      ...(!j.encerrado && (j.cronometro_seg > 0 || j.cronometro_inicio)
        ? [{ rotulo: "Zerar cronômetro deste tempo", fn: () => confirm("Zerar o cronômetro?") && atualizarJogo({ cronometro_seg: 0, cronometro_inicio: j.cronometro_inicio ? new Date().toISOString() : null }) }]
        : []),
      { rotulo: "Voltar para os jogos", fn: () => ir(`#/torneio/${t.id}/jogos`) },
    ]),
  };

  desenhar();

  const aindaAqui = () => location.hash === rota && document.body.contains(document.getElementById("app"));
  relogio = setInterval(() => {
    if (!aindaAqui()) return pararTimers();
    const el = document.getElementById("relogio");
    if (el) el.textContent = mmss(segundosDe(j));
  }, 1000);
  // outros celulares podem estar marcando o mesmo jogo
  sincronia = setInterval(async () => {
    if (!aindaAqui()) return pararTimers();
    if (document.getElementById("sheet")?.hidden === false || document.hidden) return;
    const { data: jogo } = await supabase.from("jogos").select("*").eq("id", j.id).single();
    const { data: evs } = await supabase.from("eventos").select("*").eq("jogo_id", j.id).order("periodo").order("segundo").order("id");
    if (!jogo || !evs || !aindaAqui() || document.getElementById("sheet")?.hidden === false) return;
    if (JSON.stringify([jogo, evs.map((x) => x.id)]) !== assinatura) {
      j = jogo;
      eventos = evs;
      desenhar();
    }
  }, 4000);
}
