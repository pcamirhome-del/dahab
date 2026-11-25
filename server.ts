import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchLiveNewsFromUpstream,
  fetchLiveRatesFromUpstream,
} from './api/live-rates.ts';
import type { MarketDataSnapshot, MarketNewsItem } from './src/types/market.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

let cachedSnapshot: MarketDataSnapshot | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 8_000;

let cachedNews: MarketNewsItem[] | null = null;
let newsCacheTimestamp = 0;
const NEWS_CACHE_TTL_MS = 120_000;

async function handleLiveNews(_req: express.Request, res: express.Response): Promise<void> {
  try {
    const now = Date.now();
    if (cachedNews && now - newsCacheTimestamp < NEWS_CACHE_TTL_MS) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      res.json({ items: cachedNews, fetchedAt: newsCacheTimestamp });
      return;
    }
    const items = await fetchLiveNewsFromUpstream();
    cachedNews = items;
    newsCacheTimestamp = Date.now();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.json({ items, fetchedAt: newsCacheTimestamp });
  } catch (error) {
    if (cachedNews) {
      res.json({ items: cachedNews, fetchedAt: newsCacheTimestamp });
      return;
    }
    res.status(503).json({
      error: 'تعذر جلب أخبار السوق المباشرة حالياً.',
      details: error instanceof Error ? error.message : 'News RSS error',
    });
  }
}

async function handleLiveRates(req: express.Request, res: express.Response): Promise<void> {
  if (req.query.news === '1') {
    await handleLiveNews(req, res);
    return;
  }

  try {
    const force = req.query.force === '1';
    const hasBust = typeof req.query._t === 'string';
    const now = Date.now();

    if (!force && cachedSnapshot && now - cacheTimestamp < CACHE_TTL_MS) {
      res.setHeader('Cache-Control', hasBust ? 'no-store' : 's-maxage=8, stale-while-revalidate=15');
      res.json({ ...cachedSnapshot, latencyMs: 1 });
      return;
    }

    const fresh = await fetchLiveRatesFromUpstream();
    cachedSnapshot = fresh;
    cacheTimestamp = Date.now();

    res.setHeader(
      'Cache-Control',
      force || hasBust ? 'no-store' : 's-maxage=8, stale-while-revalidate=15'
    );
    res.json(fresh);
  } catch (error) {
    if (cachedSnapshot) {
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ...cachedSnapshot, isFallback: true });
      return;
    }
    res.status(503).json({
      error: 'تعذر جلب الأسعار المباشرة حالياً، يرجى المحاولة مرة أخرى.',
      details: error instanceof Error ? error.message : 'Upstream error',
    });
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get('/api/live-rates', handleLiveRates);
  app.get('/api/market-data', handleLiveRates);
  app.get('/api/market-news', handleLiveNews);

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`eDahab server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
