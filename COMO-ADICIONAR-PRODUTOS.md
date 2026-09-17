# Como adicionar produtos

Você só precisa mexer no arquivo **products.js**. Os outros arquivos
(index.html, styles.css, script.js) não precisam ser tocados.

## Passo a passo

1. Abra `products.js`.
2. Copie um bloco de produto inteiro, por exemplo:

```js
{
  name: "Jaqueta corta-vento unissex",
  category: "moda",
  categoryLabel: "Moda",
  price: "R$ 129,90",
  oldPrice: "R$ 189,90",
  image: "https://exemplo.com/foto-do-produto.jpg",
  link: "https://loja.com/produto-real",
  tag: "Oferta"
},
```

3. Cole antes do `];` que fecha a lista.
4. Troque os valores:
   - `name` — nome do produto
   - `category` — uma destas: `moda`, `casa`, `tech`, `beleza`, `pet`, `infantil`, `esporte`, `acessorios`
   - `categoryLabel` — como o nome da categoria aparece na tela (ex: `"Moda"`)
   - `price` — preço atual, como texto
   - `oldPrice` — preço antigo riscado (opcional — apague a linha se não usar)
   - `image` — link direto da foto (precisa terminar em `.jpg`, `.png`, `.webp`, etc.)
   - `link` — o link do produto na loja de origem
   - `tag` — etiqueta tipo `"Oferta"` ou `"Novo"` (opcional — apague se não usar)
5. Salve o arquivo. Pronto — o produto já aparece no site.

Para **remover** um produto, apague o bloco `{ ... }` dele inteiro
(junto com a vírgula que vem depois do `}`).

## Onde conseguir a foto do produto

Use o link da imagem que já está na página do produto na loja de
origem (clique com o botão direito na foto → "Copiar endereço da
imagem"), ou hospede sua própria foto em algum serviço de imagens.

## Publicando o site

Estes são arquivos estáticos — você pode subir a pasta inteira em
qualquer serviço de hospedagem (Netlify, Vercel, GitHub Pages, ou o
servidor que você já usa) sem precisar de nenhuma configuração extra.
