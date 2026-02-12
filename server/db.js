import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { DATA_FILE, DEFAULT_ASSIGNEE, APPLICATION_STATUSES } from './constants.js';

const EMPTY_DB = {
  applications: [],
};

const DATABASE_URL = process.env.DATABASE_URL || '';
const USE_POSTGRES = Boolean(DATABASE_URL);

const pgPool = USE_POSTGRES
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    })
  : null;

let pgInitPromise = null;

const normalizeDbShape = (candidate) => {
  if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.applications)) {
    return { ...EMPTY_DB };
  }

  return {
    applications: Array.isArray(candidate.applications) ? candidate.applications : [],
  };
};

const ensurePgDb = async () => {
  if (!USE_POSTGRES || !pgPool) {
    return;
  }

  if (pgInitPromise) {
    await pgInitPromise;
    return;
  }

  pgInitPromise = (async () => {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_state (
          id SMALLINT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(
        `INSERT INTO app_state (id, payload) VALUES (1, $1::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(EMPTY_DB)],
      );
    } finally {
      client.release();
    }
  })();

  await pgInitPromise;
};

const ensureFileDb = async () => {
  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2), 'utf-8');
  }
};

const readFileDb = async () => {
  await ensureFileDb();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const normalizedRaw = raw.replace(/^\uFEFF/, '');

  try {
    const parsed = JSON.parse(normalizedRaw);
    return normalizeDbShape(parsed);
  } catch {
    return { ...EMPTY_DB };
  }
};

const writeFileDb = async (db) => {
  await ensureFileDb();
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
};

const readPgDb = async () => {
  await ensurePgDb();
  if (!pgPool) {
    return { ...EMPTY_DB };
  }

  const result = await pgPool.query('SELECT payload FROM app_state WHERE id = 1');
  const payload = result.rows[0]?.payload;
  return normalizeDbShape(payload);
};

const readDb = async () => {
  if (USE_POSTGRES) {
    return readPgDb();
  }
  return readFileDb();
};

const withMutation = async (mutator) => {
  if (!USE_POSTGRES) {
    const db = await readFileDb();
    const result = await mutator(db);
    await writeFileDb(db);
    return result;
  }

  await ensurePgDb();
  if (!pgPool) {
    throw new Error('Postgres pool is not initialized.');
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const stateResult = await client.query('SELECT payload FROM app_state WHERE id = 1 FOR UPDATE');
    const db = normalizeDbShape(stateResult.rows[0]?.payload);
    const result = await mutator(db);
    await client.query(
      'UPDATE app_state SET payload = $1::jsonb, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(db)],
    );
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const normalizePhone = (phone = '') => phone.replace(/\D+/g, '');

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeBoolean = (value) => Boolean(value);

const sanitizeQuizAnswers = (value) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => typeof key === 'string')
      .map(([key, answer]) => [key, typeof answer === 'string' ? answer : String(answer ?? '')]),
  );
};

export const mapPublicPayloadToApplication = (payload) => {
  const now = new Date().toISOString();
  const incomingTimestamp = sanitizeString(payload.timestamp);
  const createdAtCandidate = incomingTimestamp ? new Date(incomingTimestamp) : null;
  const createdAt =
    createdAtCandidate && !Number.isNaN(createdAtCandidate.valueOf())
      ? createdAtCandidate.toISOString()
      : now;
  const fullName = sanitizeString(payload.fullName);
  const phone = sanitizeString(payload.phone);
  const normalizedPhone = normalizePhone(phone);

  return {
    id: crypto.randomUUID(),
    created_at: createdAt,
    updated_at: now,
    source_utm: {
      utm_source: sanitizeString(payload.utm_source),
      utm_campaign: sanitizeString(payload.utm_campaign),
      utm_content: sanitizeString(payload.utm_content),
      utm_term: sanitizeString(payload.utm_term),
    },
    step1_confirmed:
      sanitizeBoolean(payload.step1_confirm_schedule)
      && sanitizeBoolean(payload.step1_confirm_methodology)
      && sanitizeBoolean(payload.step1_confirm_audiocontrol),
    step2_video_watched: sanitizeBoolean(payload.step2_watched),
    step2_control_answer: sanitizeString(payload.step2_control_answer),
    quiz_score: null,
    quiz_answers: sanitizeQuizAnswers(payload.quiz_answers),
    full_name: fullName,
    phone,
    normalized_phone: normalizedPhone,
    email: sanitizeString(payload.email),
    city: sanitizeString(payload.city),
    age_18_confirmed: sanitizeBoolean(payload.age18Confirmed),
    comment: sanitizeString(payload.comment),
    status: 'New',
    assigned_to: DEFAULT_ASSIGNEE,
    last_contact_at: null,
    last_contact_type: null,
    contact_attempts: 0,
    notes: '',
    tags: [],
    consent_pd: sanitizeBoolean(payload.consentData),
    consent_contact: sanitizeBoolean(payload.consentContact),
    reject_reason: null,
    reserve_followup_at: null,
    interview_at: null,
    duplicate: false,
    duplicate_of: null,
  };
};

export const getApplications = async () => {
  const db = await readDb();
  return db.applications;
};

export const createApplication = async (application) =>
  withMutation(async (db) => {
    const existingByPhone = db.applications.find(
      (item) => item.normalized_phone && item.normalized_phone === application.normalized_phone,
    );

    const newApplication = {
      ...application,
      duplicate: Boolean(existingByPhone),
      duplicate_of: existingByPhone?.id ?? null,
    };

    db.applications.push(newApplication);
    return newApplication;
  });

const allowedPatchFields = new Set([
  'status',
  'assigned_to',
  'last_contact_at',
  'contact_attempts',
  'notes',
  'tags',
  'reject_reason',
  'reserve_followup_at',
  'interview_at',
]);

export const updateApplication = async (id, patch = {}) =>
  withMutation(async (db) => {
    const index = db.applications.findIndex((item) => item.id === id);

    if (index < 0) {
      return null;
    }

    const current = db.applications[index];
    const next = { ...current };

    for (const [key, value] of Object.entries(patch)) {
      if (!allowedPatchFields.has(key)) {
        continue;
      }

      if (key === 'status') {
        if (typeof value === 'string' && APPLICATION_STATUSES.includes(value)) {
          next.status = value;
        }
        continue;
      }

      if (key === 'contact_attempts') {
        const parsed = Number(value);
        next.contact_attempts = Number.isFinite(parsed) && parsed >= 0
          ? Math.floor(parsed)
          : next.contact_attempts;
        continue;
      }

      if (key === 'tags') {
        next.tags = Array.isArray(value)
          ? value
              .map((item) => sanitizeString(item))
              .filter(Boolean)
          : next.tags;
        continue;
      }

      if (key === 'last_contact_at' || key === 'reserve_followup_at' || key === 'interview_at') {
        next[key] = value ? String(value) : null;
        continue;
      }

      if (key === 'reject_reason') {
        next.reject_reason = value ? sanitizeString(value) : null;
        continue;
      }

      next[key] = sanitizeString(value);
    }

    next.updated_at = new Date().toISOString();
    db.applications[index] = next;
    return next;
  });

export const markContactAttempt = async (id, actionType = 'call') =>
  withMutation(async (db) => {
    const index = db.applications.findIndex((item) => item.id === id);

    if (index < 0) {
      return null;
    }

    const current = db.applications[index];
    const shouldMoveToContacted = ['New', 'In review', 'No answer'].includes(current.status);
    const next = {
      ...current,
      contact_attempts: (current.contact_attempts || 0) + 1,
      last_contact_at: new Date().toISOString(),
      status: shouldMoveToContacted ? 'Contacted' : current.status,
      last_contact_type: actionType,
      updated_at: new Date().toISOString(),
    };

    db.applications[index] = next;
    return next;
  });

export const getApplicationById = async (id) => {
  const applications = await getApplications();
  return applications.find((item) => item.id === id) ?? null;
};

const parseStatuses = (statuses) => {
  if (!statuses) {
    return [];
  }

  if (Array.isArray(statuses)) {
    return statuses.filter((status) => APPLICATION_STATUSES.includes(status));
  }

  if (typeof statuses === 'string') {
    return statuses
      .split(',')
      .map((item) => item.trim())
      .filter((status) => APPLICATION_STATUSES.includes(status));
  }

  return [];
};

export const filterApplications = (applications, filters = {}) => {
  const statusList = parseStatuses(filters.status);
  const city = sanitizeString(filters.city).toLowerCase();
  const source = sanitizeString(filters.source).toLowerCase();
  const query = sanitizeString(filters.q).toLowerCase();
  const dateFrom = filters.date_from ? new Date(String(filters.date_from)) : null;
  const dateTo = filters.date_to ? new Date(String(filters.date_to)) : null;

  const list = applications.filter((item) => {
    if (statusList.length > 0 && !statusList.includes(item.status)) {
      return false;
    }

    if (city && !item.city.toLowerCase().includes(city)) {
      return false;
    }

    if (source && !item.source_utm?.utm_source?.toLowerCase().includes(source)) {
      return false;
    }

    if (query) {
      const name = item.full_name.toLowerCase();
      const phone = item.phone.toLowerCase();
      const normalized = item.normalized_phone.toLowerCase();
      const queryNormalized = normalizePhone(query);
      const normalizedMatch = queryNormalized ? normalized.includes(queryNormalized) : false;
      if (!name.includes(query) && !phone.includes(query) && !normalizedMatch) {
        return false;
      }
    }

    if (dateFrom instanceof Date && !Number.isNaN(dateFrom.valueOf())) {
      const created = new Date(item.created_at);
      if (created < dateFrom) {
        return false;
      }
    }

    if (dateTo instanceof Date && !Number.isNaN(dateTo.valueOf())) {
      const created = new Date(item.created_at);
      const maxDate = new Date(dateTo);
      maxDate.setHours(23, 59, 59, 999);
      if (created > maxDate) {
        return false;
      }
    }

    return true;
  });

  return list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
};

export const buildCounters = (applications) => {
  const counters = {
    New: 0,
    Contacted: 0,
    Approved: 0,
    Rejected: 0,
  };

  for (const item of applications) {
    if (Object.prototype.hasOwnProperty.call(counters, item.status)) {
      counters[item.status] += 1;
    }
  }

  return counters;
};
