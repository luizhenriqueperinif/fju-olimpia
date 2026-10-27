import assert from "node:assert/strict";
const m = await import(new URL("../js/painel/chaveamento.js", import.meta.url));

// todos contra todos: cada par joga exatamente uma vez
for (const n of [2, 3, 4, 5, 6, 7, 8]) {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const rodadas = m.todosContraTodos(ids);
  const pares = rodadas.flat().map(([a, b]) => [a, b].sort().join("-"));
  assert.equal(new Set(pares).size, (n * (n - 1)) / 2, `todos contra todos n=${n}`);
  assert.equal(pares.length, (n * (n - 1)) / 2);
  for (const r of rodadas) { const t = r.flat(); assert.equal(new Set(t).size, t.length, "time repetido na rodada"); }
}

// grupos
assert.deepEqual(m.dividirGrupos([1, 2, 3, 4, 5, 6, 7, 8]).map((g) => g.length), [4, 4]);
assert.deepEqual(m.dividirGrupos([1, 2, 3, 4, 5, 6]).map((g) => g.length), [3, 3]);
assert.deepEqual(m.dividirGrupos([1, 2, 3]).map((g) => g.length), [3]);
assert.equal(m.dividirGrupos(Array.from({ length: 10 }, (_, i) => i)).flat().length, 10);

// mata-mata
let f = m.primeiraFaseMataMata([1, 2, 3, 4]);
assert.equal(f.fase, "Semifinal");
assert.deepEqual(f.jogos, [[1, 4], [2, 3]]);
f = m.primeiraFaseMataMata([1, 2, 3, 4, 5, 6]); // 8 vagas, 2 passam direto
assert.equal(f.fase, "Quartas de final");
assert.equal(f.jogos.length, 4);
assert.deepEqual(f.jogos.filter(([, b]) => b === null).map(([a]) => a), [1, 2]);
assert.equal(new Set(f.jogos.flat().filter(Boolean)).size, 6);
f = m.primeiraFaseMataMata([1, 2]);
assert.equal(f.fase, "Final");
assert.deepEqual(m.proximaFase([1, 2, 3, 4]), { fase: "Semifinal", jogos: [[1, 2], [3, 4]] });
assert.equal(m.proximaFase([7, 9]).fase, "Final");

// vencedor
assert.equal(m.vencedorDoJogo({ encerrado: true, time_a: 1, time_b: 2, gols_a: 2, gols_b: 1 }), 1);
assert.equal(m.vencedorDoJogo({ encerrado: true, time_a: 1, time_b: 2, gols_a: 1, gols_b: 1, vencedor_id: 2 }), 2);
assert.equal(m.vencedorDoJogo({ encerrado: true, time_a: 1, time_b: null }), 1);
assert.equal(m.vencedorDoJogo({ encerrado: false, time_a: 1, time_b: 2, gols_a: 3, gols_b: 0 }), null);

// classificação
const times = [{ id: 1, grupo: "A" }, { id: 2, grupo: "A" }, { id: 3, grupo: "A" }, { id: 4, grupo: "B" }, { id: 5, grupo: "B" }];
const jogos = [
  { encerrado: true, mata_mata: false, time_a: 1, time_b: 2, gols_a: 3, gols_b: 0 },
  { encerrado: true, mata_mata: false, time_a: 2, time_b: 3, gols_a: 1, gols_b: 1 },
  { encerrado: true, mata_mata: false, time_a: 3, time_b: 1, gols_a: 2, gols_b: 2 },
  { encerrado: false, mata_mata: false, time_a: 4, time_b: 5, gols_a: null, gols_b: null },
  { encerrado: true, mata_mata: true, time_a: 1, time_b: 4, gols_a: 9, gols_b: 0 },
];
const tab = m.classificacao(times, jogos);
assert.deepEqual(tab.map((t) => t.grupo), ["A", "B"]);
assert.deepEqual(tab[0].linhas.map((l) => [l.time_id, l.pts, l.sg]), [[1, 4, 3], [3, 2, 0], [2, 1, -3]]);
assert.equal(tab[1].linhas[0].j, 0);
assert.deepEqual(m.classificadosDosGrupos(tab), [1, 4, 3, 5]);

// sorteio: todo mundo em exatamente um time, tamanhos equilibrados, idades equilibradas
const jog = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, idade: 14 + (i % 10) }));
const sorteio = m.sortearTimes(jog, 4);
assert.equal(sorteio.length, 4);
assert.equal(new Set(sorteio.flat()).size, 23);
const tam = sorteio.map((t) => t.length);
assert.ok(Math.max(...tam) - Math.min(...tam) <= 1, "tamanhos desiguais " + tam);
const media = (t) => t.reduce((s, id) => s + jog[id - 1].idade, 0) / t.length;
const medias = sorteio.map(media);
assert.ok(Math.max(...medias) - Math.min(...medias) < 1.5, "idades desequilibradas " + medias);
assert.equal(m.sortearTimes(jog.slice(0, 2), 5).length, 2);

console.log("todos os testes passaram");
