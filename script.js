/* ============================================================
   BOMBANET — SCRIPT PRINCIPAL
   ============================================================ */


/* ============================================================
   GOOGLE ANALYTICS
   ============================================================ */

/*
 * Verifica se o Google Analytics está carregado.
 */
function analyticsEvent(eventName, parameters = {}) {
  if (typeof gtag === "function") {
    gtag("event", eventName, parameters);
  }
}


/*
 * Descobre o domínio da loja a partir do link do produto.
 *
 * Exemplo:
 * https://www.exemplo.com/produto
 *
 * retorna:
 * exemplo.com
 */
function getStoreName(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "Loja não identificada";
  }
}


/* ============================================================
   RENDER DOS PRODUTOS
   ============================================================ */

const grid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");


function getCategories(product) {

  // Se tiver várias categorias, usa elas
  if (Array.isArray(product.categories)) {
    return product.categories;
  }

  // Se tiver apenas uma categoria, transforma em array
  if (product.category) {
    return [product.category];
  }

  // Caso não tenha categoria
  return [];
}


/*
 * Cria os cards dos produtos.
 */
function renderProducts(list) {

  grid.innerHTML = "";

  if (list.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;


  list.forEach(p => {

    const categories = getCategories(p);

    const card = document.createElement("a");

    card.href = p.link;
    card.target = "_blank";
    card.rel = "noopener";
    card.className = "product-card";


    // Todas as categorias do produto
    card.dataset.category = categories.join(" ");


    card.innerHTML = `
      <div
        class="product-thumb"
        style="background-image:url('${p.image}')"
      >
        ${
          p.tag
            ? `<span class="product-tag">${p.tag}</span>`
            : ""
        }
      </div>

      <div class="product-body">

        <span class="product-cat">
          ${p.categoryLabel || ""}
        </span>

        <span class="product-name">
          ${p.name}
        </span>

        <div class="product-footer">

          <span class="product-price">
            ${p.price}

            ${
              p.oldPrice
                ? `<small>${p.oldPrice}</small>`
                : ""
            }
          </span>

          <span class="product-link">
            Ver oferta ↗
          </span>

        </div>

      </div>
    `;


    /* ========================================================
       ANALYTICS — CLIQUE NO PRODUTO
       ======================================================== */

    card.addEventListener("click", () => {

      analyticsEvent("product_click", {

        product_name: p.name,

        product_category:
          p.categoryLabel || categories.join(", "),

        store:
          getStoreName(p.link),

        product_url:
          p.link

      });

    });


    grid.appendChild(card);

  });

}


/* ============================================================
   FILTRO POR CATEGORIA + BUSCA
   ============================================================ */

let activeCategory = "todos";

const searchInput =
  document.getElementById("searchInput");


/*
 * Remove acentos e deixa o texto padronizado.
 *
 * Exemplo:
 *
 * "Câmera" → "camera"
 * "Acessórios" → "acessorios"
 */
function normalizeText(text) {

  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

}


/*
 * Aplica categoria + pesquisa.
 */
function applyFilters() {

  const term =
    normalizeText(searchInput.value);


  const filtered =
    PRODUCTS.filter(p => {

      const categories =
        getCategories(p);


      /*
       * Verifica a categoria.
       */
      const matchesCategory =
        activeCategory === "todos" ||
        categories.includes(activeCategory);


      /*
       * Texto que poderá ser pesquisado.
       *
       * Nome
       * Categoria
       * Etiqueta
       */
      const searchableText =
        normalizeText(`
          ${p.name || ""}
          ${p.categoryLabel || ""}
          ${p.tag || ""}
          ${categories.join(" ")}
        `);


      /*
       * Verifica a pesquisa.
       */
      const matchesSearch =
        term === "" ||
        searchableText.includes(term);


      return matchesCategory && matchesSearch;

    });


  renderProducts(filtered);


  /*
   * Mensagem quando não encontrar.
   */
  if (filtered.length === 0) {

    if (term !== "") {

      emptyState.textContent =
        `Nenhum produto encontrado para "${searchInput.value}".`;

    } else {

      emptyState.textContent =
        "Nenhum produto encontrado nessa categoria.";

    }

  } else {

    emptyState.textContent =
      "Nenhum produto encontrado. Tente outra busca ou categoria.";

  }

}


/* ============================================================
   CLIQUE NAS CATEGORIAS
   ============================================================ */

document
  .getElementById("catRow")
  .addEventListener("click", (e) => {

    const chip =
      e.target.closest(".cat-chip");

    if (!chip) return;


    document
      .querySelectorAll(".cat-chip")
      .forEach(c => {

        c.classList.remove("is-active");

      });


    chip.classList.add("is-active");


    activeCategory =
      chip.dataset.filter;


    /*
     * GOOGLE ANALYTICS
     *
     * Registra a categoria selecionada.
     */
    analyticsEvent("category_click", {

      category:
        chip.dataset.filter,

      category_name:
        chip.textContent.trim()

    });


    applyFilters();

  });


/* ============================================================
   PESQUISA
   ============================================================ */

/*
 * Aplicação normal do filtro.
 */
searchInput.addEventListener(
  "input",
  applyFilters
);


/*
 * GOOGLE ANALYTICS — PESQUISA
 *
 * Espera 800ms depois que a pessoa parar de digitar.
 *
 * Assim não registramos:
 *
 * m
 * mo
 * moc
 * moch
 * mochila
 *
 * como cinco pesquisas diferentes.
 */

let searchTimer = null;
let lastTrackedSearch = "";


searchInput.addEventListener("input", () => {

  clearTimeout(searchTimer);


  searchTimer = setTimeout(() => {

    const originalTerm =
      searchInput.value.trim();

    const term =
      normalizeText(originalTerm);


    /*
     * Não registra pesquisas vazias
     * ou muito pequenas.
     */
    if (term.length < 2) {
      return;
    }


    /*
     * Não registra novamente
     * exatamente a mesma pesquisa.
     */
    if (term === lastTrackedSearch) {
      return;
    }


    lastTrackedSearch = term;


    analyticsEvent("search", {

      search_term:
        originalTerm

    });

  }, 800);

});


/* ============================================================
   RENDERIZAÇÃO INICIAL
   ============================================================ */

renderProducts(PRODUCTS);


/* ============================================================
   MENU MOBILE
   ============================================================ */

const menuToggle =
  document.getElementById("menuToggle");

const mainNav =
  document.getElementById("mainNav");


menuToggle.addEventListener("click", () => {

  const isOpen =
    mainNav.classList.toggle("is-open");


  menuToggle.setAttribute(
    "aria-expanded",
    isOpen
  );

});


mainNav
  .querySelectorAll("a")
  .forEach(link => {

    link.addEventListener("click", () => {

      mainNav.classList.remove("is-open");

      menuToggle.setAttribute(
        "aria-expanded",
        "false"
      );

    });

  });


/* ============================================================
   FORMULÁRIOS
   ============================================================

   Os formulários são enviados diretamente
   para o Web3Forms pelo HTML.

   NÃO usar e.preventDefault() aqui.

   ============================================================ */