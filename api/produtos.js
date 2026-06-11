// =====================================================================
//  api/produtos.js — Catálogo de produtos (Vercel KV / Upstash Redis)
//  GET    → público: lista produtos ativos (com chave de admin: lista tudo)
//  POST   → admin: cadastra produto
//  PUT    → admin: edita produto (estoque, preço, ativo, etc.)
//  DELETE → admin: remove produto
//  Auth admin: header  x-admin-key  ===  process.env.ADMIN_SENHA
// =====================================================================

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const K = 'bz:produtos';

async function kvGet(k) {
  const r = await fetch(`${KV_URL}/get/${k}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}
async function kvSet(k, v) {
  await fetch(`${KV_URL}/set/${k}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(v),
  });
}
const isAdmin = req => !!process.env.ADMIN_SENHA && req.headers['x-admin-key'] === process.env.ADMIN_SENHA;

// Catálogo inicial — gravado no banco na primeira chamada (depois, o painel manda)
const SEED = [
  { id:'serum',nome:'Sérum Facial Iluminador',cat:'Skincare',preco:49.90,estoque:14,tag:'Novo',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="36" y="8" width="28" height="18" rx="3" fill="#8C6B1E"/><rect x="30" y="26" width="40" height="100" rx="8" fill="url(#gradOuro)"/><rect x="38" y="48" width="24" height="42" rx="3" fill="#070503" opacity=".35"/></svg>'},
  { id:'argola',nome:'Brinco Argola Dourada',cat:'Bijouterias',preco:24.90,estoque:20,sufixo:'o par',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><circle cx="50" cy="55" r="30" stroke="url(#gradOuro)" stroke-width="5"/><circle cx="50" cy="98" r="9" fill="#F0CE6B"/><path d="M50 25 v-12" stroke="#D4A437" stroke-width="4" stroke-linecap="round"/></svg>'},
  { id:'perfume',nome:'Eau de Parfum Âmbar 50ml',cat:'Perfumaria',preco:89.90,estoque:9,tag:'Mais vendido',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="10" width="20" height="14" rx="2" fill="#8C6B1E"/><path d="M32 32 h36 l6 24 v60 a8 8 0 0 1 -8 8 h-32 a8 8 0 0 1 -8 -8 v-60 z" fill="url(#gradOuro)"/><circle cx="50" cy="78" r="14" fill="#070503" opacity=".3"/></svg>'},
  { id:'paleta',nome:'Paleta de Sombras Sunset',cat:'Maquiagem',preco:54.90,estoque:7,tag:'Novo',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="14" y="36" width="72" height="68" rx="8" stroke="url(#gradOuro)" stroke-width="4"/><circle cx="34" cy="58" r="8" fill="#F0CE6B"/><circle cx="58" cy="58" r="8" fill="#D4A437"/><circle cx="34" cy="82" r="8" fill="#8C6B1E"/><circle cx="58" cy="82" r="8" fill="#F0CE6B" opacity=".6"/></svg>'},
  { id:'batom',nome:'Batom Matte Ruby',cat:'Maquiagem',preco:19.90,estoque:25,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="38" y="64" width="24" height="58" rx="4" fill="url(#gradOuro)"/><rect x="42" y="50" width="16" height="16" fill="#8C6B1E"/><path d="M42 50 v-22 a8 8 0 0 1 16 0 l0 22 z" fill="#F0CE6B"/></svg>'},
  { id:'colar',nome:'Colar Pingente Coração',cat:'Bijouterias',preco:34.90,estoque:11,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 18 c-26 14 -30 44 0 58 c30 -14 26 -44 0 -58z" stroke="url(#gradOuro)" stroke-width="5" fill="none"/><path d="M50 76 v34" stroke="#D4A437" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="118" r="6" fill="#F0CE6B"/></svg>'},
  { id:'base',nome:'Base Líquida HD',cat:'Maquiagem',preco:39.90,estoque:10,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="44" y="10" width="24" height="8" rx="3" fill="#8C6B1E"/><rect x="44" y="18" width="12" height="18" fill="#8C6B1E"/><rect x="36" y="36" width="28" height="88" rx="7" fill="url(#gradOuro)"/></svg>'},
  { id:'protetor',nome:'Protetor Solar Facial FPS50',cat:'Skincare',preco:44.90,estoque:16,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="12" width="20" height="14" rx="3" fill="#8C6B1E"/><rect x="32" y="26" width="36" height="98" rx="7" fill="url(#gradOuro)"/><circle cx="50" cy="58" r="9" fill="#070503" opacity=".3"/><path d="M50 44v-5M50 72v5M63 58h5M37 58h-5" stroke="#070503" opacity=".3" stroke-width="3" stroke-linecap="round"/></svg>'},
  { id:'conjunto',nome:'Conjunto Colar e Brincos',cat:'Bijouterias',preco:49.90,estoque:6,tag:'Kit',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M22 34q28 34 56 0" stroke="url(#gradOuro)" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="50" cy="56" r="7" fill="#F0CE6B"/><path d="M34 84v5M66 84v5" stroke="#D4A437" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="99" r="9" stroke="#D4A437" stroke-width="4"/><circle cx="66" cy="99" r="9" stroke="#D4A437" stroke-width="4"/></svg>'},
  { id:'gloss',nome:'Gloss Labial Mel',cat:'Maquiagem',preco:16.90,estoque:18,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 10v10" stroke="#D4A437" stroke-width="4" stroke-linecap="round"/><rect x="45" y="20" width="10" height="20" rx="4" fill="#8C6B1E"/><rect x="41" y="40" width="18" height="84" rx="7" fill="url(#gradOuro)"/></svg>'},
  { id:'rimel',nome:'Máscara de Cílios Volume',cat:'Maquiagem',preco:27.90,estoque:3,tag:'Mais vendido',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="44" y="10" width="12" height="36" rx="4" fill="#8C6B1E"/><path d="M46 18h8M46 26h8M46 34h8" stroke="#F0CE6B" stroke-width="2"/><path d="M50 46v10" stroke="#D4A437" stroke-width="3"/><rect x="40" y="56" width="20" height="68" rx="6" fill="url(#gradOuro)"/></svg>'},
  { id:'blush',nome:'Blush Compacto Rosé',cat:'Maquiagem',preco:24.90,estoque:12,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><circle cx="50" cy="64" r="34" stroke="url(#gradOuro)" stroke-width="5"/><circle cx="50" cy="64" r="19" fill="#F0CE6B" opacity=".9"/><rect x="36" y="100" width="28" height="7" rx="3.5" fill="#8C6B1E"/></svg>'},
  { id:'pulseira',nome:'Pulseira Elos Dourados',cat:'Bijouterias',preco:29.90,estoque:15,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><circle cx="50" cy="70" r="34" stroke="url(#gradOuro)" stroke-width="5" stroke-dasharray="14 9" stroke-linecap="round"/><circle cx="50" cy="36" r="6" fill="#F0CE6B"/></svg>'},
  { id:'micelar',nome:'Água Micelar 400ml',cat:'Skincare',preco:29.90,estoque:8,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="42" y="10" width="16" height="16" rx="3" fill="#8C6B1E"/><rect x="32" y="26" width="36" height="100" rx="8" fill="url(#gradOuro)"/><rect x="38" y="56" width="24" height="36" rx="3" fill="#070503" opacity=".3"/></svg>'},
  { id:'anel',nome:'Anel Ajustável Cristal',cat:'Bijouterias',preco:17.90,estoque:22,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 28l13 15-13 15-13-15z" fill="#F0CE6B"/><circle cx="50" cy="86" r="26" stroke="url(#gradOuro)" stroke-width="6"/></svg>'},
  { id:'bodysplash',nome:'Body Splash Vanilla',cat:'Perfumaria',preco:36.90,estoque:13,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="26" width="20" height="16" rx="3" fill="#8C6B1E"/><path d="M64 26l9-6M66 34l11-2M60 20l5-9" stroke="#D4A437" stroke-width="3" stroke-linecap="round"/><rect x="34" y="42" width="32" height="82" rx="9" fill="url(#gradOuro)"/></svg>'},
  { id:'vitc',nome:'Hidratante Facial Vitamina C',cat:'Skincare',preco:38.90,estoque:2,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="44" y="6" width="12" height="22" rx="3" fill="#8C6B1E"/><path d="M44 28h12l8 16v66a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8V44z" fill="url(#gradOuro)"/><circle cx="50" cy="82" r="9" fill="#070503" opacity=".3"/></svg>'},
  { id:'perola',nome:'Brinco Pérola Clássico',cat:'Bijouterias',preco:21.90,estoque:17,sufixo:'o par',ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 16c11 3 11 16 0 18" stroke="#D4A437" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="50" cy="82" r="27" fill="url(#gradOuro)"/><circle cx="41" cy="73" r="6" fill="#F5EDDB" opacity=".75"/></svg>'},
  { id:'mascara',nome:'Máscara Capilar Nutrição',cat:'Cabelos',preco:32.90,estoque:9,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="26" y="44" width="48" height="50" rx="10" fill="url(#gradOuro)"/><rect x="24" y="30" width="52" height="14" rx="4" fill="#8C6B1E"/><ellipse cx="50" cy="70" rx="14" ry="10" fill="#070503" opacity=".25"/></svg>'},
  { id:'oleo',nome:'Óleo Reparador de Pontas',cat:'Cabelos',preco:26.90,estoque:14,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="6" width="20" height="8" rx="3" fill="#8C6B1E"/><rect x="46" y="14" width="8" height="18" fill="#8C6B1E"/><path d="M50 32c-15 9-21 20-21 36a21 21 0 0 0 42 0c0-16-6-27-21-36z" fill="url(#gradOuro)"/></svg>'},
  { id:'leavein',nome:'Leave-in Protetor Térmico',cat:'Cabelos',preco:28.90,estoque:5,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M42 40V28h11l9 7v5z" fill="#8C6B1E"/><path d="M65 30l9-4M64 21l7-8" stroke="#D4A437" stroke-width="3" stroke-linecap="round"/><rect x="38" y="40" width="24" height="84" rx="7" fill="url(#gradOuro)"/></svg>'},
  { id:'pinceis',nome:'Kit 5 Pincéis de Maquiagem',cat:'Acessórios',preco:39.90,estoque:4,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none" stroke-linecap="round"><path d="M36 124V74" stroke="url(#gradOuro)" stroke-width="10"/><rect x="30" y="58" width="12" height="16" fill="#8C6B1E"/><path d="M30 58l6-24 6 24z" fill="#F0CE6B"/><path d="M64 124V82" stroke="url(#gradOuro)" stroke-width="10"/><rect x="58" y="66" width="12" height="16" fill="#8C6B1E"/><path d="M58 66l6-20 6 20z" fill="#F0CE6B"/></svg>'},
  { id:'necessaire',nome:'Nécessaire Glam',cat:'Acessórios',preco:34.90,estoque:10,ativo:true,
    svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="18" y="46" width="64" height="58" rx="13" stroke="url(#gradOuro)" stroke-width="5"/><path d="M18 64h64" stroke="#D4A437" stroke-width="4"/><circle cx="68" cy="64" r="4" fill="#F0CE6B"/><path d="M68 68v7" stroke="#F0CE6B" stroke-width="3" stroke-linecap="round"/></svg>'},
];

async function carrega() {
  let prods = await kvGet(K);
  if (!Array.isArray(prods)) { prods = SEED; await kvSet(K, prods); }
  return prods;
}
const limpa = (b = {}) => ({
  nome: String(b.nome || '').slice(0, 120),
  cat: String(b.cat || 'Outros').slice(0, 40),
  preco: Math.max(0, +(+b.preco || 0).toFixed(2)),
  estoque: Math.max(0, Math.floor(+b.estoque || 0)),
  tag: String(b.tag || '').slice(0, 30),
  sufixo: String(b.sufixo || '').slice(0, 30),
  svg: String(b.svg || '').slice(0, 4000),
  ativo: b.ativo !== false,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // produção: troque pelo domínio do site
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ erro: 'Banco não configurado (Vercel KV / Upstash). Veja ADMIN.md.' });

  try {
    const prods = await carrega();

    if (req.method === 'GET') {
      return res.status(200).json(isAdmin(req) ? prods : prods.filter(p => p.ativo !== false));
    }

    if (!isAdmin(req)) return res.status(401).json({ erro: 'Não autorizado.' });
    const b = req.body || {};

    if (req.method === 'POST') {
      if (!b.nome || !(+b.preco > 0)) return res.status(400).json({ erro: 'Nome e preço são obrigatórios.' });
      const novo = { id: b.id || 'p' + Date.now().toString(36), ...limpa(b) };
      prods.push(novo);
      await kvSet(K, prods);
      return res.status(201).json(novo);
    }

    if (req.method === 'PUT') {
      const i = prods.findIndex(p => p.id === b.id);
      if (i < 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
      const atual = prods[i];
      const campos = ['nome','cat','preco','estoque','tag','sufixo','svg','ativo'];
      const parciais = {};
      campos.forEach(c => { if (b[c] !== undefined) parciais[c] = c==='ativo' ? b[c]!==false : limpa({ ...atual, [c]: b[c] })[c]; });
      prods[i] = { ...atual, ...parciais };
      await kvSet(K, prods);
      return res.status(200).json(prods[i]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || b.id;
      const novaLista = prods.filter(p => p.id !== id);
      if (novaLista.length === prods.length) return res.status(404).json({ erro: 'Produto não encontrado.' });
      await kvSet(K, novaLista);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
};
