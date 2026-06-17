// =====================================================================
//  lib/seguranca.js — Camada de segurança compartilhada das APIs
//  • CORS restrito ao domínio do site (env SITE_URL)
//  • Rate limit por IP (janela fixa via Upstash INCR/EXPIRE)
//  • Autenticação admin com comparação em tempo constante + bloqueio
//    automático por força bruta (8 erros → 15 min)
//  • Sanitização de textos e validação de SVG (anti-XSS armazenado)
//  Este arquivo fica FORA de /api de propósito: não vira endpoint.
// =====================================================================

const crypto = require('crypto');

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const kvPronto = () => !!(KV_URL && KV_TOKEN);

async function kvGet(k) {
  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(k)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}

async function kvSet(k, v) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(k)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(v),
  });
}

// INCR + EXPIRE numa única chamada (pipeline) — base do rate limit
async function kvIncr(k, ttlSeg) {
  const r = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify([['INCR', k], ['EXPIRE', k, ttlSeg, 'NX']]),
  });
  const d = await r.json();
  return Array.isArray(d) && d[0] ? +d[0].result : 0;
}

const pegaIp = req =>
  (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) ||
  (req.socket && req.socket.remoteAddress) || 'desconhecido';

// ---------- Rate limit (falha aberto: nunca derruba a loja se o KV oscilar)
async function limita(req, res, rota, max, janelaSeg) {
  if (!kvPronto()) return true;
  try {
    const ip = pegaIp(req);
    const janela = Math.floor(Date.now() / 1000 / janelaSeg);
    const n = await kvIncr(`bz:rl:${rota}:${ip}:${janela}`, janelaSeg);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - n)));
    if (n > max) {
      res.status(429).json({ erro: 'Muitas requisições. Aguarde um instante e tente de novo.' });
      return false;
    }
  } catch (e) { /* falha aberto */ }
  return true;
}

// ---------- CORS restrito + cabeçalhos de proteção
const origemPermitida = req =>
  (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/+$/, '');

function cors(req, res) {
  const permitida = origemPermitida(req);
  res.setHeader('Access-Control-Allow-Origin', permitida);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  const origem = String(req.headers.origin || '').replace(/\/+$/, '');
  if (origem && origem !== permitida) {
    res.status(403).json({ erro: 'Origem não autorizada.' });
    return false;
  }
  return true;
}

// ---------- Admin: comparação em tempo constante (anti timing attack)
function chaveOk(req) {
  const senha = process.env.ADMIN_SENHA;
  if (!senha) return false;
  const a = crypto.createHash('sha256').update(String(req.headers['x-admin-key'] || '')).digest();
  const b = crypto.createHash('sha256').update(String(senha)).digest();
  return crypto.timingSafeEqual(a, b);
}

// Admin com bloqueio por força bruta: 8 chaves erradas → 15 min de espera
async function autorizaAdmin(req, res) {
  if (!process.env.ADMIN_SENHA) {
    res.status(500).json({ erro: 'ADMIN_SENHA não configurada na Vercel.' });
    return false;
  }
  const trava = `bz:rl:trava:${pegaIp(req)}`;
  try {
    const erros = +(await kvGet(trava)) || 0;
    if (erros >= 8) {
      res.status(429).json({ erro: 'Muitas tentativas de acesso. Aguarde 15 minutos.' });
      return false;
    }
  } catch (e) { /* segue */ }
  if (chaveOk(req)) return true;
  try { await kvIncr(trava, 900); } catch (e) { /* segue */ }
  res.status(401).json({ erro: 'Não autorizado.' });
  return false;
}

// ---------- Sanitização (anti-XSS armazenado)
const limpaTexto = (s, max = 200) =>
  String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

function svgSeguro(s) {
  s = String(s || '').trim();
  if (!s || s.length > 4000) return '';
  if (!/^<svg[\s>]/i.test(s)) return '';
  if (/<script|<iframe|<foreignobject|<image|javascript:|\son\w+\s*=/i.test(s)) return '';
  return s;
}

module.exports = {
  kvPronto, kvGet, kvSet, kvIncr,
  pegaIp, limita, cors,
  chaveOk, autorizaAdmin,
  limpaTexto, svgSeguro,
};
