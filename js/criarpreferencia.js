// =====================================================================
//  api/criar-preferencia.js — Mercado Pago Checkout Pro
//  Cria a preferência de pagamento validando preço e ESTOQUE no servidor.
//  Catálogo oficial: banco (bz:produtos). Fallback: tabela embutida.
//  Env obrigatória: MP_ACCESS_TOKEN. Banco: KV_REST_API_URL/TOKEN.
// =====================================================================

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const FALLBACK = {
  serum:{nome:'Sérum Facial Iluminador',preco:49.90}, argola:{nome:'Brinco Argola Dourada',preco:24.90},
  perfume:{nome:'Eau de Parfum Âmbar 50ml',preco:89.90}, paleta:{nome:'Paleta de Sombras Sunset',preco:54.90},
  batom:{nome:'Batom Matte Ruby',preco:19.90}, colar:{nome:'Colar Pingente Coração',preco:34.90},
  base:{nome:'Base Líquida HD',preco:39.90}, protetor:{nome:'Protetor Solar Facial FPS50',preco:44.90},
  conjunto:{nome:'Conjunto Colar e Brincos',preco:49.90}, gloss:{nome:'Gloss Labial Mel',preco:16.90},
  rimel:{nome:'Máscara de Cílios Volume',preco:27.90}, blush:{nome:'Blush Compacto Rosé',preco:24.90},
  pulseira:{nome:'Pulseira Elos Dourados',preco:29.90}, micelar:{nome:'Água Micelar 400ml',preco:29.90},
  anel:{nome:'Anel Ajustável Cristal',preco:17.90}, bodysplash:{nome:'Body Splash Vanilla',preco:36.90},
  vitc:{nome:'Hidratante Facial Vitamina C',preco:38.90}, perola:{nome:'Brinco Pérola Clássico',preco:21.90},
  mascara:{nome:'Máscara Capilar Nutrição',preco:32.90}, oleo:{nome:'Óleo Reparador de Pontas',preco:26.90},
  leavein:{nome:'Leave-in Protetor Térmico',preco:28.90}, pinceis:{nome:'Kit 5 Pincéis de Maquiagem',preco:39.90},
  necessaire:{nome:'Nécessaire Glam',preco:34.90},
};
const MAX_PARCELAS = 6;

async function carregaCatalogo() {
  if (KV_URL && KV_TOKEN) {
    try {
      const r = await fetch(`${KV_URL}/get/bz:produtos`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
      const d = await r.json();
      const prods = d.result ? JSON.parse(d.result) : null;
      if (Array.isArray(prods)) return Object.fromEntries(prods.map(p => [p.id, p]));
    } catch (e) { /* cai no fallback */ }
  }
  return FALLBACK;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // produção: troque pelo domínio do site
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ erro: 'Use POST.' });
  if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado na Vercel.' });

  try {
    const { itens = [], cliente = {}, entrega = 'retirada', endereco = '' } = req.body || {};
    const catalogo = await carregaCatalogo();

    const items = [];
    for (const i of itens) {
      const c = catalogo[i.id];
      const qty = Math.min(99, Math.floor(+i.qty || 0));
      if (!c || c.ativo === false || qty <= 0) continue;
      if (typeof c.estoque === 'number' && c.estoque < qty) {
        return res.status(409).json({ erro: `Sem estoque suficiente de "${c.nome}". Disponível: ${c.estoque}.` });
      }
      items.push({ id: i.id, title: c.nome, quantity: qty, unit_price: c.preco, currency_id: 'BRL' });
    }
    if (!items.length) return res.status(400).json({ erro: 'Carrinho vazio ou inválido.' });

    const origem = req.headers.origin || `https://${req.headers.host}`;
    const preferencia = {
      items,
      payer: {
        name: String(cliente.nome || '').slice(0, 120),
        phone: { number: String(cliente.fone || '').replace(/\D/g, '').slice(0, 15) },
      },
      back_urls: {
        success: `${origem}/?pagamento=sucesso`,
        failure: `${origem}/?pagamento=erro`,
        pending: `${origem}/?pagamento=pendente`,
      },
      auto_return: 'approved',
      payment_methods: { installments: MAX_PARCELAS, excluded_payment_types: [{ id: 'ticket' }] },
      statement_descriptor: 'BAZAR OHKUBO',
      external_reference: `SITE-${Date.now()}`,
      metadata: { entrega, endereco: String(endereco).slice(0, 300) },
    };

    const resposta = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify(preferencia),
    });
    const data = await resposta.json();
    if (!resposta.ok) {
      console.error('Mercado Pago recusou:', data);
      return res.status(502).json({ erro: 'Falha ao criar a preferência no Mercado Pago.' });
    }
    return res.status(200).json({ id: data.id, init_point: data.init_point });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno ao criar o pagamento.' });
  }
};
