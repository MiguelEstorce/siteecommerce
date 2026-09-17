/* Controla a tela de carregamento "Bombanet".
   Fica visível por um tempo mínimo (pra não piscar rápido demais)
   e some sozinha assim que a página termina de carregar. */

document.body.classList.add("is-loading");

const preloader = document.getElementById("preloader");
const fill = document.getElementById("preloaderFill");
const MIN_DISPLAY_MS = 1800;
const startTime = performance.now();

// dá o efeito de "carregando" na barra
requestAnimationFrame(() => {
  fill.style.width = "85%";
});

function hidePreloader() {
  const elapsed = performance.now() - startTime;
  const remaining = Math.max(MIN_DISPLAY_MS - elapsed, 0);

  setTimeout(() => {
    fill.style.width = "100%";

    setTimeout(() => {
      preloader.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
    }, 150);
  }, remaining);
}

if (document.readyState === "complete") {
  hidePreloader();
} else {
  window.addEventListener("load", hidePreloader);
}
