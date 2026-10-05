/* Monta o carrossel de logos a partir de partners.js.
   Você não precisa editar nada aqui — pra adicionar/remover logo
   ou mudar a descrição, use o arquivo partners.js. */

(function () {
  const track = document.getElementById("marqueeTrack");
  if (!track || typeof PARTNERS === "undefined") return;

  function renderLogo(partner) {
    const item = document.createElement(partner.link && partner.link !== "#" ? "a" : "div");
    item.className = "marquee-item";
    if (item.tagName === "A") {
      item.href = partner.link;
      item.target = "_blank";
      item.rel = "noopener";
    }

    const img = document.createElement("img");
    img.src = partner.image;
    img.alt = partner.name;
    img.loading = "lazy";

    const name = document.createElement("span");
    name.className = "marquee-item-name";
    name.textContent = partner.name;

    item.appendChild(img);
    item.appendChild(name);

    if (partner.description) {
      const desc = document.createElement("span");
      desc.className = "marquee-item-desc";
      desc.textContent = partner.description;
      item.appendChild(desc);
    }

    return item;
  }

  // duplica a lista uma vez para o loop infinito ficar contínuo
  [...PARTNERS, ...PARTNERS].forEach((partner) => {
    track.appendChild(renderLogo(partner));
  });
})();