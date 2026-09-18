/* ============================================================
   BOMBANET — SCRIPT PRINCIPAL
   ============================================================ */


/* ============================================================
   GOOGLE ANALYTICS
   ============================================================ */

function analyticsEvent(eventName, parameters = {}) {

  if (typeof gtag === "function") {
    gtag("event", eventName, parameters);
  }

}


/* ============================================================
   INFORMAÇÕES DA LOJA
   ============================================================ */

function getStoreName(link) {

  try {

    return new URL(link)
      .hostname
      .replace(/^www\./, "");

  } catch {

    return "Loja não identificada";

  }

}


/* ============================================================
   RENDER DOS PRODUTOS
   ============================================================ */

const grid =
  document.getElementById("productGrid");

const emptyState =
  document.getElementById("emptyState");

const pagination =
  document.getElementById("pagination");


/*
 * Quantidade de produtos por página.
 */

const PRODUCTS_PER_PAGE = 8;


/*
 * Página atual.
 */

let currentPage = 1;


/*
 * Lista atualmente filtrada.
 */

let currentProducts = [];


/* ============================================================
   CATEGORIAS
   ============================================================ */

function getCategories(product) {

  if (Array.isArray(product.categories)) {
    return product.categories;
  }

  if (product.category) {
    return [product.category];
  }

  return [];

}


/* ============================================================
   CRIAÇÃO DOS CARDS
   ============================================================ */

function createProductCard(p) {

  const categories =
    getCategories(p);


  const card =
    document.createElement("a");


  card.href = p.link;

  card.target = "_blank";

  card.rel = "noopener";

  card.className = "product-card";


  /*
   * Todas as categorias do produto.
   */

  card.dataset.category =
    categories.join(" ");


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
     GOOGLE ANALYTICS — CLIQUE NO PRODUTO
     ======================================================== */

  card.addEventListener("click", () => {

    analyticsEvent("product_click", {

      product_name:
        p.name,

      product_category:
        p.categoryLabel ||
        categories.join(", "),

      store:
        getStoreName(p.link),

      product_url:
        p.link

    });

  });


  return card;

}


/* ============================================================
   PAGINAÇÃO
   ============================================================ */

function renderPagination() {

  pagination.innerHTML = "";


  /*
   * Quantidade total de páginas.
   */

  const totalPages =
    Math.ceil(
      currentProducts.length /
      PRODUCTS_PER_PAGE
    );


  /*
   * Se tiver apenas uma página,
   * não mostra paginação.
   */

  if (totalPages <= 1) {

    pagination.style.display = "none";

    return;

  }


  pagination.style.display = "flex";


  /*
   * BOTÃO ANTERIOR
   */

  const previousButton =
    document.createElement("button");


  previousButton.type = "button";

  previousButton.className =
    "pagination-button pagination-prev";


  previousButton.innerHTML =
    "← Anterior";


  previousButton.disabled =
    currentPage === 1;


  previousButton.addEventListener(
    "click",
    () => {

      if (currentPage > 1) {

        currentPage--;

        renderCurrentPage();

        scrollToProducts();

      }

    }
  );


  pagination.appendChild(
    previousButton
  );


  /*
   * NÚMEROS DAS PÁGINAS
   */

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {

    const pageButton =
      document.createElement("button");


    pageButton.type = "button";

    pageButton.className =
      "pagination-button pagination-number";


    pageButton.textContent =
      page;


    if (page === currentPage) {

      pageButton.classList.add(
        "is-active"
      );

      pageButton.setAttribute(
        "aria-current",
        "page"
      );

    }


    pageButton.addEventListener(
      "click",
      () => {

        currentPage = page;

        renderCurrentPage();

        scrollToProducts();

      }
    );


    pagination.appendChild(
      pageButton
    );

  }


  /*
   * BOTÃO PRÓXIMA
   */

  const nextButton =
    document.createElement("button");


  nextButton.type = "button";

  nextButton.className =
    "pagination-button pagination-next";


  nextButton.innerHTML =
    "Próxima →";


  nextButton.disabled =
    currentPage === totalPages;


  nextButton.addEventListener(
    "click",
    () => {

      if (currentPage < totalPages) {

        currentPage++;

        renderCurrentPage();

        scrollToProducts();

      }

    }
  );


  pagination.appendChild(
    nextButton
  );

}


/* ============================================================
   RENDERIZA A PÁGINA ATUAL
   ============================================================ */

