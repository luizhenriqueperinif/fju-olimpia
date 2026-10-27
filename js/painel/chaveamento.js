// Regras de torneio sem acesso ao banco: geração de jogos, mata-mata,
// classificação e sorteio de times. Tudo trabalha com ids de times/jogadores.

// Todos contra todos (método do círculo). Retorna rodadas: [[[a, b], ...], ...]
export function todosContraTodos(ids) {
  const lista = [...ids];
  if (lista.length < 2) return [];
  if (lista.length % 2) lista.push(null); // número ímpar: um time folga por rodada
  const n = lista.length;
  const rodadas = [];
  for (let r = 0; r < n - 1; r++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a !== null && b !== null) jogos.push(r % 2 ? [b, a] : [a, b]);
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop()); // gira mantendo o primeiro fixo
  }
  return rodadas;
}

// Divide os times em grupos de ~4, distribuindo em "zigue-zague".
export function dividirGrupos(ids) {
  const qtd = Math.max(1, Math.round(ids.length / 4));
  const grupos = Array.from({ length: qtd }, () => []);
  ids.forEach((id, i) => {
    const volta = Math.floor(i / qtd);
    const pos = i % qtd;
    grupos[volta % 2 ? qtd - 1 - pos : pos].push(id);
  });
  return grupos;
}

export const letraGrupo = (i) => String.fromCharCode(65 + i); // 0 → A

export function nomeFase(qtdTimes) {
  return { 2: "Final", 4: "Semifinal", 8: "Quartas de final", 16: "Oitavas de final" }[qtdTimes]
    ?? `Mata-mata (${qtdTimes} times)`;
}

const potenciaDe2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(n, 2)));

// Primeira fase do mata-mata. Os primeiros da lista (cabeças de chave) passam
// direto quando o número de times não é potência de 2. Retorna {fase, jogos: [[a, b|null]]}
export function primeiraFaseMataMata(ids) {
  const vagas = potenciaDe2(ids.length);
  const folgas = vagas - ids.length;
  const diretos = ids.slice(0, folgas).map((id) => [id, null]);
  const resto = ids.slice(folgas);
  const confrontos = [];
  for (let i = 0; i < resto.length / 2; i++) confrontos.push([resto[i], resto[resto.length - 1 - i]]);
  // intercala quem passou direto com os confrontos, para não se enfrentarem logo em seguida
  const jogos = [];
  while (diretos.length || confrontos.length) {
    if (diretos.length) jogos.push(diretos.shift());
    if (confrontos.length) jogos.push(confrontos.shift());
  }
  return { fase: nomeFase(vagas), jogos };
}

// Próxima fase: vencedores na ordem dos jogos, 1º×2º, 3º×4º...
export function proximaFase(vencedores) {
  const jogos = [];
  for (let i = 0; i + 1 < vencedores.length; i += 2) jogos.push([vencedores[i], vencedores[i + 1]]);
  return { fase: nomeFase(vencedores.length), jogos };
}

export function vencedorDoJogo(jogo) {
  if (!jogo.encerrado) return null;
  if (jogo.time_b == null) return jogo.time_a;
  if (jogo.vencedor_id) return jogo.vencedor_id;
  if (jogo.gols_a > jogo.gols_b) return jogo.time_a;
  if (jogo.gols_b > jogo.gols_a) return jogo.time_b;
  return null;
}

// Classificação por grupo (ou geral). Só conta jogos encerrados fora do mata-mata.
// Retorna [{grupo, linhas: [{time_id, j, v, e, d, gp, gc, sg, pts}]}]
export function classificacao(times, jogos) {
  const linha = (t) => ({ time_id: t.id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 });
  const porTime = new Map(times.map((t) => [t.id, linha(t)]));
  for (const jg of jogos) {
    if (jg.mata_mata || !jg.encerrado || jg.time_b == null) continue;
    const a = porTime.get(jg.time_a);
    const b = porTime.get(jg.time_b);
    if (!a || !b) continue;
    a.j++; b.j++;
    a.gp += jg.gols_a; a.gc += jg.gols_b;
    b.gp += jg.gols_b; b.gc += jg.gols_a;
    if (jg.gols_a > jg.gols_b) { a.v++; b.d++; a.pts += 3; }
    else if (jg.gols_b > jg.gols_a) { b.v++; a.d++; b.pts += 3; }
    else { a.e++; b.e++; a.pts++; b.pts++; }
  }
  const grupos = new Map();
  for (const t of times) {
    const g = t.grupo ?? "";
    if (!grupos.has(g)) grupos.set(g, []);
    const l = porTime.get(t.id);
    l.sg = l.gp - l.gc;
    grupos.get(g).push(l);
  }
  const ordenar = (x, y) => y.pts - x.pts || y.v - x.v || y.sg - x.sg || y.gp - x.gp;
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, linhas]) => ({ grupo, linhas: linhas.sort(ordenar) }));
}

// Classificados dos grupos para o mata-mata, cruzando 1º de um com 2º de outro.
export function classificadosDosGrupos(tabelas, porGrupo = 2) {
  const primeiros = tabelas.map((t) => t.linhas[0]?.time_id).filter(Boolean);
  const segundos = porGrupo > 1 ? tabelas.map((t) => t.linhas[1]?.time_id).filter(Boolean) : [];
  // [A1, B1, ..., B2, A2] → primeiraFaseMataMata cruza o 1º da lista com o último
  return [...primeiros, ...segundos];
}

function embaralhar(lista, aleatorio = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sorteia times equilibrando pela idade: os mais velhos são distribuídos
// em zigue-zague para nenhum time ficar só com os maiores.
export function sortearTimes(jogadores, qtdTimes, aleatorio = Math.random) {
  const qtd = Math.max(1, Math.min(qtdTimes, jogadores.length));
  const ordem = embaralhar(jogadores, aleatorio).sort((a, b) => (b.idade ?? -1) - (a.idade ?? -1));
  const times = Array.from({ length: qtd }, () => []);
  ordem.forEach((j, i) => {
    const volta = Math.floor(i / qtd);
    const pos = i % qtd;
    times[volta % 2 ? qtd - 1 - pos : pos].push(j.id);
  });
  return times;
}

export const NOMES_TIMES = ["Leões", "Águias", "Tubarões", "Falcões", "Lobos", "Panteras",
  "Tigres", "Gaviões", "Touros", "Raposas", "Ursos", "Cobras", "Corujas", "Jaguares", "Búfalos", "Escorpiões"];
export const CORES_TIMES = ["#ffc928", "#4f8cff", "#34d17f", "#ff7b70", "#b37bff", "#ff9f43",
  "#2ed3c6", "#f368e0", "#c8d6e5", "#a3cb38", "#e17055", "#74b9ff", "#fdcb6e", "#55efc4", "#fab1a0", "#81ecec"];
