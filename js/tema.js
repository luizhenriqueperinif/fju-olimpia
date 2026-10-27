// Carregado no <head> (sem "module") para aplicar o tema antes da página aparecer.
(function () {
  var raiz = document.documentElement;
  var salvo = null;
  try { salvo = localStorage.getItem("tema"); } catch (e) {}
  var escuroNoSistema = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;

  function aplicar(tema) {
    raiz.dataset.tema = tema;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = tema === "escuro" ? "#050a18" : "#f4f7ff";
    var botao = document.getElementById("trocar-tema");
    if (botao) {
      botao.textContent = tema === "escuro" ? "☀️" : "🌙";
      botao.setAttribute("aria-label", tema === "escuro" ? "Usar tema claro" : "Usar tema escuro");
    }
  }

  aplicar(salvo || (escuroNoSistema ? "escuro" : "claro"));

  document.addEventListener("DOMContentLoaded", function () {
    aplicar(raiz.dataset.tema);
    document.getElementById("trocar-tema").addEventListener("click", function () {
      var novo = raiz.dataset.tema === "escuro" ? "claro" : "escuro";
      aplicar(novo);
      try { localStorage.setItem("tema", novo); } catch (e) {}
    });
  });
})();
