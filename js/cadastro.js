import { supabase, configurado, ESPORTES, ICONES, escapeHtml, mascaraTelefone } from "./comum.js";

const form = document.getElementById("formulario");
const listaEsportes = document.getElementById("lista-esportes");
const outroEsporte = document.getElementById("outro-esporte");
const selectPreferido = document.getElementById("esporte_preferido");
const campoIgreja = document.getElementById("campo-igreja");
const telefone = document.getElementById("telefone");
const erroBox = document.getElementById("erro");
const botaoEnviar = document.getElementById("enviar");

if (!configurado) document.getElementById("aviso-config").classList.remove("oculto");

// Só admins cadastram: sem login (ou sem permissão) volta para o painel
async function conferirAdmin() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return location.replace("admin.html");
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) location.replace("admin.html");
}
if (configurado) {
  conferirAdmin();
  supabase.auth.onAuthStateChange((evento) => { if (evento === "SIGNED_OUT") location.replace("admin.html"); });
}

listaEsportes.innerHTML = [...ESPORTES, "Outro"]
  .map((e) => `<label class="chip"><input type="checkbox" value="${escapeHtml(e)}"><span><i>${ICONES[e]}</i>${escapeHtml(e)}</span></label>`)
  .join("");

function esportesMarcados() {
  const marcados = [...listaEsportes.querySelectorAll("input:checked")].map((i) => i.value);
  return marcados
    .map((e) => (e === "Outro" ? outroEsporte.value.trim() : e))
    .filter(Boolean);
}

function atualizarPreferido() {
  const outroMarcado = listaEsportes.querySelector('input[value="Outro"]').checked;
  outroEsporte.classList.toggle("oculto", !outroMarcado);

  const atual = selectPreferido.value;
  const esportes = esportesMarcados();
  if (!esportes.length) {
    selectPreferido.innerHTML = `<option value="">Marque os esportes acima primeiro</option>`;
    return;
  }
  selectPreferido.innerHTML =
    `<option value="">Escolha...</option>` +
    esportes.map((e) => `<option value="${escapeHtml(e)}">${ICONES[e] ?? "➕"} ${escapeHtml(e)}</option>`).join("");
  if (esportes.length === 1) selectPreferido.value = esportes[0];
  else if (esportes.includes(atual)) selectPreferido.value = atual;
}

listaEsportes.addEventListener("change", atualizarPreferido);
outroEsporte.addEventListener("input", atualizarPreferido);

telefone.addEventListener("input", () => { telefone.value = mascaraTelefone(telefone.value); });

form.querySelectorAll('input[name="frequenta_igreja"]').forEach((r) =>
  r.addEventListener("change", () => campoIgreja.classList.toggle("oculto", r.value !== "sim" || !r.checked)),
);

function mostrarErro(msg) {
  erroBox.textContent = msg;
  erroBox.classList.toggle("oculto", !msg);
}

function valorRadio(nome) {
  return form.querySelector(`input[name="${nome}"]:checked`)?.value ?? null;
}

function validar() {
  const nome = form.nome.value.trim();
  const tel = telefone.value.replace(/\D/g, "");
  const esportes = esportesMarcados();

  if (nome.length < 2) return "Informe o nome completo do jovem.";
  if (!valorRadio("sexo")) return "Informe se é menino ou menina.";
  if (tel.length < 10) return "Informe um WhatsApp válido com DDD.";
  if (form.endereco.value.trim().length < 3) return "Informe o endereço do jovem.";
  if (form.bairro.value.trim().length < 2) return "Informe o bairro do jovem.";
  if (listaEsportes.querySelector('input[value="Outro"]').checked && !outroEsporte.value.trim())
    return "Escreva qual é o outro esporte.";
  if (!esportes.length) return "Marque pelo menos um esporte.";
  if (!selectPreferido.value) return "Escolha o esporte preferido do jovem.";
  if (!valorRadio("topa_campeonatos")) return "Informe se o jovem topa participar de campeonatos.";
  if (!valorRadio("frequenta_igreja")) return "Informe se o jovem frequenta alguma igreja.";
  return null;
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  mostrarErro("");

  const problema = validar();
  if (problema) return mostrarErro(problema);

  // robô preencheu o campo invisível: finge sucesso e não salva
  if (form.site.value) return mostrarSucesso();

  if (!configurado) return mostrarErro("Sistema ainda não configurado (veja o README).");

  const frequenta = valorRadio("frequenta_igreja") === "sim";
  const registro = {
    nome: form.nome.value.trim(),
    sexo: valorRadio("sexo"),
    telefone: telefone.value,
    data_nascimento: form.data_nascimento.value || null,
    endereco: form.endereco.value.trim(),
    bairro: form.bairro.value.trim(),
    esportes: esportesMarcados(),
    esporte_preferido: selectPreferido.value,
    topa_campeonatos: valorRadio("topa_campeonatos"),
    frequenta_igreja: frequenta,
    igreja_nome: frequenta ? form.igreja_nome.value.trim() || null : null,
    consentimento: true, // a equipe pergunta pessoalmente na hora do cadastro
  };

  botaoEnviar.disabled = true;
  botaoEnviar.textContent = "Salvando...";
  const { error } = await supabase.from("cadastros").insert(registro);
  botaoEnviar.disabled = false;
  botaoEnviar.textContent = "Cadastrar jovem →";

  if (error) {
    console.error(error);
    if (error.code === "42501") return mostrarErro("Sua sessão expirou ou você não tem permissão. Entre de novo no painel.");
    return mostrarErro("Não foi possível salvar agora. Verifique a internet e tente de novo.");
  }
  mostrarSucesso();
});

function mostrarSucesso() {
  form.classList.add("oculto");
  document.getElementById("tela-sucesso").classList.remove("oculto");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("novo").addEventListener("click", () => {
  form.reset();
  atualizarPreferido();
  campoIgreja.classList.add("oculto");
  document.getElementById("tela-sucesso").classList.add("oculto");
  form.classList.remove("oculto");
  window.scrollTo({ top: 0 });
  form.nome.focus({ preventScroll: true });
});
