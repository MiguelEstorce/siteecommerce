/* ============================================================
   SEUS PRODUTOS
   Este é o ÚNICO arquivo que você precisa editar para adicionar,
   remover ou alterar produtos. Não mexe em mais nada.

   Para cada produto, preencha:
   - name          -> nome do produto
   - category      -> uma das categorias abaixo (sem acento, minúsculo):
                      moda | casa | tech | beleza | pet | infantil | esporte | acessorios
   - categoryLabel -> nome da categoria como vai aparecer na tela (ex: "Moda")
   - price         -> preço atual, como texto (ex: "R$ 129,90")
   - oldPrice      -> (opcional) preço antigo, para mostrar riscado. Apague a linha se não usar.
   - image         -> link direto da FOTO do produto (termina em .jpg, .png, .webp...)
   - link          -> link do produto na loja onde ele é vendido
   - tag           -> (opcional) uma etiqueta tipo "Oferta" ou "Novo". Apague se não usar.

   Para ADICIONAR um produto: copie um bloco { ... } inteiro,
   cole antes do "];" no final e edite os valores.

   Para REMOVER um produto: apague o bloco { ... } dele inteiro,
   junto com a vírgula depois do "}".
   ============================================================ */

const PRODUCTS = [
  {
    name: 'Mochila Tática Militar 50L',
    categories: ['acessorios', 'camping', 'esporte'],
    categoryLabel: 'Acessórios',
    price: 'R$ 98,70',
    oldPrice: 'R$ 108,89',
    image:
      'https://down-aka-br.img.susercontent.com/br-11134207-820lp-mpj3i9oxm87664.webp',
    link: 'https://s.shopee.com.br/8fSNboUmDV',
    tag: 'Oferta',
  },
  {
    name: 'Assitente de Abdominais com Cordas de Resistência',
    category: 'esporte',
    categoryLabel: 'Esportes',
    price: 'R$ 39,99',
    oldPrice: 'R$ 129,00',
    image:
      'https://down-aka-br.img.susercontent.com/br-11134207-820mc-ms9m8m3uno5ge3.webp',
    link: 'https://s.shopee.com.br/7VGQE4KRcS#',
  },
  {
    name: 'Conjunto de Camping Mesa Retangular Dobrável',
    category: 'camping',
    categoryLabel: 'Camping',
    price: 'R$ 156,75',
    oldPrice: 'R$ 164,99',
    image:
      'https://down-aka-br.img.susercontent.com/br-11134207-820l7-mpj3i9pa9c777d.webp',
    link: 'https://s.shopee.com.br/905E1H3hP1',
    tag: 'Oferta',
  },
  {
    name: 'Tapete de Banheiro Veludo Coral 60x40cm Super Absorvente',
    category: 'banheiro',
    categoryLabel: 'Banheiro',
    price: 'R$ 12,79',
    oldPrice: 'R$ 33,00',
    image:
      'https://down-aka-br.img.susercontent.com/br-11134207-820li-mr8iqiwv1xqdc4.webp',
    link: 'https://s.shopee.com.br/3qN7s3GMbl',
  },
  {
    name: 'Pano de Limpeza Fio de Prata Dupla Face',
    category: 'limp',
    categoryLabel: 'Limpeza',
    price: 'R$ 6,99',
    oldPrice: 'R$ 26,00',
    image:
      'https://down-aka-br.img.susercontent.com/br-11134207-820lu-mpj58oa8ml1d96.webp',
    link: 'https://s.shopee.com.br/1LfmtaraHV',
  },
  {
    name: 'Fatiador de Cortador de Legumes',
    categories: ['casa', 'cozinha'],
    categoryLabel: 'Cozinha',
    price: 'R$ 39,99',
    oldPrice: 'R$ 110,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lg-mpj4ttrr3qir7f.webp',
    link: 'https://s.shopee.com.br/BTpZos0qG',
  },
  {
    name: 'Suporte de Parede para Bicicleta, Gancho de Aço',
    category: 'esporte',
    categoryLabel: 'Esportes',
    price: '17,79',
    oldPrice: 'R$ 36,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820ld-mpj78fhzeakgaf.webp',
    link: 'https://s.shopee.com.br/LnFmS0xxn',
  },
  {
    name: 'Bolsa Peitoral Feminina Metelassada Multiuso',
    categories: ['moda', 'acessorios'],
    categoryLabel: 'Feminino',
    price: 'R$ 27,99',
    oldPrice: 'R$ 38,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lt-mpj4ttrt3dhdb7.webp',
    link: 'https://s.shopee.com.br/4fwEwicnLv',
    tag: 'Oferta',
  },
  {
    name: 'Conjunto 13 Pincéis de Maquiagem Cerdas Macias',
    category: 'beleza',
    categoryLabel: 'Produtos de Beleza',
    price: 'R$ 8,89',
    oldPrice: 'R$ 23,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m0-mpj6t4usasqqcd.webp',
    link: 'https://s.shopee.com.br/112waDxtRU',
    tag: 'Oferta',
  },
  {
    name: 'Organizador de Bolsas Pendente com 6 Compartimentos',
    categories: ['moda', 'acessoria'],
    categoryLabel: 'Feminino',
    price: 'R$ 17,79',
    oldPrice: '39,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lo-mpgavkddg5c11c.webp',
    link: 'https://s.shopee.com.br/5fomD9PSKT',
    tag: 'Oferta',
  },
  {
    name: 'Conjunto Toalha de Banho e Rosto',
    categories: ['banheiro', 'casa'],
    categoryLabel: 'Banheiro',
    price: 'R$ 5,89',
    oldPrice: 'R$ 22,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lo-mpj5zcwf280306.webp',
    link: 'https://s.shopee.com.br/2VrkRgogwm',
    tag: 'Oferta',
  },
  {
    name: 'Para organização de viagem',
    category: 'viagem',
    categoryLabel: 'Viagens',
    price: 'R$ 13,82',
    oldPrice: '59,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lz-mpafqied7cht51.webp',
    link: 'https://s.shopee.com.br/2BEu3GkyXw',
    tag: 'Oferta',
  },
  {
    name: 'Ganchos de Sucção Reutilizáveis, Resistentes, e muito mais',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 17,99',
    oldPrice: 'R$ 29,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m6-mpga9xw7krnl8e.webp',
    link: 'https://s.shopee.com.br/7VGQPBsiBJ',
    tag: 'Oferta',
  },
  {
    name: 'Kit Rolo de Pintura Multifuncional, 5 Peças e muito mais',
    category: 'obra',
    categoryLabel: 'Construção',
    price: 'R$ 77,99',
    oldPrice: 'R$ 106,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lb-mpj6t4ursjcz48.webp',
    link: 'https://s.shopee.com.br/4fwF2B7Ne9',
    tag: 'Oferta',
  },
  {
    name: 'Ralador de Legumes Manual com 3 Lâminas, Multifuncional, e muito mais',
    categories: ['casa', 'cozinha'],
    categoryLabel: 'Cozinha',
    price: 'R$ 69,99',
    oldPrice: 'R$ 96,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820mh-mpgbgwrny2h26d.webp',
    link: 'https://s.shopee.com.br/2BEu3qS6OP',
    tag: 'Oferta',
  },
  {
    name: 'Pulverizador Manual Universal para Garrafa Pet, e muito mais',
    categories: ['casa', 'limp'],
    categoryLabel: 'Limpeza',
    price: 'R$ 6,99',
    oldPrice: 'R$ 23,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820md-mpgbrwjat81y5f.webp',
    link: 'https://s.shopee.com.br/20vTrqPSg8',
    tag: 'Oferta',
  },
  {
    name: 'Limpador Magnético Profissional para Limpeza de Vidros, e muito mais',
    categories: ['casa', 'limp'],
    categoryLabel: 'Limpeza',
    price: 'R$ 24,99',
    oldPrice: 'R$ 66,00',
    image:
      'https://down-tx-br.img.susercontent.com/br-11134207-820lk-mpahyex8epds18.webp',
    link: 'https://s.shopee.com.br/1LfnDUH0y4',
    tag: 'Oferta',
  },
  {
    name: 'Forma de Gelo com Fundo de Silicone Desenforma Fácil, e muito mais',
    categories: ['casa', 'cozinha'],
    categoryLabel: 'Cozinha',
    price: 'R$ 7,39',
    oldPrice: 'R$ 18,00',
    image:
      'https://down-tx-br.img.susercontent.com/br-11134207-820lv-mpj6avclj7ya43.webp',
    link: 'https://s.shopee.com.br/2BEuDODHY8',
    tag: 'Oferta',
  },
  {
    name: 'Caixa Organizadora para Sapatos Transparente, e muito mais',
    categories: ['casa', 'quarto'],
    categoryLabel: 'Quarto',
    price: 'R$ 29,99',
    oldPrice: 'R$ 49,00',
    image:
      'https://down-tx-br.img.susercontent.com/br-11134207-820md-mpgavkdd94htc9.webp',
    link: 'https://s.shopee.com.br/6Al2z1zeUZ',
    tag: 'Oferta',
  },
  {
    name: 'Toalha de Mesa Retrô Europeia Impermeável, e muito mais',
    categories: ['casa', 'cozinha'],
    categoryLabel: 'Cozinha',
    price: 'R$ 30,69',
    oldPrice: 'R$ 62,00',
    image:
      'https://down-zl-br.img.susercontent.com/br-11134207-820lt-mpj5zcwese0z27.webp',
    link: 'https://s.shopee.com.br/4fwFCRNFjK',
    tag: 'Oferta',
  },
  {
    name: 'Cinta Corretora de Postura para Coluna, e muito mais',
    categories: ['moda', 'masculino', 'esporte'],
    categoryLabel: 'Masculino',
    price: 'R$ 13,89',
    oldPrice: 'R$ 39,00',
    image:
      'https://down-zl-br.img.susercontent.com/br-11134207-820l4-mpgb7mtw4h6ucc.webp',
    link: 'https://s.shopee.com.br/8ploAZHoQD',
    tag: 'Oferta',
  },
  {
    name: 'Bolsa Quadrada Feminina, e muito mais',
    categories: ['moda', 'acessorios'],
    categoryLabel: 'Feminino',
    price: 'R$ 69,00',
    oldPrice: '',
    image:
      'https://down-zl-br.img.susercontent.com/br-11134207-820m8-mpg9r9fflz418b.webp',
    link: 'https://s.shopee.com.br/1LfnFdgHMY',
    tag: 'Oferta',
  },
  {
    name: 'Kit Quarto Infantil, Lençol+Cortina 2 Partes Temas Estampados',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 57,57',
    oldPrice: 'R$ 61,90',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820mb-mpmjdc7k1c76e9.webp',
    link: 'https://s.shopee.com.br/80ChEVqrOX',
    tag: 'Oferta',
  },
  {
    name: 'Kit Jogo Capa de Almofada Premium Aveludada 45x45cm, e muito mais',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 29,90 - R$ 61,99',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lu-mn3lqhxgo8as8f.webp',
    link: 'https://s.shopee.com.br/1BMN6AgDJj',
    tag: 'Oferta',
  },
  {
    name: 'Kit Colcha Manta Casal Quenn 2,20x2,60 Aveludada, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 78,90',
    oldPrice: '',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820le-msvijeba01za69.webp',
    link: 'https://s.shopee.com.br/1BMN6Qa1fS',
    tag: 'Oferta',
  },
  {
    name: 'Kit Jogo 5 Capas de Almofadas Suede Aveludade 45x45cm, e muito mais',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 48,36',
    oldPrice: 'R$ 76,76',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820la-mseyr7akkttxda.webp',
    link: 'https://s.shopee.com.br/60RcruKD2b',
    tag: 'Oferta',
  },
  {
    name: 'Jogo Lençol Cama Queen Estampado 3 peças sem Elástico, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 38,76',
    oldPrice: 'R$ 57,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m3-mp47nmv61rlv0e.webp',
    link: 'https://s.shopee.com.br/7ptH49vPgE',
    tag: 'Oferta',
  },
  {
    name: 'Kit Colcha Cobre Leito Premium Solteiro Casal, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 57,07 - 102,92',
    oldPrice: 'R$ 82,71 - 137,22',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m5-msc1j68eb5s615.webp',
    link: 'https://s.shopee.com.br/1BMN8NMHEO',
    tag: 'Oferta',
  },
  {
    name: 'Mosqueteiro Teto Renda Filó com Elástico Cama Casal Box',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 22,39',
    oldPrice: 'R$ 24,87',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820me-mmxt1pxn3ncw4a.webp',
    link: 'https://s.shopee.com.br/1gIdjYIF0U',
    tag: 'Oferta',
  },
  {
    name: 'Jogo Lençol Com Fronha Cama Infantil Solteiro Temático 1,50m x 2,25m, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 29,91 - 39,87',
    oldPrice: 'R$ 39,87',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m0-mqgzz2nhatc1ab.webp',
    link: 'https://s.shopee.com.br/3B7RWVGYI4',
    tag: 'Oferta',
  },
  {
    name: 'Manta Casal Cobertor Microfibra Antialérgica 1,80x2,00MT, e muito mais ',
    category: 'quarto',
    categoryLabel: 'Quartp',
    price: 'R$ 39,90 - 57,00',
    oldPrice: 'R$ 57,00',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820ld-mri2zwq1p8g6b1.webp',
    link: 'https://s.shopee.com.br/5LBw737MfW',
    tag: 'Oferta',
  },
  {
    name: 'Kit 4 Capas de Almofadas Drapeadas Aveludado Luxo 43x45cm',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 41,72',
    oldPrice: 'R$ 55,62',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820me-mrkz8hvk0q2v58.webp',
    link: 'https://s.shopee.com.br/40gYWjDbnP',
    tag: 'Oferta',
  },
  {
    name: 'Tapete Antiderrapante 38x58cm, e muito mais',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 25,88',
    oldPrice: '',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lv-mn55hfkvolxg15.webp',
    link: 'https://s.shopee.com.br/8fSO6udNUa',
    tag: 'Oferta',
  },
  {
    name: 'Kit Capa Almofada Com Ziper 3 Peças 45x45cm Suede Luxo, e muito mais',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 78,81 - 79,81',
    oldPrice: '',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lh-mog6oe7jq9z4dd.webp',
    link: 'https://s.shopee.com.br/9peLV9JS1q',
    tag: 'Oferta',
  },
  {
    name: 'Cortina Infantil Estampada Microfibra 1,40M x 2,20M, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 39,90 - 53,20',
    oldPrice: 'R$ 53,20',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820l8-mqh0luh22g3k26.webp',
    link: 'https://s.shopee.com.br/6VNtX732oF',
    tag: 'Oferta',
  },
  {
    name: 'Fronha Cetim 50x70cm Toque Suave e Macia, e muito mais',
    categories: ['casa', 'quarto'],
    categoryLabel: 'Casa',
    price: 'R$ 17,85',
    oldPrice: '',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m4-mn7hmvodwcg2da.webp',
    link: 'https://s.shopee.com.br/6q0jvphUEQ',
    tag: 'Oferta',
  },
  {
    name: 'Toalha de Banho Premium 100% Algodão 75x140cm, e muito mais',
    category: 'banheiro',
    categoryLabel: 'Banheiro',
    price: 'R$ 49,87',
    oldPrice: '',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820m7-mn53bopthkp07a.webp',
    link: 'https://s.shopee.com.br/112x0RRd0y',
    tag: 'Oferta',
  },
  {
    name: 'Cortina Janela Completa Oxford lisa 8 Ilhós 1,70M x 1,45M, e muito mais',
    category: 'casa',
    categoryLabel: 'Casa',
    price: 'R$ 32,00',
    oldPrice: '',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lu-moahds1u6byb1c.webp',
    link: 'https://s.shopee.com.br/1BMNCsAhVB',
    tag: 'Oferta',
  },
  {
    name: 'Manta Conforto Lisa Cobertor Solteiro Box 1,60x2,25cm, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 44,91',
    oldPrice: 'R$ 69,08',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lv-moj0tfmnk1kw45.webp',
    link: 'https://s.shopee.com.br/8V8xwQgcsT',
    tag: 'Oferta',
  },
  {
    name: 'Kit Colcha Cobre Leito Dupla Face 1,60M x 2,40M, e muito mais',
    category: 'quarto',
    categoryLabel: 'Quarto',
    price: 'R$ 61,90 - 62,90',
    image:
      'https://down-bs-br.img.susercontent.com/br-11134207-820lu-mpnpu8r5zx8j96.webp',
    link: 'https://s.shopee.com.br/2VrknWRFHD',
    tag: 'Oferta',
  },
];