function renderCurrentPage() {

  grid.innerHTML = "";


  /*
   * Nenhum produto.
   */

  if (currentProducts.length === 0) {

    emptyState.hidden = false;

    pagination.innerHTML = "";

    pagination.style.display = "none";

    return;

  }


  emptyState.hidden = true;


  /*
   * Calcula onde começa e termina a página.
   */

  const startIndex =
    (currentPage - 1) *
    PRODUCTS_PER_PAGE;


  const endIndex =
    startIndex +
    PRODUCTS_PER_PAGE;


  const pageProducts =
    currentProducts.slice(
      startIndex,
      endIndex
    );


  /*
   * Cria os cards somente
   * da página atual.
   */

  pageProducts.forEach(p => {

    grid.appendChild(
      createProductCard(p)
    );

  });


  /*
   * Atualiza a paginação.
   */

  renderPagination();

}


/* ============================================================
   RENDER PRINCIPAL
   ============================================================ */

function renderProducts(list) {

  currentProducts = list;

  renderCurrentPage();

}


/* ============================================================
   FILTRO POR CATEGORIA + BUSCA
   ============================================================ */

let activeCategory = "todos";


const searchInput =
  document.getElementById("searchInput");


/*
 * Normaliza texto.
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
    normalizeText(
      searchInput.value
    );


  const filtered =
    PRODUCTS.filter(p => {

      const categories =
        getCategories(p);


      /*
       * Categoria.
       */

      const matchesCategory =
        activeCategory === "todos" ||
        categories.includes(
          activeCategory
        );


      /*
       * Texto pesquisável.
       */

      const searchableText =
        normalizeText(`

          ${p.name || ""}

          ${p.categoryLabel || ""}

          ${p.tag || ""}

          ${categories.join(" ")}

        `);


      /*
       * Pesquisa.

       */

      const matchesSearch =
        term === "" ||
        searchableText.includes(term);


      return (
        matchesCategory &&
        matchesSearch
      );

    });


  /*
   * Sempre volta para a página 1
   * quando o filtro muda.
   */

  currentPage = 1;


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
  .addEventListener(
    "click",
    (e) => {

      const chip =
        e.target.closest(".cat-chip");


      if (!chip) return;


      document
        .querySelectorAll(".cat-chip")
        .forEach(c => {

          c.classList.remove(
            "is-active"
          );

        });


      chip.classList.add(
        "is-active"
      );


      activeCategory =
        chip.dataset.filter;


      /*
       * GOOGLE ANALYTICS
       */

      analyticsEvent(
        "category_click",
        {

          category:
            chip.dataset.filter,

          category_name:
            chip.textContent.trim()

        }
      );


      applyFilters();

    }
  );


/* ============================================================
   PESQUISA
   ============================================================ */

searchInput.addEventListener(
  "input",
  applyFilters
);


/*
 * GOOGLE ANALYTICS — PESQUISA
 */

let searchTimer = null;

let lastTrackedSearch = "";


searchInput.addEventListener(
  "input",
  () => {

    clearTimeout(searchTimer);


    searchTimer =
      setTimeout(() => {

        const originalTerm =
          searchInput.value.trim();


        const term =
          normalizeText(
            originalTerm
          );


        if (term.length < 2) {
          return;
        }


        if (
          term ===
          lastTrackedSearch
        ) {

          return;

        }


        lastTrackedSearch =
          term;


        analyticsEvent(
          "search",
          {

            search_term:
              originalTerm

          }
        );


      },
      800
    );

  }
);


/* ============================================================
   SCROLL PARA PRODUTOS
   ============================================================ */

function scrollToProducts() {

  const productsSection =
    document.getElementById(
      "produtos"
    );


  if (!productsSection) {
    return;
  }


  productsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* ============================================================
   RENDERIZAÇÃO INICIAL
   ============================================================ */

currentProducts =
  PRODUCTS;


renderProducts(PRODUCTS);


/* ============================================================
   MENU MOBILE
   ============================================================ */

const menuToggle =
  document.getElementById(
    "menuToggle"
  );


const mainNav =
  document.getElementById(
    "mainNav"
  );


menuToggle.addEventListener(
  "click",
  () => {

    const isOpen =
      mainNav.classList.toggle(
        "is-open"
      );


    menuToggle.setAttribute(
      "aria-expanded",
      isOpen
    );

  }
);


mainNav
  .querySelectorAll("a")
  .forEach(link => {

    link.addEventListener(
      "click",
      () => {

        mainNav.classList.remove(
          "is-open"
        );


        menuToggle.setAttribute(
          "aria-expanded",
          "false"
        );

      }
    );

  });


/* ============================================================
   FORMULÁRIOS
   ============================================================

   Os formulários são enviados diretamente
   para o Web3Forms pelo HTML.

   NÃO usar e.preventDefault() aqui.

   ============================================================ */