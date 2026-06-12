// =====================================================================
//  api/pedidos.js — Área de Pedidos (Vercel KV / Upstash Redis)
//  POST → público: registra um pedido vindo do checkout (baixa o estoque)
//  GET  → admin: lista todos os pedidos
//  PUT  → admin: atualiza o status de um pedido
//  Auth admin: header  x-admin-key  ===  process.env.ADMIN_SENHA
// =====================================================================

const S = require('../lib/seguranca');
const K = 'bz:pedidos';
const KP = 'bz:produtos';
const STATUS = ['novo', 'confirmado', 'entregue', 'cancelado'];

module.exports = async (req, res) => {
  if (!S.cors(req, res)) return;
  if (!S.kvPronto()) return res.status(500).json({ erro: 'Banco não configurado (Vercel KV / Upstash). Veja ADMIN.md.' });

  try {
    if (req.method === 'POST') {
      // anti-spam: no máximo 6 pedidos por minuto por IP
      if (!(await S.limita(req, res, 'ped', 6, 60))) return;
      const b = req.body || {};
      const itens = (Array.isArray(b.itens) ? b.itens : [])
        .filter(i => i && i.id && +i.qty > 0)
        .map(i => ({
          id: S.limpaTexto(i.id, 40),
          nome: S.limpaTexto(i.nome, 120),
          qty: Math.min(99, Math.floor(+i.qty)),
          preco: Math.max(0, +(+i.preco || 0).toFixed(2)),
        }));
      const nome = S.limpaTexto(b.cliente && b.cliente.nome, 120);
      if (!itens.length || !nome) return res.status(400).json({ erro: 'Pedido inválido.' });

      const pedido = {
        numero: 'BZ-' + Date.now().toString(36).toUpperCase(),
        criadoEm: new Date().toISOString(),
        cliente: { nome, fone: S.limpaTexto(b.cliente && b.cliente.fone, 25) },
        entrega: b.entrega === 'entrega' ? 'entrega' : 'retirada',
        endereco: S.limpaTexto(b.endereco, 300),
        pagamento: S.limpaTexto(b.pagamento, 160),
        itens,
        total: +itens.reduce((s, i) => s + i.preco * i.qty, 0).toFixed(2), // sempre recalculado no servidor
        status: 'novo',
      };

      const pedidos = (await S.kvGet(K)) || [];
      pedidos.unshift(pedido);
      await S.kvSet(K, pedidos.slice(0, 500));

      // baixa de estoque
      const prods = await S.kvGet(KP);
      if (Array.isArray(prods)) {
        for (const it of itens) {
          const p = prods.find(x => x.id === it.id);
          if (p && typeof p.estoque === 'number') p.estoque = Math.max(0, p.estoque - it.qty);
        }
        await S.kvSet(KP, prods);
      }
      return res.status(201).json({ numero: pedido.numero });
    }

    if (!(await S.autorizaAdmin(req, res))) return;

    if (req.method === 'GET') {
      return res.status(200).json((await S.kvGet(K)) || []);
    }

    if (req.method === 'PUT') {
      const { numero, status, atendente } = req.body || {};
      if (status !== undefined && !STATUS.includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
      if (status === undefined && atendente === undefined) return res.status(400).json({ erro: 'Nada para atualizar.' });
      const pedidos = (await S.kvGet(K)) || [];
      const p = pedidos.find(x => x.numero === numero);
      if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
      if (status !== undefined) p.status = status;
      if (atendente !== undefined) p.atendente = S.limpaTexto(atendente, 60);
      p.atualizadoEm = new Date().toISOString();
      await S.kvSet(K, pedidos);
      return res.status(200).json(p);
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
};
