// =====================================================================
//  api/pedidos.js — Área de Pedidos (Vercel KV / Upstash Redis)
//  POST → público: registra um pedido vindo do checkout (baixa o estoque)
//  GET  → admin: lista todos os pedidos
//  PUT  → admin: atualiza o status de um pedido
//  Auth admin: header  x-admin-key  ===  process.env.ADMIN_SENHA
// =====================================================================

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const K = 'bz:pedidos';
const KP = 'bz:produtos';
const STATUS = ['novo', 'aguardando-pagamento', 'confirmado', 'entregue', 'cancelado'];

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // produção: troque pelo domínio do site
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ erro: 'Banco não configurado (Vercel KV / Upstash). Veja ADMIN.md.' });

  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const itens = (Array.isArray(b.itens) ? b.itens : [])
        .filter(i => i && i.id && +i.qty > 0)
        .map(i => ({
          id: String(i.id).slice(0, 40),
          nome: String(i.nome || '').slice(0, 120),
          qty: Math.min(99, Math.floor(+i.qty)),
          preco: Math.max(0, +(+i.preco || 0).toFixed(2)),
        }));
      const nome = String((b.cliente && b.cliente.nome) || '').slice(0, 120).trim();
      if (!itens.length || !nome) return res.status(400).json({ erro: 'Pedido inválido.' });

      const pedido = {
        numero: 'BZ-' + Date.now().toString(36).toUpperCase(),
        criadoEm: new Date().toISOString(),
        cliente: { nome, fone: String((b.cliente && b.cliente.fone) || '').slice(0, 25) },
        entrega: b.entrega === 'entrega' ? 'entrega' : 'retirada',
        endereco: String(b.endereco || '').slice(0, 300),
        pagamento: String(b.pagamento || '').slice(0, 160),
        itens,
        total: Math.max(0, +(+b.total || itens.reduce((s, i) => s + i.preco * i.qty, 0)).toFixed(2)),
        status: /aguardando/i.test(String(b.pagamento || '')) ? 'aguardando-pagamento' : 'novo',
      };

      const pedidos = (await kvGet(K)) || [];
      pedidos.unshift(pedido);
      await kvSet(K, pedidos.slice(0, 500));

      // baixa de estoque
      const prods = await kvGet(KP);
      if (Array.isArray(prods)) {
        for (const it of itens) {
          const p = prods.find(x => x.id === it.id);
          if (p && typeof p.estoque === 'number') p.estoque = Math.max(0, p.estoque - it.qty);
        }
        await kvSet(KP, prods);
      }
      return res.status(201).json({ numero: pedido.numero });
    }

    if (!isAdmin(req)) return res.status(401).json({ erro: 'Não autorizado.' });

    if (req.method === 'GET') {
      return res.status(200).json((await kvGet(K)) || []);
    }

    if (req.method === 'PUT') {
      const { numero, status } = req.body || {};
      if (!STATUS.includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
      const pedidos = (await kvGet(K)) || [];
      const p = pedidos.find(x => x.numero === numero);
      if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
      p.status = status;
      p.atualizadoEm = new Date().toISOString();
      await kvSet(K, pedidos);
      return res.status(200).json(p);
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
};
