console.log('automação BombaNet iniciada');

const fs = require('node:fs');
const crypto = require('node:crypto');
const { syncBuiltinESMExports } = require('node:module');
require('dotenv').config();

function gerarAssinatura(appId, timestamp, payload, secret) {
  const mensagem = appId + timestamp + payload + secret;
  const assinatura = crypto.createHash('sha256').update(mensagem).digest('hex');

  return assinatura;
}

function criarAuthorization(appId, timestamp, assinatura) {
  const authorization =
    'SHA256 Credential=' +
    appId +
    ', Timestamp=' +
    timestamp +
    ', Signature=' +
    assinatura;
  return authorization;
}
function gerarTimestamp() {
  const timestamp = Math.floor(Date.now() / 1000);
  return timestamp;
}

function criarPayload(pagina) {
  const query = `
    {
        productOfferV2(
            page: ${pagina}
            limit: 50
        ) {
            nodes {
                itemId
                productName
                price
                imageUrl
                offerLink
                priceDiscountRate
            }

            pageInfo {
                page
                limit
                hasNextPage
            }
        }
    }`;

  const payload = {
    query: query,
  };
  const payloadJson = JSON.stringify(payload);
  return payloadJson;
}

function lerProdutos() {
  const dados = fs.readFileSync('./produtos.json', 'utf8');
  const objeto = JSON.parse(dados);
  return objeto;
}

const appId = process.env.SHOPEE_APP_ID;
const secret = process.env.SHOPEE_SECRET;

