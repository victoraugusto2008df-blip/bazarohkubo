// =====================================================================
//  api/atendentes.js — Equipe de atendimento (somente admin)
//  GET → lista de atendentes  ·  PUT → salva a lista completa
//  Usada pelo painel para atribuir um responsável a cada pedido e
//  assinar as mensagens de WhatsApp enviadas pela loja.
// =====================================================================

const S = require('../lib/seguranca');
const K = 'bz:atendentes';

module.exports = async (req, res) => {
  if (!S.cors(req, res)) return;
  if (!S.kvPronto()) return res.status(500).json({ erro: 'Banco não configurado (Vercel KV / Upstash). Veja ADMIN.md.' });
  if (!(await S.limita(req, res, 'att', 30, 60))) return;
  if (!(await S.autorizaAdmin(req, res))) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json((await S.kvGet(K)) || []);
    }

    if (req.method === 'PUT') {
      const lista = [...new Set(
        (Array.isArray(req.body && req.body.lista) ? req.body.lista : [])
          .map(n => S.limpaTexto(n, 60))
          .filter(Boolean)
      )].slice(0, 20);
      await S.kvSet(K, lista);
      return res.status(200).json(lista);
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
};
