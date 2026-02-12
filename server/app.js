import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authMiddleware, issueToken, requireAdmin, validateCredentials } from './auth.js';
import { APPLICATION_STATUSES, DEFAULT_ASSIGNEE, REJECT_REASONS } from './constants.js';
import {
  buildCounters,
  createApplication,
  filterApplications,
  getApplicationById,
  getApplications,
  mapPublicPayloadToApplication,
  markContactAttempt,
  updateApplication,
} from './db.js';
import { getExcelWorkbookUrl, mapToExcelRow, syncApplicationToExcel } from './excelSync.js';
import { toCsv } from './csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.resolve(projectRoot, 'dist');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const username = req.body?.username || '';
  const password = req.body?.password || '';
  const user = validateCredentials(username, password);

  if (!user) {
    res.status(401).json({ error: 'Неверный логин или пароль.' });
    return;
  }

  const token = issueToken(user);
  res.json({
    token,
    user: {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      username: req.user.username,
      role: req.user.role,
      displayName: req.user.displayName,
    },
  });
});

app.post('/api/public/applications', async (req, res) => {
  try {
    const payload = req.body || {};
    const mapped = mapPublicPayloadToApplication(payload);

    if (!mapped.full_name || !mapped.phone || !mapped.city || !mapped.age_18_confirmed) {
      res.status(400).json({
        error: 'Поля fullName, phone, city и подтверждение 18+ обязательны.',
      });
      return;
    }

    const created = await createApplication(mapped);
    const excel = await syncApplicationToExcel(created, 'create');

    res.status(201).json({
      id: created.id,
      duplicate: created.duplicate,
      duplicate_of: created.duplicate_of,
      excel,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[api] create application failed', error);
    res.status(500).json({ error: 'Не удалось сохранить заявку.' });
  }
});

app.get('/api/admin/meta', authMiddleware, (_req, res) => {
  res.json({
    statuses: APPLICATION_STATUSES,
    reject_reasons: REJECT_REASONS,
    default_assignee: DEFAULT_ASSIGNEE,
    excel_workbook_url: getExcelWorkbookUrl(),
  });
});

app.get('/api/admin/applications', authMiddleware, async (req, res) => {
  try {
    const all = await getApplications();
    const filtered = filterApplications(all, req.query || {});

    res.json({
      items: filtered,
      total: filtered.length,
      counters: buildCounters(filtered),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[api] list applications failed', error);
    res.status(500).json({ error: 'Не удалось загрузить заявки.' });
  }
});

app.get('/api/admin/applications/:id', authMiddleware, async (req, res) => {
  const item = await getApplicationById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Заявка не найдена.' });
    return;
  }

  res.json(item);
});

app.patch('/api/admin/applications/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updated = await updateApplication(req.params.id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Заявка не найдена.' });
      return;
    }

    const excel = await syncApplicationToExcel(updated, 'update');
    res.json({ item: updated, excel });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[api] update application failed', error);
    res.status(500).json({ error: 'Не удалось обновить заявку.' });
  }
});

app.post('/api/admin/applications/:id/contact', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const action = req.body?.action === 'messaged' ? 'messaged' : 'called';
    const item = await markContactAttempt(req.params.id, action);
    if (!item) {
      res.status(404).json({ error: 'Заявка не найдена.' });
      return;
    }

    const excel = await syncApplicationToExcel(item, 'update');
    res.json({ item, excel });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[api] contact attempt failed', error);
    res.status(500).json({ error: 'Не удалось обновить контакт.' });
  }
});

app.get('/api/admin/export.csv', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const all = await getApplications();
    const filtered = filterApplications(all, req.query || {});
    const rows = filtered.map((item) => mapToExcelRow(item));
    const csv = toCsv(rows);
    const filename = `applications-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[api] export csv failed', error);
    res.status(500).json({ error: 'Не удалось сформировать CSV.' });
  }
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