async function fazerRequisicaoShopee(payload) {

  const timestamp = gerarTimestamp();

  const assinatura =
    gerarAssinatura(
      appId,
      timestamp,
      payload,
      secret
    );

  const authorization =
    criarAuthorization(
      appId,
      timestamp,
      assinatura
    );

  console.log('Timestamp:', timestamp);
  console.log('Assinatura:', assinatura);

  const resposta = await fetch(
    'https://open-api.affiliate.shopee.com.br/graphql',
    {
      method: 'POST',
      headers: {
        authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: payload,
    },
  );

  if (!resposta.ok) {
    throw new Error(
      `Erro HTTP da Shopee: ${resposta.status} ${resposta.statusText}`,
    );
  }

  const dados = await resposta.json();

  if (dados.errors) {
    console.error('Erro retornado pela API da Shopee:');
    console.dir(dados.errors, { depth: null });

    throw new Error('A API da Shopee retornou erros.');
  }

  if (!dados.data || !dados.data.productOfferV2) {
    throw new Error(
      'Resposta da Shopee não possui productOfferV2.'
    );
  }

  const produtos =
    dados.data.productOfferV2.nodes;

  console.log(
    'PageInfo:',
    dados.data.productOfferV2.pageInfo
  );

  const produtosTransformados =
    transformarProdutosMarketplace(produtos);

  console.log(
    `Produtos recebidos da Shopee: ${produtosTransformados.length}`,
  );

  return {
    produtos: produtosTransformados,
    hasNextPage:
      dados.data.productOfferV2.pageInfo.hasNextPage,
  };
}

async function buscarTodosProdutosShopee() {
  let pagina = 1;
  let todosProdutos = [];
  let temProximaPagina = true;

  while (temProximaPagina) {
    console.log(`\nBuscando página ${pagina}...`);

    const payloadPagina = criarPayload(pagina);

    const resultado = await fazerRequisicaoShopee(payloadPagina);

    todosProdutos.push(...resultado.produtos);

    temProximaPagina =
      resultado.hasNextPage;

    pagina++;
  }

  return todosProdutos;
}

function salvarProdutos(objeto) {
  const novoJson = JSON.stringify(objeto, null, 4);
  fs.writeFileSync('./produtos.json', novoJson);
}
function sincronizarProdutos(objeto, produtosMarketplace) {
  console.log('\n====================================');
  console.log('INICIANDO SINCRONIZAÇÃO');
  console.log('====================================\n');

  let atualizados = 0;
  let adicionados = 0;
  let removidos = 0;
  let semAlteracao = 0;

  // ====================================
  // ATUALIZAR E REMOVER PRODUTOS
  // ====================================

  for (let i = objeto.length - 1; i >= 0; i--) {
    const produtoAtual = objeto[i];

    const produtoMarketplace = produtosMarketplace.find(
      (produto) =>
        String(produto.idmarketplace) ===
        String(produtoAtual.idmarketplace)
    );

    // Produto não veio mais da Shopee
    if (!produtoMarketplace) {
      console.log(
        'Removendo produto:',
        produtoAtual.nome
      );

      objeto.splice(i, 1);
      removidos++;

      continue;
    }

    let alterou = false;

    // Nome
    if (produtoAtual.nome !== produtoMarketplace.nome) {
      produtoAtual.nome = produtoMarketplace.nome;
      alterou = true;
    }

    // Imagem
    if (produtoAtual.imagem !== produtoMarketplace.imagem) {
      produtoAtual.imagem = produtoMarketplace.imagem;
      alterou = true;
    }

    // Link
    if (produtoAtual.link !== produtoMarketplace.link) {
      produtoAtual.link = produtoMarketplace.link;
      alterou = true;
    }

    // Preço com desconto
    if (
      produtoAtual.precoComDesconto !==
      produtoMarketplace.precoComDesconto
    ) {
      produtoAtual.precoComDesconto =
        produtoMarketplace.precoComDesconto;

      alterou = true;
    }

    // Preço sem desconto
    if (
      produtoAtual.precoSemDesconto !==
      produtoMarketplace.precoSemDesconto
    ) {
      produtoAtual.precoSemDesconto =
        produtoMarketplace.precoSemDesconto;

      alterou = true;
    }

    // Desconto
    if (
      produtoAtual.desconto !==
      produtoMarketplace.desconto
    ) {
      produtoAtual.desconto =
        produtoMarketplace.desconto;

      alterou = true;
    }

    // Categorias
    if (
      JSON.stringify(produtoAtual.categorias) !==
      JSON.stringify(produtoMarketplace.categorias)
    ) {
      produtoAtual.categorias =
        produtoMarketplace.categorias;

      alterou = true;
    }

    // Verifica se houve alguma alteração
    if (alterou) {
      console.log(
        'Produto atualizado:',
        produtoAtual.nome
      );

      atualizados++;
    } else {
      semAlteracao++;
    }
  }

  // ====================================
  // ADICIONAR PRODUTOS NOVOS
  // ====================================

  for (let i = 0; i < produtosMarketplace.length; i++) {
    const produtoMarketplace =
      produtosMarketplace[i];

    const produtoExistente = objeto.find(
      (produto) =>
        String(produto.idmarketplace) ===
        String(produtoMarketplace.idmarketplace)
    );

    // Produto ainda não existe no JSON
    if (!produtoExistente) {
      const novoProduto = {
        idmarketplace:
          produtoMarketplace.idmarketplace,

        nome:
          produtoMarketplace.nome,

        imagem:
          produtoMarketplace.imagem,

        precoComDesconto:
          produtoMarketplace.precoComDesconto,

        precoSemDesconto:
          produtoMarketplace.precoSemDesconto,

        link:
          produtoMarketplace.link,

        desconto:
          produtoMarketplace.desconto,

        categorias:
          produtoMarketplace.categorias
      };

      objeto.push(novoProduto);

      console.log(
        'Novo produto:',
        novoProduto.nome
      );

      adicionados++;
    }
  }

  // ====================================
  // RESULTADO
  // ====================================

  console.log('\n====================================');
  console.log('SINCRONIZAÇÃO FINALIZADA');
  console.log('====================================');

  console.log('Atualizados:', atualizados);
  console.log('Adicionados:', adicionados);
  console.log('Removidos:', removidos);
  console.log('Sem alteração:', semAlteracao);

  console.log('====================================\n');
}


function normalizar(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const cacheTermos = new Map();
function criarTexto(titulo) {
  const base = ' ' + normalizar(titulo) + ' ';
  return {
    includes(termo) {
      let t = cacheTermos.get(termo);
      if (t === undefined) {
        t = ' ' + normalizar(termo) + ' ';
        cacheTermos.set(termo, t);
      }
      return base.includes(t);
    },
  };
}

function classificarCategorias(nomeProduto) {
  const nome = criarTexto(nomeProduto);
  const categorias = [];

  // Eletrônicos
  if (nome.includes('carregador') || nome.includes('power bank')) {
    categorias.push('tech');
    categorias.push('acessorios-eletronicos');
  }
  // Categoria geral feminina
  if (
    nome.includes('feminino') ||
    nome.includes('feminina') ||
    nome.includes('mulher')
  ) {
    categorias.push('feminino');
  }
  // Categoria geral masculina
  if (
    nome.includes('masculino') ||
    nome.includes('masculina') ||
    nome.includes('homem')
  ) {
    categorias.push('masculino');
  }
  // Roupas femininas
  if (
    nome.includes('vestido') ||
    nome.includes('shorts feminino') ||
    nome.includes('short feminino') ||
    nome.includes('bermuda feminina') ||
    nome.includes('kit bermudas femininas') ||
    nome.includes('kit shorts feminino') ||
    nome.includes('calca feminina') ||
    nome.includes('camisetas femininas') ||
    nome.includes('camiseta feminina') ||
    nome.includes('kit camisetas femininas') ||
    nome.includes('camisa feminina') ||
    nome.includes('camisas feminina') ||
    nome.includes('camisas femininas') ||
    nome.includes('kit camisas femininas') ||
    nome.includes('kit calca feminina') ||
    nome.includes('meia feminina') ||
    nome.includes('meias femininas') ||
    nome.includes('kit meias femininas') ||
    nome.includes('kit calcinhas femininas') ||
    nome.includes('calcinha feminina') ||
    nome.includes('blusa feminina') ||
    nome.includes('blusas femininas') ||
    nome.includes('kit blusas feminina')
  ) {
    categorias.push('roupas-feminino');
    categorias.push('feminino');
  }
  // Roupas masculinas
  if (
    nome.includes('shorts masculino') ||
    nome.includes('short masculino') ||
    nome.includes('bermuda masculina') ||
    nome.includes('kit bermudas masculina') ||
    nome.includes('kit shorts masculino') ||
    nome.includes('calca masculina') ||
    nome.includes('camisetas masculinas') ||
    nome.includes('camiseta masculina') ||
    nome.includes('kit camisetas masculinas') ||
    nome.includes('camisa masculina') ||
    nome.includes('camisas masculinas') ||
    nome.includes('kit camisas masculinas') ||
    nome.includes('kit calca masculinas') ||
    nome.includes('meia masculina') ||
    nome.includes('meias masculinas') ||
    nome.includes('kit meias masculinas') ||
    nome.includes('kit cuecas masculinas') ||
    nome.includes('kit cuecas boxer masculino') ||
    nome.includes('kit cuecas boxer') ||
    nome.includes('cuecas boxer masculinas') ||
    nome.includes('cueca boxer masculina') ||
    nome.includes('cueca boxer') ||
    nome.includes('cueca') ||
    nome.includes('blusa masculina') ||
    nome.includes('blusas masculinas') ||
    nome.includes('kit blusas masculina')
  ) {
    categorias.push('roupas-masculino');
    categorias.push('masculino');
  }
  // Perfumes masculinos
  if (
    nome.includes('perfumes masculino') ||
    nome.includes('colonia masculina') ||
    nome.includes('kit colonia masculina') ||
    nome.includes('kit perfumes masculino') ||
    nome.includes('perfume masculino')
  ) {
    categorias.push('perfume-masculino');
  }
  // Perfumes femininos
  if (
    nome.includes('perfumes feminino') ||
    nome.includes('colonia feminina') ||
    nome.includes('kit colonia feminina') ||
    nome.includes('kit perfumes feminino') ||
    nome.includes('perfume feminino')
  ) {
    categorias.push('perfume-feminino');
  }
  // Calçados femininos
  if (
    nome.includes('tenis feminino') ||
    nome.includes('tenis unissex') ||
    nome.includes('tenis de corrida') ||
    nome.includes('chinelo feminino') ||
    nome.includes('chinelo unissex') ||
    nome.includes('crocs unissex') ||
    nome.includes('crocs feminino') ||
    nome.includes('sandalia unissex') ||
    nome.includes('sandalia feminina')
  ) {
    categorias.push('calcados-feminino');
    categorias.push('feminino');
  }
  // Calçados masculinos
  if (
    nome.includes('tenis masculino') ||
    nome.includes('tenis unissex') ||
    nome.includes('tenis de corrida') ||
    nome.includes('chinelo unissex') ||
    nome.includes('chinelo masculino') ||
    nome.includes('crocs masculino') ||
    nome.includes('crocs unissex') ||
    nome.includes('sandalia masculino') ||
    nome.includes('sandalia unissex')
  ) {
    categorias.push('calcados-masculino');
    categorias.push('masculino');
  }
  // Calçados unissex
  if (
    nome.includes('tenis unissex') ||
    nome.includes('tenis de corrida') ||
    nome.includes('chinelo unissex') ||
    nome.includes('crocs unissex') ||
    nome.includes('sandalia unissex')
  ) {
    categorias.push('unissex');
    categorias.push('calcados-masculino');
    categorias.push('calcados-feminino');
  }
  // Bolsas femininas
  if (
    nome.includes('bolsa feminina') ||
    nome.includes('kit bolsas femininas')
  ) {
    categorias.push('bolsas-feminino');
  }
  // Bolsas masculinas
  if (
    nome.includes('bolsa masculina') ||
    nome.includes('kit bolsas masculinas')
  ) {
    categorias.push('bolsas-masculino');
  }
  // Beleza
  if (
    nome.includes('maquiagem') ||
    nome.includes('primer') ||
    nome.includes('base maquiagem') ||
    nome.includes('corretivo') ||
    nome.includes('po facial') ||
    nome.includes('blush') ||
    nome.includes('contorno') ||
    nome.includes('iluminador') ||
    nome.includes('mascara de cilios') ||
    nome.includes('rimel') ||
    nome.includes('delineador') ||
    nome.includes('lapis de olho') ||
    nome.includes('sombra') ||
    nome.includes('sobrancelha') ||
    nome.includes('sobrancelhas') ||
    nome.includes('batom') ||
    nome.includes('gloss') ||
    nome.includes('lip tint') ||
    nome.includes('pinceis') ||
    nome.includes('demaquilante') ||
    nome.includes('kit maquiagem')
  ) {
    categorias.push('beleza');
  }
  // Categoria geral infantil
  if (
    nome.includes('infantil') ||
    nome.includes('infantil') ||
    nome.includes('crianca') ||
    nome.includes('criança') ||
    nome.includes('menino') ||
    nome.includes('menina') ||
    nome.includes('kids') ||
    nome.includes('kid')
  ) {
    categorias.push('infantil');
  }

  // Roupas infantis
  if (
    nome.includes('roupa infantil') ||
    nome.includes('roupas infantil') ||
    nome.includes('vestido infantil') ||
    nome.includes('short infantil') ||
    nome.includes('shorts infantil') ||
    nome.includes('bermuda infantil') ||
    nome.includes('calca infantil') ||
    nome.includes('calça infantil') ||
    nome.includes('camisa infantil') ||
    nome.includes('camiseta infantil') ||
    nome.includes('blusa infantil') ||
    nome.includes('conjunto infantil') ||
    nome.includes('conjuntinho infantil') ||
    nome.includes('body infantil') ||
    nome.includes('macacao infantil') ||
    nome.includes('macacão infantil') ||
    nome.includes('pijama infantil') ||
    nome.includes('meia infantil') ||
    nome.includes('cueca infantil') ||
    nome.includes('calcinha infantil')
  ) {
    categorias.push('roupas-infantil');
    categorias.push('infantil');
  }
  // Calçados infantis
  if (
    nome.includes('tenis infantil') ||
    nome.includes('tênis infantil') ||
    nome.includes('chinelo infantil') ||
    nome.includes('sandalia infantil') ||
    nome.includes('sandália infantil') ||
    nome.includes('sapato infantil') ||
    nome.includes('sapatinho infantil') ||
    nome.includes('bota infantil') ||
    nome.includes('botinha infantil') ||
    nome.includes('crocs infantil')
  ) {
    categorias.push('calcados-infantil');
    categorias.push('infantil');
  }
  // Acessórios infantis
  if (
    nome.includes('mochila infantil') ||
    nome.includes('bolsa infantil') ||
    nome.includes('carteira infantil') ||
    nome.includes('bone infantil') ||
    nome.includes('boné infantil') ||
    nome.includes('oculos infantil') ||
    nome.includes('óculos infantil') ||
    nome.includes('relogio infantil') ||
    nome.includes('relógio infantil') ||
    nome.includes('chapeu infantil') ||
    nome.includes('chapéu infantil') ||
    nome.includes('acessorio infantil') ||
    nome.includes('acessórios infantil')
  ) {
    categorias.push('acessorios-infantil');
    categorias.push('infantil');
  }
  // Brinquedos infantis
  if (
    nome.includes('brinquedo') ||
    nome.includes('brinquedos') ||
    nome.includes('boneca') ||
    nome.includes('boneco') ||
    nome.includes('carrinho infantil') ||
    nome.includes('jogo infantil') ||
    nome.includes('jogos infantil') ||
    nome.includes('pelucia') ||
    nome.includes('pelúcia') ||
    nome.includes('lego') ||
    nome.includes('quebra-cabeca infantil') ||
    nome.includes('quebra-cabeça infantil') ||
    nome.includes('kit brinquedo')
  ) {
    categorias.push('brinquedos');
    categorias.push('infantil');
  }
  // Cozinha
  if (
    nome.includes('panela') ||
    nome.includes('panela de pressao') ||
    nome.includes('panela eletrica') ||
    nome.includes('panela de arroz') ||
    nome.includes('arrozeira') ||
    nome.includes('cacarola') ||
    nome.includes('wok') ||
    nome.includes('leiteira') ||
    nome.includes('frigideira') ||
    nome.includes('assadeira') ||
    nome.includes('forma para bolo') ||
    nome.includes('forma de bolo') ||
    nome.includes('formas de bolo') ||
    nome.includes('forma para pudim') ||
    nome.includes('forma de pudim') ||
    nome.includes('formas de pudim') ||
    nome.includes('forma de pizza') ||
    nome.includes('forma de gelo') ||
    nome.includes('forma de empada') ||
    nome.includes('forma de muffin') ||
    nome.includes('forma de cupcake') ||
    nome.includes('forma de pao') ||
    nome.includes('forma de silicone') ||
    nome.includes('forma de assar') ||
    nome.includes('travessa') ||
    nome.includes('refratario') ||
    nome.includes('marmita') ||
    nome.includes('marmiteira') ||
    nome.includes('bandeja') ||
    nome.includes('jogo de panelas') ||
    nome.includes('banho maria') ||
    nome.includes('vaporeira') ||
    nome.includes('cuscuzeira') ||
    nome.includes('pipoqueira') ||
    nome.includes('fondue') ||
    nome.includes('churrasqueira') ||
    nome.includes('espeto') ||
    nome.includes('grelha') ||
    // Utensilios
    nome.includes('espatula') ||
    nome.includes('colher') ||
    nome.includes('colher de cozinha') ||
    nome.includes('colher de pau') ||
    nome.includes('concha') ||
    nome.includes('escumadeira') ||
    nome.includes('pegador') ||
    nome.includes('pinca') ||
    nome.includes('garfo') ||
    nome.includes('faca') ||
    nome.includes('jogo de facas') ||
    nome.includes('cutelo') ||
    nome.includes('amolador de facas') ||
    nome.includes('afiador de facas') ||
    nome.includes('tesoura de cozinha') ||
    nome.includes('abridor de lata') ||
    nome.includes('abridor de garrafa') ||
    nome.includes('abridor') ||
    nome.includes('saca rolha') ||
    nome.includes('saca-rolha') ||
    nome.includes('ralador') ||
    nome.includes('descascador') ||
    nome.includes('cortador de legumes') ||
    nome.includes('cortador') ||
    nome.includes('fatiador') ||
    nome.includes('mandoline') ||
    nome.includes('peneira') ||
    nome.includes('funil') ||
    nome.includes('batedor') ||
    nome.includes('fouet') ||
    nome.includes('rolo de massa') ||
    nome.includes('socador') ||
    nome.includes('amassador') ||
    nome.includes('martelo de carne') ||
    nome.includes('boleador') ||
    nome.includes('espremedor') ||
    nome.includes('espremedor de frutas') ||
    nome.includes('espremedor de alho') ||
    nome.includes('amassador de alho') ||
    nome.includes('medidor') ||
    nome.includes('copo medidor') ||
    nome.includes('colher medidora') ||
    nome.includes('cortador de pizza') ||
    nome.includes('cortador de biscoito') ||
    nome.includes('saco de confeiteiro') ||
    nome.includes('bico de confeiteiro') ||
    nome.includes('pincel de cozinha') ||
    nome.includes('termometro de cozinha') ||
    nome.includes('timer de cozinha') ||
    nome.includes('balanca de cozinha') ||
    // Escorredores e tabuas
    nome.includes('escorredor') ||
    nome.includes('escorredor de louca') ||
    nome.includes('escorredor de macarrao') ||
    nome.includes('escorredor de massa') ||
    nome.includes('escorredor de arroz') ||
    nome.includes('tabua de corte') ||
    nome.includes('tabua de carne') ||
    nome.includes('tabua de frios') ||
    nome.includes('tabua') ||
    // Potes e organizacao
    nome.includes('pote') ||
    nome.includes('pote de mantimento') ||
    nome.includes('potes de mantimentos') ||
    nome.includes('pote hermetico') ||
    nome.includes('porta tempero') ||
    nome.includes('porta-tempero') ||
    nome.includes('porta condimentos') ||
    nome.includes('porta frios') ||
    nome.includes('porta mantimentos') ||
    nome.includes('porta pao') ||
    nome.includes('porta ovos') ||
    nome.includes('porta sabao') ||
    nome.includes('saleiro') ||
    nome.includes('acucareiro') ||
    nome.includes('galheteiro') ||
    nome.includes('azeiteiro') ||
    nome.includes('manteigueira') ||
    nome.includes('queijeira') ||
    nome.includes('fruteira') ||
    nome.includes('paliteiro') ||
    nome.includes('organizador de cozinha') ||
    nome.includes('organizador de pia') ||
    nome.includes('organizador de geladeira') ||
    nome.includes('lixeira de pia') ||
    nome.includes('dispenser de detergente') ||
    nome.includes('porta detergente') ||
    nome.includes('porta esponja') ||
    nome.includes('suporte para esponja') ||
    nome.includes('escorredor de talheres') ||
    nome.includes('porta talheres') ||
    nome.includes('porta copos') ||
    nome.includes('suporte de copos') ||
    nome.includes('armador de copos') ||
    nome.includes('secador de louca') ||
    nome.includes('garrafa termica') ||
    nome.includes('garrafa') ||
    nome.includes('squeeze') ||
    nome.includes('porta bolo') ||
    nome.includes('cloche') ||
    nome.includes('prateleira de cozinha') ||
    nome.includes('suporte para panelas') ||
    nome.includes('suporte de papel toalha') ||
    nome.includes('porta papel toalha') ||
    nome.includes('porta rolo de cozinha') ||
    // Eletroportateis e eletrodomesticos
    nome.includes('cafeteira') ||
    nome.includes('chaleira') ||
    nome.includes('chaleira eletrica') ||
    nome.includes('liquidificador') ||
    nome.includes('batedeira') ||
    nome.includes('air fryer') ||
    nome.includes('airfryer') ||
    nome.includes('fritadeira') ||
    nome.includes('forno eletrico') ||
    nome.includes('forno') ||
    nome.includes('sanduicheira') ||
    nome.includes('grill') ||
    nome.includes('torradeira') ||
    nome.includes('mixer') ||
    nome.includes('mini processador') ||
    nome.includes('processador de alimentos') ||
    nome.includes('multiprocessador') ||
    nome.includes('moedor') ||
    nome.includes('moedor de cafe') ||
    nome.includes('centrifuga') ||
    nome.includes('espremedor eletrico') ||
    nome.includes('fogao') ||
    nome.includes('cooktop') ||
    nome.includes('micro-ondas') ||
    nome.includes('microondas') ||
    nome.includes('geladeira') ||
    nome.includes('refrigerador') ||
    nome.includes('freezer') ||
    nome.includes('adega') ||
    nome.includes('purificador') ||
    nome.includes('filtro de agua') ||
    nome.includes('bebedouro') ||
    nome.includes('lava loucas') ||
    nome.includes('coifa') ||
    nome.includes('depurador') ||
    nome.includes('exaustor') ||
    nome.includes('panela de pressao eletrica') ||
    nome.includes('multicooker') ||
    nome.includes('iogurteira') ||
    nome.includes('maquina de pao') ||
    nome.includes('maquina de waffle') ||
    nome.includes('waffleira') ||
    nome.includes('crepeira') ||
    nome.includes('omeleteira') ||
    nome.includes('pipoqueira eletrica') ||
    nome.includes('espremedor de laranja') ||
    nome.includes('cafeteira italiana') ||
    nome.includes('prensa francesa') ||
    nome.includes('french press') ||
    nome.includes('coador de cafe') ||
    nome.includes('coador') ||
    nome.includes('filtro de cafe') ||
    nome.includes('porta filtro') ||
    nome.includes('sorveteira') ||
    nome.includes('balanca digital') ||
    // Loucas, copos e talheres
    nome.includes('faqueiro') ||
    nome.includes('talheres') ||
    nome.includes('prato') ||
    nome.includes('prato fundo') ||
    nome.includes('prato raso') ||
    nome.includes('prato de sobremesa') ||
    nome.includes('copo') ||
    nome.includes('taca') ||
    nome.includes('xicara') ||
    nome.includes('caneca') ||
    nome.includes('pires') ||
    nome.includes('tigela') ||
    nome.includes('bowl') ||
    nome.includes('cumbuca') ||
    nome.includes('saladeira') ||
    nome.includes('petisqueira') ||
    nome.includes('vasilha') ||
    nome.includes('jarra') ||
    nome.includes('jarra de suco') ||
    nome.includes('bule') ||
    nome.includes('sopeira') ||
    nome.includes('molheira') ||
    nome.includes('terrina') ||
    nome.includes('compoteira') ||
    nome.includes('bomboniere') ||
    nome.includes('farinheira') ||
    nome.includes('leiteira de mesa') ||
    nome.includes('cha') ||
    nome.includes('jogo de cha') ||
    nome.includes('jogo de cafe') ||
    nome.includes('jogo de jantar') ||
    nome.includes('aparelho de jantar') ||
    nome.includes('jogo de pratos') ||
    nome.includes('jogo de copos') ||
    nome.includes('jogo de xicaras') ||
    nome.includes('jogo de talheres') ||
    nome.includes('jogo de tacas') ||
    nome.includes('jogo de tigelas') ||
    nome.includes('jogo de sobremesa') ||
    nome.includes('jogo de bowls') ||
    nome.includes('sousplat') ||
    nome.includes('descanso de panela') ||
    nome.includes('descanso de talher') ||
    nome.includes('descanso de copo') ||
    nome.includes('porta copo') ||
    nome.includes('toalha de mesa') ||
    nome.includes('guardanapo') ||
    nome.includes('porta guardanapo') ||
    nome.includes('jogo americano') ||
    nome.includes('caminho de mesa') ||
    nome.includes('capa de mesa') ||
    nome.includes('centro de mesa') ||
    nome.includes('champanheira') ||
    nome.includes('balde de gelo') ||
    nome.includes('coqueteleira') ||
    nome.includes('decantador') ||
    nome.includes('taca de vinho') ||
    nome.includes('taca de champagne') ||
    nome.includes('copo americano') ||
    nome.includes('copo long drink') ||
    nome.includes('copo de requeijao') ||
    nome.includes('caneca de porcelana') ||
    nome.includes('caneca termica') ||
    // Texteis e protecao
    nome.includes('pano de prato') ||
    nome.includes('pano de copa') ||
    nome.includes('luva termica') ||
    nome.includes('luva de cozinha') ||
    nome.includes('pegador de panela') ||
    nome.includes('avental') ||
    nome.includes('touca de cozinha') ||
    nome.includes('manopla') ||
    nome.includes('toalha de cozinha') ||
    nome.includes('jogo de panos de prato') ||
    // Limpeza de cozinha
    nome.includes('esponja') ||
    nome.includes('esponja de cozinha') ||
    nome.includes('bucha') ||
    nome.includes('bucha de cozinha') ||
    nome.includes('escova de louca') ||
    nome.includes('escovinha de garrafa') ||
    nome.includes('rodo de pia')
  ) {
    categorias.push('cozinha');
    categorias.push('casa');
  }
  // Quarto
  if (
    nome.includes('quarto') ||
    nome.includes('cama') ||
    nome.includes('cabeceira') ||
    nome.includes('colchão') ||
    nome.includes('colchao') ||
    nome.includes('travesseiro') ||
    nome.includes('fronha') ||
    nome.includes('lençol') ||
    nome.includes('lencol') ||
    nome.includes('jogo de cama') ||
    nome.includes('cobre leito') ||
    nome.includes('cobre-leito') ||
    nome.includes('edredom') ||
    nome.includes('cobertor') ||
    nome.includes('manta') ||
    nome.includes('colcha') ||
    nome.includes('protetor de colchão') ||
    nome.includes('protetor de colchao') ||
    nome.includes('protetor de travesseiro') ||
    nome.includes('mosquiteiro') ||
    nome.includes('criado mudo') ||
    nome.includes('criado-mudo') ||
    nome.includes('mesa de cabeceira') ||
    nome.includes('guarda roupa') ||
    nome.includes('guarda-roupa') ||
    nome.includes('roupeiro') ||
    nome.includes('cabide') ||
    nome.includes('cabides') ||
    nome.includes('organizador de roupas') ||
    nome.includes('sapateira') ||
    nome.includes('penteadeira') ||
    nome.includes('espelho de quarto') ||
    nome.includes('abajur') ||
    nome.includes('luminária de cabeceira') ||
    nome.includes('luminaria de cabeceira')
  ) {
    categorias.push('quarto');
    categorias.push('casa');
  }
  // Sala
  if (
    nome.includes('sala') ||
    nome.includes('sofá') ||
    nome.includes('sofa') ||
    nome.includes('poltrona') ||
    nome.includes('puff') ||
    nome.includes('pufe') ||
    nome.includes('mesa de centro') ||
    nome.includes('mesa lateral') ||
    nome.includes('rack') ||
    nome.includes('painel para tv') ||
    nome.includes('painel de tv') ||
    nome.includes('estante') ||
    nome.includes('aparador') ||
    nome.includes('móvel para sala') ||
    nome.includes('movel para sala') ||
    nome.includes('almofada') ||
    nome.includes('almofadas') ||
    nome.includes('capa de almofada') ||
    nome.includes('manta para sofá') ||
    nome.includes('manta para sofa') ||
    nome.includes('cortina') ||
    nome.includes('persiana') ||
    nome.includes('tapete') ||
    nome.includes('tapete para sala') ||
    nome.includes('luminária de chão') ||
    nome.includes('luminaria de chão') ||
    nome.includes('abajur') ||
    nome.includes('vaso decorativo')
  ) {
    categorias.push('sala');
    categorias.push('casa');
  }
  // Banheiro
  if (
    nome.includes('banheiro') ||
    nome.includes('chuveiro') ||
    nome.includes('ducha') ||
    nome.includes('torneira') ||
    nome.includes('ralo') ||
    nome.includes('assento sanitário') ||
    nome.includes('assento sanitario') ||
    nome.includes('tampa de vaso') ||
    nome.includes('vaso sanitário') ||
    nome.includes('vaso sanitario') ||
    nome.includes('porta papel higiênico') ||
    nome.includes('porta papel higienico') ||
    nome.includes('porta toalha') ||
    nome.includes('toalheiro') ||
    nome.includes('toalha de banho') ||
    nome.includes('toalha de rosto') ||
    nome.includes('tapete de banheiro') ||
    nome.includes('cortina de banheiro') ||
    nome.includes('cortina para banheiro') ||
    nome.includes('dispenser de sabonete') ||
    nome.includes('saboneteira') ||
    nome.includes('porta escova de dentes') ||
    nome.includes('porta escova') ||
    nome.includes('escova de vaso') ||
    nome.includes('lixeira de banheiro') ||
    nome.includes('organizador de banheiro') ||
    nome.includes('kit banheiro') ||
    nome.includes('espelho de banheiro')
  ) {
    categorias.push('banheiro');
    categorias.push('casa');
  }
  // Limpeza
  if (
    nome.includes('limpeza') ||
    nome.includes('limpador') ||
    nome.includes('desinfetante') ||
    nome.includes('detergente') ||
    nome.includes('sabão') ||
    nome.includes('sabao') ||
    nome.includes('sabão em pó') ||
    nome.includes('sabao em po') ||
    nome.includes('amaciante') ||
    nome.includes('água sanitária') ||
    nome.includes('agua sanitaria') ||
    nome.includes('multiuso') ||
    nome.includes('limpa vidro') ||
    nome.includes('limpa-vidro') ||
    nome.includes('esponja') ||
    nome.includes('esponjas') ||
    nome.includes('palha de aço') ||
    nome.includes('palha de aco') ||
    nome.includes('vassoura') ||
    nome.includes('rodo') ||
    nome.includes('mop') ||
    nome.includes('balde') ||
    nome.includes('pá de lixo') ||
    nome.includes('pa de lixo') ||
    nome.includes('escova de limpeza') ||
    nome.includes('escova para limpeza') ||
    nome.includes('flanela') ||
    nome.includes('pano de limpeza') ||
    nome.includes('pano multiuso') ||
    nome.includes('pano de chão') ||
    nome.includes('pano de chao') ||
    nome.includes('luva de limpeza') ||
    nome.includes('saco de lixo') ||
    nome.includes('sacos de lixo') ||
    nome.includes('lixeira')
  ) {
    categorias.push('limp');
    categorias.push('casa');
  }
  // Acessórios para casa
  if (
    nome.includes('acessorio para casa') ||
    nome.includes('acessório para casa') ||
    nome.includes('acessorio doméstico') ||
    nome.includes('acessório doméstico') ||
    nome.includes('acessorio domestico') ||
    nome.includes('utilidades domésticas') ||
    nome.includes('utilidades domesticas') ||
    nome.includes('utilidades para casa') ||
    nome.includes('produto para casa') ||
    nome.includes('item para casa') ||
    nome.includes('itens para casa')
  ) {
    categorias.push('acessorio-casa');
    categorias.push('casa');
  }
  // Organização
  if (
    nome.includes('organizador') ||
    nome.includes('organizadores') ||
    nome.includes('organização') ||
    nome.includes('organizacao') ||
    nome.includes('caixa organizadora') ||
    nome.includes('caixas organizadoras') ||
    nome.includes('cesto organizador') ||
    nome.includes('cestos organizadores') ||
    nome.includes('gaveteiro') ||
    nome.includes('colmeia organizadora') ||
    nome.includes('divisória de gaveta') ||
    nome.includes('divisoria de gaveta') ||
    nome.includes('organizador de gaveta') ||
    nome.includes('organizador de armário') ||
    nome.includes('organizador de armario') ||
    nome.includes('organizador de cozinha') ||
    nome.includes('organizador de banheiro') ||
    nome.includes('organizador de maquiagem') ||
    nome.includes('organizador de sapatos') ||
    nome.includes('organizador de roupas') ||
    nome.includes('porta objetos') ||
    nome.includes('porta-objetos') ||
    nome.includes('caixa multiuso') ||
    nome.includes('cesto multiuso')
  ) {
    categorias.push('organizacao');
    categorias.push('casa');
  }
  // Decoração
  if (
    nome.includes('decoração') ||
    nome.includes('decoracao') ||
    nome.includes('decorativo') ||
    nome.includes('decorativa') ||
    nome.includes('decoração de parede') ||
    nome.includes('decoracao de parede') ||
    nome.includes('quadro decoracao') ||
    nome.includes('quadros decoracoes') ||
    nome.includes('espelho decorativo') ||
    nome.includes('relógio de parede') ||
    nome.includes('relogio de parede') ||
    nome.includes('vaso decorativo') ||
    nome.includes('vaso de decoração') ||
    nome.includes('vaso de decoracao') ||
    nome.includes('estátua') ||
    nome.includes('estatua') ||
    nome.includes('escultura') ||
    nome.includes('enfeite') ||
    nome.includes('enfeites') ||
    nome.includes('ornamento') ||
    nome.includes('espelho') ||
    nome.includes('espelhos') ||
    nome.includes('porta-retrato') ||
    nome.includes('porta retrato') ||
    nome.includes('vela decorativa') ||
    nome.includes('velas decorativas') ||
    nome.includes('difusor de ambiente') ||
    nome.includes('aromatizador de ambiente') ||
    nome.includes('aromatizador') ||
    nome.includes('fita de led') ||
    nome.includes('luz decorativa') ||
    nome.includes('luzes decorativas') ||
    nome.includes('luminária decorativa') ||
    nome.includes('luminaria decorativa') ||
    nome.includes('adesivo de parede') ||
    nome.includes('papel de parede') ||
    nome.includes('almofada decorativa') ||
    nome.includes('capa de almofada decorativa')
  ) {
    categorias.push('decoracao');
    categorias.push('casa');
  }
  // Ferramentas
  if (
    nome.includes('ferramenta') ||
    nome.includes('ferramentas') ||
    nome.includes('kit ferramentas') ||
    nome.includes('jogo de ferramentas') ||
    nome.includes('chave de fenda') ||
    nome.includes('chave phillips') ||
    nome.includes('chave philips') ||
    nome.includes('chave de boca') ||
    nome.includes('chave combinada') ||
    nome.includes('chave inglesa') ||
    nome.includes('chave allen') ||
    nome.includes('chave estrela') ||
    nome.includes('chave catraca') ||
    nome.includes('catraca') ||
    nome.includes('soquete') ||
    nome.includes('jogo de soquetes') ||
    nome.includes('alicate') ||
    nome.includes('alicate universal') ||
    nome.includes('alicate de corte') ||
    nome.includes('alicate de bico') ||
    nome.includes('alicate amperimetro') ||
    nome.includes('alicate amperímetro') ||
    nome.includes('martelo') ||
    nome.includes('marreta') ||
    nome.includes('malho') ||
    nome.includes('serrote') ||
    nome.includes('arco de serra') ||
    nome.includes('serra manual') ||
    nome.includes('serra circular') ||
    nome.includes('serra tico tico') ||
    nome.includes('serra sabre') ||
    nome.includes('furadeira') ||
    nome.includes('parafusadeira') ||
    nome.includes('furadeira de impacto') ||
    nome.includes('martelete') ||
    nome.includes('esmerilhadeira') ||
    nome.includes('retifica') ||
    nome.includes('retífica') ||
    nome.includes('lixadeira') ||
    nome.includes('plaina eletrica') ||
    nome.includes('plaina elétrica') ||
    nome.includes('tupia') ||
    nome.includes('politriz') ||
    nome.includes('grampeador') ||
    nome.includes('grampeador de pressão') ||
    nome.includes('grampeador pneumático') ||
    nome.includes('pistola de cola quente') ||
    nome.includes('cola quente') ||
    nome.includes('estilete') ||
    nome.includes('tesoura') ||
    nome.includes('trena') ||
    nome.includes('trena a laser') ||
    nome.includes('nivel') ||
    nome.includes('nivel a laser') ||
    nome.includes('nível a laser') ||
    nome.includes('esquadro') ||
    nome.includes('prumo') ||
    nome.includes('pa') ||
    nome.includes('enxada') ||
    nome.includes('enxadão') ||
    nome.includes('ancinho') ||
    nome.includes('foice') ||
    nome.includes('cavadeira') ||
    nome.includes('picareta') ||
    nome.includes('serrote') ||
    nome.includes('torquimetro') ||
    nome.includes('torquímetro') ||
    nome.includes('morsa') ||
    nome.includes('bancada de trabalho') ||
    nome.includes('caixa de ferramentas') ||
    nome.includes('maleta de ferramentas') ||
    nome.includes('organizador de ferramentas')
  ) {
    categorias.push('ferramentas');
    categorias.push('obra');
  }

  // Materiais
  if (
    nome.includes('material de construção') ||
    nome.includes('materiais de construção') ||
    nome.includes('cimento') ||
    nome.includes('argamassa') ||
    nome.includes('rejunte') ||
    nome.includes('concreto') ||
    nome.includes('massa corrida') ||
    nome.includes('massa acrilica') ||
    nome.includes('massa acrílica') ||
    nome.includes('gesso') ||
    nome.includes('gesso em pó') ||
    nome.includes('cal') ||
    nome.includes('areia') ||
    nome.includes('pedra') ||
    nome.includes('brita') ||
    nome.includes('tijolo') ||
    nome.includes('bloco') ||
    nome.includes('bloco de concreto') ||
    nome.includes('bloco ceramico') ||
    nome.includes('bloco cerâmico') ||
    nome.includes('telha') ||
    nome.includes('telhas') ||
    nome.includes('tubo') ||
    nome.includes('cano') ||
    nome.includes('vergalhao') ||
    nome.includes('vergalhão') ||
    nome.includes('ferro para construção') ||
    nome.includes('barra de ferro') ||
    nome.includes('aço') ||
    nome.includes('aco') ||
    nome.includes('arame') ||
    nome.includes('arame recozido') ||
    nome.includes('pregos') ||
    nome.includes('prego') ||
    nome.includes('parafuso') ||
    nome.includes('porca') ||
    nome.includes('arruela') ||
    nome.includes('bucha') ||
    nome.includes('bucha de parede') ||
    nome.includes('fita veda rosca') ||
    nome.includes('silicone') ||
    nome.includes('selante') ||
    nome.includes('vedante') ||
    nome.includes('espuma expansiva') ||
    nome.includes('espuma de poliuretano') ||
    nome.includes('cola para construção') ||
    nome.includes('adesivo de construção') ||
    nome.includes('impermeabilizante') ||
    nome.includes('impermeabilização') ||
    nome.includes('manta asfaltica') ||
    nome.includes('manta asfáltica') ||
    nome.includes('manta impermeabilizante') ||
    nome.includes('tela de proteção') ||
    nome.includes('tela para construção') ||
    nome.includes('tela soldada') ||
    nome.includes('piso') ||
    nome.includes('porcelanato') ||
    nome.includes('azulejo') ||
    nome.includes('revestimento') ||
    nome.includes('ceramica') ||
    nome.includes('cerâmica') ||
    nome.includes('rodape') ||
    nome.includes('rodapé') ||
    nome.includes('soleira') ||
    nome.includes('meio fio') ||
    nome.includes('calha') ||
    nome.includes('rufos') ||
    nome.includes('rufo') ||
    nome.includes('madeira') ||
    nome.includes('compensado') ||
    nome.includes('mdf') ||
    nome.includes('osb')
  ) {
    categorias.push('materiais');
    categorias.push('obra');
  }

  //Elétrica
  if (
    nome.includes('material eletrico') ||
    nome.includes('material elétrico') ||
    nome.includes('eletrica') ||
    nome.includes('elétrica') ||
    nome.includes('fio') ||
    nome.includes('fios') ||
    nome.includes('cabo eletrico') ||
    nome.includes('cabo elétrico') ||
    nome.includes('cabo flexivel') ||
    nome.includes('cabo flexível') ||
    nome.includes('cabo de energia') ||
    nome.includes('cabo de força') ||
    nome.includes('fio eletrico') ||
    nome.includes('fio elétrico') ||
    nome.includes('disjuntor') ||
    nome.includes('disjuntor bipolar') ||
    nome.includes('disjuntor tripolar') ||
    nome.includes('disjuntor unipolar') ||
    nome.includes('dr') ||
    nome.includes('dps') ||
    nome.includes('quadro de distribuição') ||
    nome.includes('quadro de distribuicao') ||
    nome.includes('quadro eletrico') ||
    nome.includes('barramento') ||
    nome.includes('tomada') ||
    nome.includes('tomadas') ||
    nome.includes('interruptor') ||
    nome.includes('interruptores') ||
    nome.includes('plugue') ||
    nome.includes('plug') ||
    nome.includes('adaptador de tomada') ||
    nome.includes('benjamin') ||
    nome.includes('extensao') ||
    nome.includes('extensão') ||
    nome.includes('filtro de linha') ||
    nome.includes('estabilizador') ||
    nome.includes('nobreak') ||
    nome.includes('transformador') ||
    nome.includes('fonte de alimentação') ||
    nome.includes('fonte de alimentacao') ||
    nome.includes('contator') ||
    nome.includes('rele') ||
    nome.includes('relé') ||
    nome.includes('sensor de presença') ||
    nome.includes('sensor de presenca') ||
    nome.includes('fotocelula') ||
    nome.includes('fotocélula') ||
    nome.includes('campainha') ||
    nome.includes('campainha elétrica') ||
    nome.includes('bocal') ||
    nome.includes('soquete de lampada') ||
    nome.includes('soquete de lâmpada') ||
    nome.includes('lampada') ||
    nome.includes('lâmpada') ||
    nome.includes('lampada led') ||
    nome.includes('lâmpada led') ||
    nome.includes('spot') ||
    nome.includes('plafon') ||
    nome.includes('refletor') ||
    nome.includes('refletor led') ||
    nome.includes('fita led') ||
    nome.includes('painel led') ||
    nome.includes('luminaria') ||
    nome.includes('luminária') ||
    nome.includes('arandela') ||
    nome.includes('pendente') ||
    nome.includes('lustre') ||
    nome.includes('sensor de movimento') ||
    nome.includes('eletricista') ||
    nome.includes('testador de tensão') ||
    nome.includes('multimetro') ||
    nome.includes('multímetro')
  ) {
    categorias.push('eletrica');
    categorias.push('obra');
  }

  //Hidráulica
  if (
    nome.includes('material hidraulico') ||
    nome.includes('material hidráulico') ||
    nome.includes('hidraulica') ||
    nome.includes('hidráulica') ||
    nome.includes('tubo pvc') ||
    nome.includes('tubo de pvc') ||
    nome.includes('cano pvc') ||
    nome.includes('cano de pvc') ||
    nome.includes('tubo soldavel') ||
    nome.includes('tubo soldável') ||
    nome.includes('tubo esgoto') ||
    nome.includes('tubo de esgoto') ||
    nome.includes('tubo água') ||
    nome.includes('tubo agua') ||
    nome.includes('conexao') ||
    nome.includes('conexão') ||
    nome.includes('joelho pvc') ||
    nome.includes('joelho') ||
    nome.includes('curva pvc') ||
    nome.includes('luva pvc') ||
    nome.includes('luva de pvc') ||
    nome.includes('te pvc') ||
    nome.includes('tee pvc') ||
    nome.includes('tê pvc') ||
    nome.includes('adaptador pvc') ||
    nome.includes('adaptador hidráulico') ||
    nome.includes('adaptador hidraulico') ||
    nome.includes('registro') ||
    nome.includes('registro de gaveta') ||
    nome.includes('registro de pressão') ||
    nome.includes('registro de pressao') ||
    nome.includes('válvula') ||
    nome.includes('valvula') ||
    nome.includes('valvula de retenção') ||
    nome.includes('valvula de retencao') ||
    nome.includes('torneira') ||
    nome.includes('torneiras') ||
    nome.includes('misturador') ||
    nome.includes('chuveiro') ||
    nome.includes('chuveiro elétrico') ||
    nome.includes('chuveiro eletrico') ||
    nome.includes('ducha') ||
    nome.includes('ducha higiênica') ||
    nome.includes('ducha higienica') ||
    nome.includes('sifao') ||
    nome.includes('sifão') ||
    nome.includes('ralo') ||
    nome.includes('ralo linear') ||
    nome.includes('caixa sifonada') ||
    nome.includes('caixa de gordura') ||
    nome.includes("caixa d'agua") ||
    nome.includes('caixa dagua') ||
    nome.includes('caixa de água') ||
    nome.includes("bomba d'agua") ||
    nome.includes('bomba dagua') ||
    nome.includes('bomba de agua') ||
    nome.includes('bomba hidráulica') ||
    nome.includes('bomba hidraulica') ||
    nome.includes('pressurizador') ||
    nome.includes('pressurizador de agua') ||
    nome.includes('pressurizador de água') ||
    nome.includes('boia') ||
    nome.includes("boia de caixa d'agua") ||
    nome.includes('boia de caixa dagua') ||
    nome.includes('mangueira') ||
    nome.includes('mangueira de jardim') ||
    nome.includes('mangueira cristal') ||
    nome.includes('mangueira hidráulica') ||
    nome.includes('mangueira hidraulica') ||
    nome.includes('fita veda rosca') ||
    nome.includes('vedante hidráulico') ||
    nome.includes('vedante hidraulico') ||
    nome.includes('cola pvc') ||
    nome.includes('adesivo pvc') ||
    nome.includes('engate flexivel') ||
    nome.includes('engate flexível') ||
    nome.includes('flexivel para torneira') ||
    nome.includes('flexível para torneira')
  ) {
    categorias.push('hidraulica');
    categorias.push('obra');
  }

  //Pintura
  if (
    nome.includes('tinta') ||
    nome.includes('tinta acrilica') ||
    nome.includes('tinta acrílica') ||
    nome.includes('tinta latex') ||
    nome.includes('tinta látex') ||
    nome.includes('tinta esmalte') ||
    nome.includes('esmalte sintetico') ||
    nome.includes('esmalte sintético') ||
    nome.includes('tinta spray') ||
    nome.includes('spray paint') ||
    nome.includes('verniz') ||
    nome.includes('seladora') ||
    nome.includes('fundo preparador') ||
    nome.includes('primer') ||
    nome.includes('primer para parede') ||
    nome.includes('massa corrida') ||
    nome.includes('massa acrilica') ||
    nome.includes('massa acrílica') ||
    nome.includes('textura') ||
    nome.includes('textura para parede') ||
    nome.includes('grafiato') ||
    nome.includes('impermeabilizante') ||
    nome.includes('corante') ||
    nome.includes('pigmento') ||
    nome.includes('diluente') ||
    nome.includes('thinner') ||
    nome.includes('aguarras') ||
    nome.includes('aguarrás') ||
    nome.includes('removedor de tinta') ||
    nome.includes('decapante') ||
    nome.includes('rolo de pintura') ||
    nome.includes('rolo para pintura') ||
    nome.includes('pincel') ||
    nome.includes('pincel de pintura') ||
    nome.includes('trincha') ||
    nome.includes('broxa') ||
    nome.includes('espátula') ||
    nome.includes('espátula de pintura') ||
    nome.includes('desempenadeira') ||
    nome.includes('desempenadeira lisa') ||
    nome.includes('desempenadeira dentada') ||
    nome.includes('bandeja de pintura') ||
    nome.includes('bandeja para pintura') ||
    nome.includes('garfo para pintura') ||
    nome.includes('extensor de rolo') ||
    nome.includes('cabo para rolo') ||
    nome.includes('fita crepe') ||
    nome.includes('fita para pintura') ||
    nome.includes('lona para pintura') ||
    nome.includes('protetor de pintura') ||
    nome.includes('misturador de tinta') ||
    nome.includes('agitador de tinta') ||
    nome.includes('pistola de pintura') ||
    nome.includes('pulverizador de tinta') ||
    nome.includes('compressor para pintura')
  ) {
    categorias.push('pintura');
    categorias.push('obra');
  }

  // Viagens / Camping
  if (
    nome.includes('barraca') ||
    nome.includes('barraca de camping') ||
    nome.includes('barraca para camping') ||
    nome.includes('barraca de praia') ||
    nome.includes('barraca familiar') ||
    nome.includes('barraca infantil') ||
    nome.includes('barraca automatica') ||
    nome.includes('barraca automatico') ||
    nome.includes('barraca impermeavel') ||
    nome.includes('barraca iglu') ||
    nome.includes('barraca para 2 pessoas') ||
    nome.includes('barraca para 3 pessoas') ||
    nome.includes('barraca para 4 pessoas') ||
    nome.includes('barraca para 6 pessoas') ||
    nome.includes('barraca para 8 pessoas') ||
    nome.includes('tenda') ||
    nome.includes('tenda de camping') ||
    nome.includes('tenda gazebo') ||
    nome.includes('gazebo') ||
    nome.includes('gazebo camping') ||
    nome.includes('rede de dormir') ||
    nome.includes('rede de descanso') ||
    nome.includes('rede camping') ||
    nome.includes('saco de dormir') ||
    nome.includes('saco dormir') ||
    nome.includes('colchao inflavel') ||
    nome.includes('colchao de camping') ||
    nome.includes('isolante termico') ||
    nome.includes('isolante de camping') ||
    nome.includes('esteira camping') ||
    nome.includes('esteira de praia') ||
    nome.includes('cama de camping') ||
    nome.includes('cadeira de camping') ||
    nome.includes('cadeira dobravel') ||
    nome.includes('banquinho camping') ||
    nome.includes('banco dobravel') ||
    nome.includes('mesa dobravel') ||
    nome.includes('mesa camping') ||
    nome.includes('lanterna') ||
    nome.includes('lanterna de camping') ||
    nome.includes('lampiao') ||
    nome.includes('lampiao de camping') ||
    nome.includes('lampada de camping') ||
    nome.includes('luz de camping') ||
    nome.includes('fogareiro') ||
    nome.includes('fogareiro camping') ||
    nome.includes('fogao camping') ||
    nome.includes('fogao portatil') ||
    nome.includes('fogareiro portatil') ||
    nome.includes('chapa camping') ||
    nome.includes('churrasqueira portatil') ||
    nome.includes('churrasqueira de camping') ||
    nome.includes('kit camping') ||
    nome.includes('kit acampamento') ||
    nome.includes('utensilios camping') ||
    nome.includes('talheres camping') ||
    nome.includes('prato camping') ||
    nome.includes('copo camping') ||
    nome.includes('caneca camping') ||
    nome.includes('panela camping') ||
    nome.includes('kit cozinha camping') ||
    nome.includes('cantimplora') ||
    nome.includes('cantil') ||
    nome.includes('garrafa termica camping') ||
    nome.includes('mochila camping') ||
    nome.includes('mochila cargueira') ||
    nome.includes('mochila de trekking') ||
    nome.includes('mochila trilha') ||
    nome.includes('bastao de caminhada') ||
    nome.includes('bastao trekking') ||
    nome.includes('bastao de trekking') ||
    nome.includes('equipamento camping') ||
    nome.includes('equipamentos camping') ||
    nome.includes('acessorio camping') ||
    nome.includes('acessorios camping')
  ) {
    categorias.push('camping');
    categorias.push('viagem');
  }

  // Malas e Bolsas
  if (
    nome.includes('mala') ||
    nome.includes('malas') ||
    nome.includes('mala de viagem') ||
    nome.includes('mala viagem') ||
    nome.includes('mala de bordo') ||
    nome.includes('mala bordo') ||
    nome.includes('mala pequena') ||
    nome.includes('mala media') ||
    nome.includes('mala grande') ||
    nome.includes('mala extra grande') ||
    nome.includes('mala de mao') ||
    nome.includes('mala com rodinha') ||
    nome.includes('mala com rodas') ||
    nome.includes('mala rigida') ||
    nome.includes('mala rígida') ||
    nome.includes('mala flexivel') ||
    nome.includes('mala expansivel') ||
    nome.includes('mala expansível') ||
    nome.includes('conjunto de malas') ||
    nome.includes('kit malas') ||
    nome.includes('jogo de malas') ||
    nome.includes('bagagem') ||
    nome.includes('bagagem de mao') ||
    nome.includes('bagagem de mão') ||
    nome.includes('bagagem viagem') ||
    nome.includes('mochila') ||
    nome.includes('mochila de viagem') ||
    nome.includes('mochila viagem') ||
    nome.includes('mochila de bordo') ||
    nome.includes('mochila para viagem') ||
    nome.includes('mochila executiva') ||
    nome.includes('mochila escolar') ||
    nome.includes('mochila antifurto') ||
    nome.includes('mochila antirroubo') ||
    nome.includes('mochila impermeavel') ||
    nome.includes('mochila grande') ||
    nome.includes('mochila cargueira') ||
    nome.includes('mochila trekking') ||
    nome.includes('mochila trilha') ||
    nome.includes('bolsa de viagem') ||
    nome.includes('bolsa viagem') ||
    nome.includes('bolsa de bordo') ||
    nome.includes('bolsa de mao') ||
    nome.includes('bolsa sacola') ||
    nome.includes('sacola de viagem') ||
    nome.includes('sacola viagem') ||
    nome.includes('saco de viagem') ||
    nome.includes('saco viagem') ||
    nome.includes('duffel bag') ||
    nome.includes('bolsa esportiva') ||
    nome.includes('bolsa para academia') ||
    nome.includes('necessaire') ||
    nome.includes('necessaire de viagem') ||
    nome.includes('necessaire viagem') ||
    nome.includes('frasqueira') ||
    nome.includes('frasqueira de viagem') ||
    nome.includes('porta terno') ||
    nome.includes('capa para mala') ||
    nome.includes('capa de mala')
  ) {
    categorias.push('malas');
    categorias.push('viagem');
  }

  // Acessórios de viagem
  if (
    nome.includes('acessorio de viagem') ||
    nome.includes('acessorios de viagem') ||
    nome.includes('acessorio viagem') ||
    nome.includes('acessorios viagem') ||
    nome.includes('travesseiro de viagem') ||
    nome.includes('travesseiro viagem') ||
    nome.includes('travesseiro de pescoco') ||
    nome.includes('travesseiro de pescoço') ||
    nome.includes('almofada de viagem') ||
    nome.includes('almofada viagem') ||
    nome.includes('almofada de pescoco') ||
    nome.includes('almofada de pescoço') ||
    nome.includes('mascara de dormir') ||
    nome.includes('mascara para dormir') ||
    nome.includes('tapa olho') ||
    nome.includes('tapa olhos') ||
    nome.includes('protetor auricular') ||
    nome.includes('tampao de ouvido') ||
    nome.includes('tampao para ouvido') ||
    nome.includes('fone de ouvido') ||
    nome.includes('fone bluetooth') ||
    nome.includes('adaptador universal') ||
    nome.includes('adaptador de tomada universal') ||
    nome.includes('adaptador de viagem') ||
    nome.includes('adaptador para tomada') ||
    nome.includes('carregador universal') ||
    nome.includes('carregador de viagem') ||
    nome.includes('carregador portatil') ||
    nome.includes('power bank') ||
    nome.includes('bateria externa') ||
    nome.includes('organizador de cabos') ||
    nome.includes('porta cabos') ||
    nome.includes('capa para passaporte') ||
    nome.includes('porta passaporte') ||
    nome.includes('porta documentos') ||
    nome.includes('porta documento') ||
    nome.includes('porta cartao') ||
    nome.includes('porta cartão') ||
    nome.includes('carteira de viagem') ||
    nome.includes('carteira viagem') ||
    nome.includes('porta dinheiro') ||
    nome.includes('doleira') ||
    nome.includes('pochete') ||
    nome.includes('pochete de viagem') ||
    nome.includes('cinto de dinheiro') ||
    nome.includes('etiqueta de bagagem') ||
    nome.includes('tag de bagagem') ||
    nome.includes('identificador de bagagem') ||
    nome.includes('cadeado para mala') ||
    nome.includes('cadeado de mala') ||
    nome.includes('cadeado tsa') ||
    nome.includes('cinta para mala') ||
    nome.includes('cinta de mala') ||
    nome.includes('balanca de bagagem') ||
    nome.includes('balanca para mala') ||
    nome.includes('balanca de mala') ||
    nome.includes('garrafa de viagem') ||
    nome.includes('garrafinha de viagem') ||
    nome.includes('squeeze de viagem') ||
    nome.includes('copo de viagem') ||
    nome.includes('caneca de viagem') ||
    nome.includes('caneca termica') ||
    nome.includes('garrafa termica') ||
    nome.includes('kit viagem') ||
    nome.includes('kit de viagem')
  ) {
    categorias.push('acessorios-viagem');
    categorias.push('viagem');
  }

  // Organização de viagem
  if (
    nome.includes('organizacao de viagem') ||
    nome.includes('organizacao viagem') ||
    nome.includes('organizador de viagem') ||
    nome.includes('organizadores de viagem') ||
    nome.includes('organizador viagem') ||
    nome.includes('organizadores viagem') ||
    nome.includes('organizador de mala') ||
    nome.includes('organizadores de mala') ||
    nome.includes('organizador para mala') ||
    nome.includes('organizador de bagagem') ||
    nome.includes('organizadores de bagagem') ||
    nome.includes('kit organizador de mala') ||
    nome.includes('kit organizadores de mala') ||
    nome.includes('kit organizador viagem') ||
    nome.includes('packing cubes') ||
    nome.includes('packing cube') ||
    nome.includes('cubos organizadores') ||
    nome.includes('cubos de viagem') ||
    nome.includes('sacos organizadores') ||
    nome.includes('saco organizador') ||
    nome.includes('sacos para viagem') ||
    nome.includes('saco para viagem') ||
    nome.includes('saco a vacuo') ||
    nome.includes('sacos a vacuo') ||
    nome.includes('saco de compressao') ||
    nome.includes('saco compressao') ||
    nome.includes('saco de compressao para viagem') ||
    nome.includes('organizador de roupas') ||
    nome.includes('organizador de calcados') ||
    nome.includes('organizador de sapatos') ||
    nome.includes('organizador de lingerie') ||
    nome.includes('organizador de roupas intimas') ||
    nome.includes('organizador de cosmeticos') ||
    nome.includes('organizador de maquiagem') ||
    nome.includes('necessaire organizadora') ||
    nome.includes('porta sapatos') ||
    nome.includes('porta roupas') ||
    nome.includes('capa para roupa') ||
    nome.includes('capa para terno') ||
    nome.includes('capa de roupa') ||
    nome.includes('divisoria de mala') ||
    nome.includes('divisoria para mala') ||
    nome.includes('separador de mala') ||
    nome.includes('separador de roupas') ||
    nome.includes('etiqueta de mala') ||
    nome.includes('etiqueta para bagagem')
  ) {
    categorias.push('organizacao-viagem');
    categorias.push('viagem');
  }

  // Celulares
  if (
    nome.includes('celular') ||
    nome.includes('smartphone') ||
    nome.includes('iphone') ||
    nome.includes('ipad') ||
    nome.includes('samsung') ||
    nome.includes('galaxy') ||
    nome.includes('xiaomi') ||
    nome.includes('redmi') ||
    nome.includes('poco') ||
    nome.includes('motorola') ||
    nome.includes('moto g') ||
    nome.includes('moto edge') ||
    nome.includes('moto razr') ||
    nome.includes('realme') ||
    nome.includes('oneplus') ||
    nome.includes('oppo') ||
    nome.includes('vivo') ||
    nome.includes('honor') ||
    nome.includes('asus zenfone') ||
    nome.includes('asus rog phone') ||
    nome.includes('zenfone') ||
    nome.includes('rog phone') ||
    nome.includes('infinix') ||
    nome.includes('tecno') ||
    nome.includes('zte') ||
    nome.includes('nokia') ||
    nome.includes('alcatel') ||
    nome.includes('tcl') ||
    nome.includes('positivo') ||
    nome.includes('multilaser') ||
    nome.includes('itel') ||
    nome.includes('ulefone') ||
    nome.includes('doogee') ||
    nome.includes('blackview') ||
    nome.includes('oukitel') ||
    nome.includes('cubot') ||
    nome.includes('umidigi') ||
    nome.includes('nothing phone') ||
    nome.includes('google pixel') ||
    nome.includes('pixel phone') ||
    nome.includes('sony xperia') ||
    nome.includes('xperia') ||
    nome.includes('lg') ||
    nome.includes('celular') ||
    nome.includes('smartphone') ||
    nome.includes('iphone') ||
    nome.includes('android') ||
    nome.includes('telefone celular') ||
    nome.includes('aparelho celular') ||
    nome.includes('celular 5g') ||
    nome.includes('celular 4g') ||
    nome.includes('smartphone 5g') ||
    nome.includes('smartphone 4g') ||
    nome.includes('alcatel')
  ) {
    categorias.push('celulares');
    categorias.push('tech');
  }

  // Computadores
  if (
    nome.includes('computador') ||
    nome.includes('pc') ||
    nome.includes('desktop') ||
    nome.includes('notebook') ||
    nome.includes('laptop') ||
    nome.includes('macbook') ||
    nome.includes('chromebook') ||
    nome.includes('all in one') ||
    nome.includes('mini pc') ||
    nome.includes('workstation') ||
    nome.includes('servidor') ||
    nome.includes('monitor') ||
    nome.includes('monitor gamer') ||
    nome.includes('monitor ultrawide') ||
    nome.includes('teclado') ||
    nome.includes('mouse') ||
    nome.includes('mouse gamer') ||
    nome.includes('mousepad') ||
    nome.includes('webcam') ||
    nome.includes('impressora') ||
    nome.includes('scanner')
  ) {
    categorias.push('computadores');
    categorias.push('tech');
  }

  //Som / audio / fone / caixa de som
  if (
    nome.includes('fone') ||
    nome.includes('fone de ouvido') ||
    nome.includes('fone bluetooth') ||
    nome.includes('fone sem fio') ||
    nome.includes('headphone') ||
    nome.includes('headset') ||
    nome.includes('headset gamer') ||
    nome.includes('earbuds') ||
    nome.includes('airpods') ||
    nome.includes('caixa de som') ||
    nome.includes('caixa de som bluetooth') ||
    nome.includes('soundbar') ||
    nome.includes('alto falante') ||
    nome.includes('alto-falante') ||
    nome.includes('microfone') ||
    nome.includes('microfone gamer') ||
    nome.includes('microfone condensador') ||
    nome.includes('mesa de som') ||
    nome.includes('amplificador') ||
    nome.includes('subwoofer') ||
    nome.includes('receiver')
  ) {
    categorias.push('audio');
    categorias.push('tech');
  }

  // Acessorios
  if (
    nome.includes('carregador') ||
    nome.includes('carregador rapido') ||
    nome.includes('carregador sem fio') ||
    nome.includes('carregador wireless') ||
    nome.includes('cabo usb') ||
    nome.includes('cabo usb-c') ||
    nome.includes('cabo usb c') ||
    nome.includes('cabo lightning') ||
    nome.includes('cabo hdmi') ||
    nome.includes('cabo displayport') ||
    nome.includes('adaptador usb') ||
    nome.includes('adaptador usb-c') ||
    nome.includes('adaptador bluetooth') ||
    nome.includes('hub usb') ||
    nome.includes('hub usb-c') ||
    nome.includes('power bank') ||
    nome.includes('bateria externa') ||
    nome.includes('suporte para celular') ||
    nome.includes('suporte de celular') ||
    nome.includes('suporte para notebook') ||
    nome.includes('pelicula') ||
    nome.includes('pelicula de vidro') ||
    nome.includes('capinha') ||
    nome.includes('capa para celular') ||
    nome.includes('case para celular') ||
    nome.includes('cartao de memoria') ||
    nome.includes('micro sd') ||
    nome.includes('pendrive') ||
    nome.includes('leitor de cartao') ||
    nome.includes('carregador veicular') ||
    nome.includes('suporte veicular') ||
    nome.includes('mousepad')
  ) {
    categorias.push('acessorios-eletronicos');
    categorias.push('tech');
  }

  // Gadgest
  if (
    nome.includes('smartwatch') ||
    nome.includes('relogio inteligente') ||
    nome.includes('relogio smart') ||
    nome.includes('smartband') ||
    nome.includes('pulseira inteligente') ||
    nome.includes('rastreador bluetooth') ||
    nome.includes('rastreador gps') ||
    nome.includes('tag bluetooth') ||
    nome.includes('air tag') ||
    nome.includes('camera wifi') ||
    nome.includes('camera inteligente') ||
    nome.includes('camera ip') ||
    nome.includes('campainha inteligente') ||
    nome.includes('fechadura inteligente') ||
    nome.includes('tomada inteligente') ||
    nome.includes('lampada inteligente') ||
    nome.includes('lampada smart') ||
    nome.includes('controle universal') ||
    nome.includes('controle remoto universal') ||
    nome.includes('assistente virtual') ||
    nome.includes('projetor') ||
    nome.includes('projetor portatil') ||
    nome.includes('oculos vr') ||
    nome.includes('realidade virtual') ||
    nome.includes('drone') ||
    nome.includes('drone com camera') ||
    nome.includes('camera esportiva') ||
    nome.includes('action cam') ||
    nome.includes('console') ||
    nome.includes('videogame') ||
    nome.includes('gamepad') ||
    nome.includes('controle gamer')
  ) {
    categorias.push('gadgets');
    categorias.push('tech');
  }
  // Memoria Ram
  if (
    nome.includes('memoria ram') ||
    nome.includes('memoria ddr') ||
    nome.includes('ram ddr') ||
    nome.includes('ddr2') ||
    nome.includes('ddr3') ||
    nome.includes('ddr4') ||
    nome.includes('ddr5') ||
    nome.includes('ddr6') ||
    nome.includes('dimmm') ||
    nome.includes('dimm') ||
    nome.includes('sodimm') ||
    nome.includes('so-dimm') ||
    nome.includes('memoria de computador') ||
    nome.includes('memoria para pc') ||
    nome.includes('memoria para notebook')
  ) {
    categorias.push('memoria');
    categorias.push('pc');
  }

  //Placa De Video
  if (
    nome.includes('placa de video') ||
    nome.includes('placa grafica') ||
    nome.includes('geforce') ||
    nome.includes('rtx') ||
    nome.includes('gtx') ||
    nome.includes('radeon') ||
    nome.includes('rx 5') ||
    nome.includes('rx 6') ||
    nome.includes('rx 7') ||
    nome.includes('rx 9') ||
    nome.includes('arc a') ||
    nome.includes('intel arc')
  ) {
    categorias.push('placa-de-video');
    categorias.push('pc');
  }

  //Processador
  if (
    nome.includes('processador') ||
    nome.includes('intel core') ||
    nome.includes('core i3') ||
    nome.includes('core i5') ||
    nome.includes('core i7') ||
    nome.includes('core i9') ||
    nome.includes('ultra') ||
    nome.includes('intel xeon') ||
    nome.includes('amd ryzen') ||
    nome.includes('ryzen 3') ||
    nome.includes('ryzen 5') ||
    nome.includes('ryzen 7') ||
    nome.includes('ryzen 9') ||
    nome.includes('amd threadripper') ||
    nome.includes('threadripper') ||
    nome.includes('epyc')
  ) {
    categorias.push('processador');
    categorias.push('pc');
  }

  //Placa Mãe
  if (
    nome.includes('placa mae') ||
    nome.includes('motherboard') ||
    nome.includes('mother board') ||
    nome.includes('placa-mãe') ||
    nome.includes('placa am4') ||
    nome.includes('placa am5') ||
    nome.includes('placa lga') ||
    nome.includes('b450') ||
    nome.includes('b550') ||
    nome.includes('b650') ||
    nome.includes('x570') ||
    nome.includes('x670') ||
    nome.includes('z490') ||
    nome.includes('z590') ||
    nome.includes('z690') ||
    nome.includes('z790') ||
    nome.includes('h510') ||
    nome.includes('h610') ||
    nome.includes('h670') ||
    nome.includes('h770')
  ) {
    categorias.push('placamae');
    categorias.push('pc');
  }

  //Water cooler
  if (
    nome.includes('water cooler') ||
    nome.includes('watercooler') ||
    nome.includes('water cooling') ||
    nome.includes('liquid cooler') ||
    nome.includes('liquid cooling') ||
    nome.includes('cooler liquido') ||
    nome.includes('resfriamento liquido') ||
    nome.includes('kit water cooler') ||
    nome.includes('water cooler 120mm') ||
    nome.includes('water cooler 240mm') ||
    nome.includes('water cooler 280mm') ||
    nome.includes('water cooler 360mm') ||
    nome.includes('water cooler 420mm')
  ) {
    categorias.push('watercooler');
    categorias.push('pc');
  }

  //Air Cooler
  if (
    nome.includes('air cooler') ||
    nome.includes('cooler para processador') ||
    nome.includes('cooler cpu') ||
    nome.includes('cooler de cpu') ||
    nome.includes('cooler torre') ||
    nome.includes('cooler tower') ||
    nome.includes('cooler box') ||
    nome.includes('cpu cooler') ||
    nome.includes('heatsink') ||
    nome.includes('dissipador de calor') ||
    nome.includes('dissipador para processador')
  ) {
    categorias.push('aircooler');
    categorias.push('pc');
  }

  //Fans
  if (
    nome.includes('fan') ||
    nome.includes('fans') ||
    nome.includes('ventoinha') ||
    nome.includes('ventoinha de pc') ||
    nome.includes('fan de pc') ||
    nome.includes('fan para pc') ||
    nome.includes('cooler fan') ||
    nome.includes('fan rgb') ||
    nome.includes('fan argb') ||
    nome.includes('kit fan') ||
    nome.includes('kit fans') ||
    nome.includes('kit de ventoinhas') ||
    nome.includes('ventoinhas rgb') ||
    nome.includes('ventoinhas argb')
  ) {
    categorias.push('fan');
    categorias.push('pc');
  }

  //Gabinete
  if (
    nome.includes('gabinete') ||
    nome.includes('gabinete gamer') ||
    nome.includes('case pc') ||
    nome.includes('pc case') ||
    nome.includes('mid tower') ||
    nome.includes('full tower') ||
    nome.includes('mini tower') ||
    nome.includes('mini itx case') ||
    nome.includes('gabinete atx') ||
    nome.includes('gabinete micro atx') ||
    nome.includes('gabinete matx')
  ) {
    categorias.push('gabinete');
    categorias.push('pc');
  }

  //Fonte
  if (
    nome.includes('fonte de alimentacao') ||
    nome.includes('fonte para pc') ||
    nome.includes('fonte pc') ||
    nome.includes('fonte gamer') ||
    nome.includes('fonte atx') ||
    nome.includes('fonte modular') ||
    nome.includes('fonte semi modular') ||
    nome.includes('fonte sfx') ||
    nome.includes('fonte 450w') ||
    nome.includes('fonte 500w') ||
    nome.includes('fonte 550w') ||
    nome.includes('fonte 600w') ||
    nome.includes('fonte 650w') ||
    nome.includes('fonte 700w') ||
    nome.includes('fonte 750w') ||
    nome.includes('fonte 800w') ||
    nome.includes('fonte 850w') ||
    nome.includes('fonte 1000w') ||
    nome.includes('fonte 1200w')
  ) {
    categorias.push('fonte');
    categorias.push('pc');
  }

  //Armazenamento
  if (
    nome.includes('ssd') ||
    nome.includes('ssd sata') ||
    nome.includes('ssd nvme') ||
    nome.includes('ssd m2') ||
    nome.includes('ssd m.2') ||
    nome.includes('hd') ||
    nome.includes('hd interno') ||
    nome.includes('hd externo') ||
    nome.includes('disco rigido') ||
    nome.includes('hard disk') ||
    nome.includes('hdd') ||
    nome.includes('nvme') ||
    nome.includes('m2') ||
    nome.includes('m.2') ||
    nome.includes('memoria ssd') ||
    nome.includes('armazenamento') ||
    nome.includes('cartao sd') ||
    nome.includes('cartao micro sd')
  ) {
    categorias.push('armazenamento');
    categorias.push('pc');
  }

  //kit
  if (
    nome.includes('kit upgrade pc') ||
    nome.includes('kit upgrade computador') ||
    nome.includes('kit upgrade gamer') ||
    nome.includes('kit processador placa mae') ||
    nome.includes('kit processador placa mae memoria') ||
    nome.includes('kit placa mae processador') ||
    nome.includes('kit placa mae memoria') ||
    nome.includes('kit pc gamer') ||
    nome.includes('kit computador gamer') ||
    nome.includes('kit montagem pc') ||
    nome.includes('kit montagem computador') ||
    nome.includes('combo upgrade pc') ||
    nome.includes('combo upgrade computador') ||
    nome.includes('kit ryzen') ||
    nome.includes('kit intel') ||
    nome.includes('kit memoria ram') ||
    nome.includes('kit memoria') ||
    nome.includes('kit placa de video') ||
    nome.includes('kit placa mae') ||
    nome.includes('kit processador') ||
    nome.includes('kit gabinete') ||
    nome.includes('kit water cooler') ||
    nome.includes('kit air cooler') ||
    nome.includes('kit cooler') ||
    nome.includes('kit computador') ||
    nome.includes('kit pc')
  ) {
    categorias.push('kit');
    categorias.push('pc');
  }

  //Teclado
  if (
    nome.includes('teclado') ||
    nome.includes('teclado gamer') ||
    nome.includes('teclado mecanico') ||
    nome.includes('teclado semi mecanico') ||
    nome.includes('teclado membrana') ||
    nome.includes('teclado rgb') ||
    nome.includes('teclado wireless') ||
    nome.includes('teclado sem fio') ||
    nome.includes('teclado bluetooth') ||
    nome.includes('teclado gamer rgb') ||
    nome.includes('teclado 60') ||
    nome.includes('teclado 65') ||
    nome.includes('teclado 75') ||
    nome.includes('teclado tkl')
  ) {
    categorias.push('teclado');
    categorias.push('pc');
  }

  //Mouse
  if (
    nome.includes('mouse') ||
    nome.includes('mouse gamer') ||
    nome.includes('mouse sem fio') ||
    nome.includes('mouse wireless') ||
    nome.includes('mouse bluetooth') ||
    nome.includes('mouse optico') ||
    nome.includes('mouse ergonomico') ||
    nome.includes('mouse rgb') ||
    nome.includes('mousepad') ||
    nome.includes('mouse pad') ||
    nome.includes('mouse gamer rgb')
  ) {
    categorias.push('mouse');
    categorias.push('pc');
  }

  //fitness
  if (
    nome.includes('fitness') ||
    nome.includes('academia') ||
    nome.includes('treino') ||
    nome.includes('treinamento') ||
    nome.includes('exercicio') ||
    nome.includes('exercicios') ||
    nome.includes('ginastica') ||
    nome.includes('yoga') ||
    nome.includes('pilates') ||
    nome.includes('crossfit') ||
    nome.includes('alongamento') ||
    nome.includes('tapete de yoga') ||
    nome.includes('colchonete') ||
    nome.includes('colchonete de exercicio') ||
    nome.includes('elastico de exercicio') ||
    nome.includes('faixa elastica') ||
    nome.includes('mini band') ||
    nome.includes('band') ||
    nome.includes('corda de pular') ||
    nome.includes('corda de pular') ||
    nome.includes('step') ||
    nome.includes('bola de pilates') ||
    nome.includes('bola suica') ||
    nome.includes('bola de exercicio') ||
    nome.includes('rolo de massagem') ||
    nome.includes('rolo de liberação') ||
    nome.includes('rolo miofascial') ||
    nome.includes('massageador muscular') ||
    nome.includes('caneleira') ||
    nome.includes('tornozeleira') ||
    nome.includes('luva fitness') ||
    nome.includes('luva academia') ||
    nome.includes('garrafa fitness') ||
    nome.includes('squeeze fitness')
  ) {
    categorias.push('fitness');
    categorias.push('esporte');
  }

  //Musculacao
  if (
    nome.includes('musculacao') ||
    nome.includes('musculação') ||
    nome.includes('bodybuilding') ||
    nome.includes('halter') ||
    nome.includes('halteres') ||
    nome.includes('peso') ||
    nome.includes('pesos') ||
    nome.includes('anilha') ||
    nome.includes('anilhas') ||
    nome.includes('barra de musculacao') ||
    nome.includes('barra de academia') ||
    nome.includes('barra reta') ||
    nome.includes('barra w') ||
    nome.includes('barra olimpica') ||
    nome.includes('barra olimpica') ||
    nome.includes('kit musculacao') ||
    nome.includes('kit academia') ||
    nome.includes('kit pesos') ||
    nome.includes('kit halteres') ||
    nome.includes('kettlebell') ||
    nome.includes('power rack') ||
    nome.includes('rack de musculacao') ||
    nome.includes('banco de musculacao') ||
    nome.includes('banco de academia') ||
    nome.includes('banco supino') ||
    nome.includes('suporte para barra') ||
    nome.includes('suporte de halteres') ||
    nome.includes('torre de pesos') ||
    nome.includes('estacao de musculacao') ||
    nome.includes('estacao de academia')
  ) {
    categorias.push('musculacao');
    categorias.push('esporte');
  }
  //Corrida
  if (
    nome.includes('corrida') ||
    nome.includes('corredor') ||
    nome.includes('maratona') ||
    nome.includes('meia maratona') ||
    nome.includes('running') ||
    nome.includes('runner') ||
    nome.includes('treino de corrida') ||
    nome.includes('tênis de corrida') ||
    nome.includes('tenis de corrida') ||
    nome.includes('tenis running') ||
    nome.includes('short de corrida') ||
    nome.includes('shorts de corrida') ||
    nome.includes('camiseta de corrida') ||
    nome.includes('regata de corrida') ||
    nome.includes('meia de corrida') ||
    nome.includes('cinto de corrida') ||
    nome.includes('pochete de corrida') ||
    nome.includes('oculos de corrida') ||
    nome.includes('bone de corrida') ||
    nome.includes('viseira de corrida') ||
    nome.includes('garrafa de corrida')
  ) {
    categorias.push('corrida');
    categorias.push('esporte');
  }
  //Futebol
  if (
    nome.includes('futebol') ||
    nome.includes('futebol de campo') ||
    nome.includes('futebol society') ||
    nome.includes('futsal') ||
    nome.includes('bola de futebol') ||
    nome.includes('bola futsal') ||
    nome.includes('chuteira') ||
    nome.includes('chuteira society') ||
    nome.includes('chuteira futsal') ||
    nome.includes('camisa de futebol') ||
    nome.includes('camiseta de futebol') ||
    nome.includes('uniforme de futebol') ||
    nome.includes('calcao de futebol') ||
    nome.includes('meiao') ||
    nome.includes('meiao de futebol') ||
    nome.includes('luva de goleiro') ||
    nome.includes('luva goleiro') ||
    nome.includes('caneleira futebol') ||
    nome.includes('caneleira de futebol') ||
    nome.includes('rede de futebol') ||
    nome.includes('trave de futebol') ||
    nome.includes('mini trave') ||
    nome.includes('cone de treinamento') ||
    nome.includes('escada de agilidade') ||
    nome.includes('colete de treino') ||
    nome.includes('apito') ||
    nome.includes('bomba para bola')
  ) {
    categorias.push('futebol');
    categorias.push('esporte');
  }
  //Camping
  if (
    nome.includes('camping') ||
    nome.includes('acampamento') ||
    nome.includes('barraca') ||
    nome.includes('barraca de camping') ||
    nome.includes('barraca para camping') ||
    nome.includes('saco de dormir') ||
    nome.includes('colchao de camping') ||
    nome.includes('isolante termico') ||
    nome.includes('rede de camping') ||
    nome.includes('cadeira de camping') ||
    nome.includes('mesa de camping') ||
    nome.includes('fogareiro') ||
    nome.includes('fogareiro camping') ||
    nome.includes('lampiao') ||
    nome.includes('lanterna de camping') ||
    nome.includes('kit camping') ||
    nome.includes('kit acampamento') ||
    nome.includes('mochila cargueira') ||
    nome.includes('mochila trekking') ||
    nome.includes('mochila trilha') ||
    nome.includes('bastao de trekking') ||
    nome.includes('bastao de caminhada') ||
    nome.includes('equipamento camping') ||
    nome.includes('equipamentos camping')
  ) {
    categorias.push('camping');
    categorias.push('esporte');
  }
  //Acessorios Esportivos
  if (
    nome.includes('acessorio esportivo') ||
    nome.includes('acessorios esportivos') ||
    nome.includes('acessorio para esporte') ||
    nome.includes('acessorios para esporte') ||
    nome.includes('garrafa esportiva') ||
    nome.includes('squeeze') ||
    nome.includes('cantil esportivo') ||
    nome.includes('toalha esportiva') ||
    nome.includes('toalha fitness') ||
    nome.includes('mochila esportiva') ||
    nome.includes('bolsa esportiva') ||
    nome.includes('bolsa academia') ||
    nome.includes('bolsa de academia') ||
    nome.includes('pochete esportiva') ||
    nome.includes('pochete fitness') ||
    nome.includes('bone esportivo') ||
    nome.includes('bone fitness') ||
    nome.includes('viseira esportiva') ||
    nome.includes('oculos esportivo') ||
    nome.includes('oculos de esporte') ||
    nome.includes('luva esportiva') ||
    nome.includes('luva para academia') ||
    nome.includes('munhequeira') ||
    nome.includes('joelheira') ||
    nome.includes('cotoveleira') ||
    nome.includes('tornozeleira esportiva') ||
    nome.includes('caneleira') ||
    nome.includes('faixa de joelho') ||
    nome.includes('faixa de punho') ||
    nome.includes('protetor bucal') ||
    nome.includes('apito esportivo') ||
    nome.includes('cronometro esportivo') ||
    nome.includes('relogio esportivo') ||
    nome.includes('smartwatch esportivo')
  ) {
    categorias.push('acessorios-esporte');
    categorias.push('esporte');
  }
  // Cachorros
  if (
    nome.includes('cachorro') ||
    nome.includes('cachorros') ||
    nome.includes('cao') ||
    nome.includes('caes') ||
    nome.includes('canino') ||
    nome.includes('canina') ||
    nome.includes('para cachorro') ||
    nome.includes('para caes') ||
    nome.includes('filhote de cachorro') ||
    nome.includes('filhote canino') ||
    nome.includes('racao para cachorro') ||
    nome.includes('racao canina') ||
    nome.includes('petisco para cachorro') ||
    nome.includes('brinquedo para cachorro') ||
    nome.includes('coleira para cachorro') ||
    nome.includes('guia para cachorro') ||
    nome.includes('cama para cachorro') ||
    nome.includes('casinha para cachorro') ||
    nome.includes('roupa para cachorro')
  ) {
    categorias.push('cachorros');
    categorias.push('pet');
  }
  // Gatos
  if (
    nome.includes('gato') ||
    nome.includes('gatos') ||
    nome.includes('felino') ||
    nome.includes('felina') ||
    nome.includes('para gato') ||
    nome.includes('para gatos') ||
    nome.includes('filhote de gato') ||
    nome.includes('filhote felino') ||
    nome.includes('racao para gato') ||
    nome.includes('racao felina') ||
    nome.includes('petisco para gato') ||
    nome.includes('brinquedo para gato') ||
    nome.includes('arranhador') ||
    nome.includes('coleira para gato') ||
    nome.includes('guia para gato') ||
    nome.includes('cama para gato') ||
    nome.includes('caminha para gato') ||
    nome.includes('casa para gato') ||
    nome.includes('rede para gato')
  ) {
    categorias.push('gatos');
    categorias.push('pet');
  }
  // Alimentação
  if (
    nome.includes('racao') ||
    nome.includes('ração') ||
    nome.includes('racao para cachorro') ||
    nome.includes('racao para gato') ||
    nome.includes('racao canina') ||
    nome.includes('racao felina') ||
    nome.includes('racao seca') ||
    nome.includes('racao umida') ||
    nome.includes('racao umida') ||
    nome.includes('racao premium') ||
    nome.includes('racao natural') ||
    nome.includes('alimento para pet') ||
    nome.includes('alimentacao pet') ||
    nome.includes('comida para cachorro') ||
    nome.includes('comida para gato') ||
    nome.includes('petisco') ||
    nome.includes('petiscos') ||
    nome.includes('snack para cachorro') ||
    nome.includes('snack para gato') ||
    nome.includes('biscoito para cachorro') ||
    nome.includes('biscoito para gato') ||
    nome.includes('osso para cachorro') ||
    nome.includes('osso natural') ||
    nome.includes('sache para gato') ||
    nome.includes('sache para cachorro') ||
    nome.includes('patê para gato') ||
    nome.includes('pate para gato') ||
    nome.includes('pate para cachorro') ||
    nome.includes('pote de racao') ||
    nome.includes('comedouro') ||
    nome.includes('comedouro automatico') ||
    nome.includes('bebedouro') ||
    nome.includes('bebedouro automatico') ||
    nome.includes('fonte para gatos') ||
    nome.includes('fonte de agua para pet')
  ) {
    categorias.push('alimentacao-pet');
    categorias.push('pet');
  }
  // Brinquedos
  if (
    nome.includes('brinquedo para cachorro') ||
    nome.includes('brinquedo para gatos') ||
    nome.includes('brinquedo para gato') ||
    nome.includes('brinquedo pet') ||
    nome.includes('brinquedos pet') ||
    nome.includes('mordedor') ||
    nome.includes('mordedor para cachorro') ||
    nome.includes('mordedor pet') ||
    nome.includes('bola para cachorro') ||
    nome.includes('bola para pet') ||
    nome.includes('frisbee para cachorro') ||
    nome.includes('corda para cachorro') ||
    nome.includes('corda para pet') ||
    nome.includes('pelucia para cachorro') ||
    nome.includes('pelucia para gato') ||
    nome.includes('ratinho para gato') ||
    nome.includes('brinquedo interativo') ||
    nome.includes('brinquedo interativo para pet') ||
    nome.includes('brinquedo comedouro') ||
    nome.includes('brinquedo mordedor') ||
    nome.includes('laser para gato') ||
    nome.includes('varinha para gato') ||
    nome.includes('arranhador com brinquedo')
  ) {
    categorias.push('brinquedos');
    categorias.push('pet');
  }
  // Acessórios
  if (
    nome.includes('acessorio pet') ||
    nome.includes('acessorios pet') ||
    nome.includes('acessorio para cachorro') ||
    nome.includes('acessorios para cachorro') ||
    nome.includes('acessorio para gato') ||
    nome.includes('acessorios para gato') ||
    nome.includes('coleira') ||
    nome.includes('guia para cachorro') ||
    nome.includes('guia para pet') ||
    nome.includes('peitoral') ||
    nome.includes('peitoral para cachorro') ||
    nome.includes('peitoral para gato') ||
    nome.includes('cama pet') ||
    nome.includes('cama para cachorro') ||
    nome.includes('cama para gato') ||
    nome.includes('caminha pet') ||
    nome.includes('casinha para cachorro') ||
    nome.includes('casa para cachorro') ||
    nome.includes('casa para gato') ||
    nome.includes('toca para gato') ||
    nome.includes('toca pet') ||
    nome.includes('rede para gato') ||
    nome.includes('roupa para cachorro') ||
    nome.includes('roupa para gato') ||
    nome.includes('roupinha pet') ||
    nome.includes('sapato para cachorro') ||
    nome.includes('botinha para cachorro') ||
    nome.includes('fralda para cachorro') ||
    nome.includes('fralda pet') ||
    nome.includes('tapete higienico') ||
    nome.includes('tapete para cachorro') ||
    nome.includes('tapete pet') ||
    nome.includes('caixa de transporte') ||
    nome.includes('caixa transporte pet') ||
    nome.includes('bolsa de transporte pet') ||
    nome.includes('mochila transporte pet') ||
    nome.includes('cinto de seguranca para cachorro') ||
    nome.includes('cinto para cachorro') ||
    nome.includes('bebê conforto pet') ||
    nome.includes('escova para cachorro') ||
    nome.includes('escova para gato') ||
    nome.includes('pente para cachorro') ||
    nome.includes('pente para gato') ||
    nome.includes('shampoo para cachorro') ||
    nome.includes('shampoo para gato') ||
    nome.includes('higiene pet') ||
    nome.includes('kit higiene pet') ||
    nome.includes('cortador de unha pet') ||
    nome.includes('cortador de unhas para cachorro') ||
    nome.includes('cortador de unhas para gato') ||
    nome.includes('removedor de pelos') ||
    nome.includes('luva tira pelos') ||
    nome.includes('bebedouro pet') ||
    nome.includes('comedouro pet') ||
    nome.includes('comedouro automatico')
  ) {
    categorias.push('outros-acessorios-pet');
    categorias.push('pet');
  }
  //Bolsas
  if (
    nome.includes('bolsa') ||
    nome.includes('bolsas') ||
    nome.includes('bolsa feminina') ||
    nome.includes('bolsa masculina') ||
    nome.includes('bolsa de ombro') ||
    nome.includes('bolsa de mao') ||
    nome.includes('bolsa transversal') ||
    nome.includes('bolsa tiracolo') ||
    nome.includes('bolsa transversal') ||
    nome.includes('bolsa shoulder') ||
    nome.includes('bolsa tote') ||
    nome.includes('tote bag') ||
    nome.includes('bolsa sacola') ||
    nome.includes('bolsa pequena') ||
    nome.includes('bolsa grande') ||
    nome.includes('bolsa de couro') ||
    nome.includes('bolsa casual') ||
    nome.includes('bolsa social') ||
    nome.includes('bolsa executiva') ||
    nome.includes('bolsa carteira') ||
    nome.includes('clutch') ||
    nome.includes('pochete') ||
    nome.includes('pochete feminina') ||
    nome.includes('pochete masculina') ||
    nome.includes('shoulder bag') ||
    nome.includes('crossbody bag') ||
    nome.includes('bag feminina') ||
    nome.includes('bag masculina')
  ) {
    categorias.push('bolsas');
    categorias.push('acessorios-categoria');
  }
  //Mochila
  if (
    nome.includes('mochila') ||
    nome.includes('mochilas') ||
    nome.includes('mochila feminina') ||
    nome.includes('mochila masculina') ||
    nome.includes('mochila escolar') ||
    nome.includes('mochila executiva') ||
    nome.includes('mochila casual') ||
    nome.includes('mochila profissional') ||
    nome.includes('mochila para notebook') ||
    nome.includes('mochila notebook') ||
    nome.includes('mochila para laptop') ||
    nome.includes('mochila gamer') ||
    nome.includes('mochila antifurto') ||
    nome.includes('mochila antirroubo') ||
    nome.includes('mochila impermeavel') ||
    nome.includes('mochila dobravel') ||
    nome.includes('mochila esportiva') ||
    nome.includes('mochila de viagem') ||
    nome.includes('mochila viagem') ||
    nome.includes('mochila de bordo') ||
    nome.includes('mochila camping') ||
    nome.includes('mochila cargueira') ||
    nome.includes('mochila trekking') ||
    nome.includes('mochila trilha')
  ) {
    categorias.push('mochilas');
    categorias.push('acessorios-categoria');
  }
  //Carteira
  if (
    nome.includes('carteira') ||
    nome.includes('carteiras') ||
    nome.includes('carteira masculina') ||
    nome.includes('carteira feminina') ||
    nome.includes('carteira de couro') ||
    nome.includes('carteira couro') ||
    nome.includes('carteira slim') ||
    nome.includes('carteira compacta') ||
    nome.includes('carteira grande') ||
    nome.includes('carteira pequena') ||
    nome.includes('carteira porta cartao') ||
    nome.includes('porta cartao') ||
    nome.includes('porta-cartao') ||
    nome.includes('porta documentos') ||
    nome.includes('porta documento') ||
    nome.includes('porta dinheiro') ||
    nome.includes('porta moedas') ||
    nome.includes('porta moeda') ||
    nome.includes('porta passaporte') ||
    nome.includes('carteira digital') ||
    nome.includes('carteira com ziper') ||
    nome.includes('carteira com zíper')
  ) {
    categorias.push('carteiras');
    categorias.push('acessorios-categoria');
  }
  //Relogios
  if (
    nome.includes('relogio') ||
    nome.includes('relogios') ||
    nome.includes('relogio masculino') ||
    nome.includes('relogio feminino') ||
    nome.includes('relogio unissex') ||
    nome.includes('relogio de pulso') ||
    nome.includes('relogio analogico') ||
    nome.includes('relogio digital') ||
    nome.includes('relogio automatico') ||
    nome.includes('relogio mecanico') ||
    nome.includes('relogio esportivo') ||
    nome.includes('relogio social') ||
    nome.includes('relogio casual') ||
    nome.includes('relogio de luxo') ||
    nome.includes('relogio inteligente') ||
    nome.includes('smartwatch') ||
    nome.includes('smart watch') ||
    nome.includes('relogio esportivo') ||
    nome.includes('relogio bluetooth')
  ) {
    categorias.push('relogios');
    categorias.push('acessorios-categoria');
  }
  //Oculos
  if (
    nome.includes('oculos') ||
    nome.includes('oculos de sol') ||
    nome.includes('oculos solar') ||
    nome.includes('oculos escuro') ||
    nome.includes('oculos masculino') ||
    nome.includes('oculos feminino') ||
    nome.includes('oculos unissex') ||
    nome.includes('oculos esportivo') ||
    nome.includes('oculos de esporte') ||
    nome.includes('oculos polarizado') ||
    nome.includes('oculos polarizados') ||
    nome.includes('oculos de grau') ||
    nome.includes('armacao de oculos') ||
    nome.includes('armação de oculos') ||
    nome.includes('armacao') ||
    nome.includes('lentes de oculos') ||
    nome.includes('lente para oculos') ||
    nome.includes('oculos para dirigir') ||
    nome.includes('oculos para corrida') ||
    nome.includes('oculos para ciclismo') ||
    nome.includes('oculos para ciclismo') ||
    nome.includes('oculos esportivos')
  ) {
    categorias.push('oculos');
    categorias.push('acessorios-categoria');
  }
  //Outros
  if (
    nome.includes('cinto') ||
    nome.includes('cintos') ||
    nome.includes('gravata') ||
    nome.includes('gravatas') ||
    nome.includes('gravata borboleta') ||
    nome.includes('suspensorio') ||
    nome.includes('suspensorios') ||
    nome.includes('chapeu') ||
    nome.includes('chapeus') ||
    nome.includes('bone') ||
    nome.includes('bones') ||
    nome.includes('boina') ||
    nome.includes('boinas') ||
    nome.includes('viseira') ||
    nome.includes('viseiras') ||
    nome.includes('lenço') ||
    nome.includes('lenco') ||
    nome.includes('lenços') ||
    nome.includes('lencos') ||
    nome.includes('bandana') ||
    nome.includes('bandanas') ||
    nome.includes('cachecol') ||
    nome.includes('cachecois') ||
    nome.includes('luva') ||
    nome.includes('luvas') ||
    nome.includes('protetor de ouvido') ||
    nome.includes('tiara') ||
    nome.includes('tiaras') ||
    nome.includes('presilha') ||
    nome.includes('presilhas') ||
    nome.includes('elastico de cabelo') ||
    nome.includes('elastico para cabelo') ||
    nome.includes('scrunchie') ||
    nome.includes('faixa de cabelo') ||
    nome.includes('faixa para cabelo') ||
    nome.includes('colar') ||
    nome.includes('colares') ||
    nome.includes('corrente') ||
    nome.includes('correntes') ||
    nome.includes('pulseira') ||
    nome.includes('pulseiras') ||
    nome.includes('bracelete') ||
    nome.includes('braceletes') ||
    nome.includes('anel') ||
    nome.includes('aneis') ||
    nome.includes('brinco') ||
    nome.includes('brincos') ||
    nome.includes('argola') ||
    nome.includes('argolas') ||
    nome.includes('piercing') ||
    nome.includes('broche') ||
    nome.includes('broches') ||
    nome.includes('chaveiro') ||
    nome.includes('chaveiros') ||
    nome.includes('porta chaves') ||
    nome.includes('porta chave') ||
    nome.includes('necessaire') ||
    nome.includes('necessaires') ||
    nome.includes('porta documentos') ||
    nome.includes('porta documento') ||
    nome.includes('porta cartao') ||
    nome.includes('porta passaporte')
  ) {
    categorias.push('outros-acessorios');
    categorias.push('acessorios-categoria');
  }
  return [...new Set(categorias)];
}
function transformarProdutosMarketplace(produtos) {
  const produtosTransformado = [];
  for (let i = 0; i < produtos.length; i++) {
    let precoSemDesconto;
    if (produtos[i].priceDiscountRate > 0) {
      precoSemDesconto = Number(
        (
          Number(produtos[i].price) /
          (1 - produtos[i].priceDiscountRate / 100)
        ).toFixed(2),
      );
    } else {
      precoSemDesconto = Number(produtos[i].price);
    }
    const categorias = classificarCategorias(produtos[i].productName);
    const novoProduto = {
      idmarketplace: produtos[i].itemId,
      nome: produtos[i].productName,
      imagem: produtos[i].imageUrl,
      precoComDesconto: Number(produtos[i].price),
      link: produtos[i].offerLink,
      desconto: produtos[i].priceDiscountRate,
      precoSemDesconto: precoSemDesconto,
      categorias: categorias,
    };
    produtosTransformado.push(novoProduto);
  }
  return produtosTransformado;
}
async function executarAutomacao() {
  try {
    console.log('\n====================================');
    console.log('AUTOMAÇÃO BOMBANET');
    console.log('====================================\n');
    console.log('Consultando produtos da Shopee...\n');
    const produtosShopee =
  await buscarTodosProdutosShopee();
    console.log(
      `\nTotal recebido da Shopee: ${produtosShopee.length}`,
    );
    const objeto = lerProdutos();
    console.log(
      `Produtos atualmente no JSON: ${objeto.length}`,
    );
    sincronizarProdutos(
      objeto,
      produtosShopee,
    );
    salvarProdutos(objeto);
    console.log(
      `Produtos salvos no JSON: ${objeto.length}`,
    );
    console.log('\n====================================');
    console.log('AUTOMAÇÃO CONCLUÍDA COM SUCESSO');
    console.log('====================================\n');
  } catch (erro) {
    console.error('\n====================================');
    console.error('ERRO NA AUTOMAÇÃO');
    console.error('====================================');
    console.error(erro);
  }
}
executarAutomacao();