import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPLICATION_STATUSES = [
  'New',
  'In review',
  'Contacted',
  'No answer',
  'Interview scheduled',
  'Interview passed',
  'Training',
  'Exam scheduled',
  'Approved',
  'Rejected',
  'Reserve',
];

export const REJECT_REASONS = [
  'No motivation',
  'Low communication skills',
  'No availability',
  'No required device',
  'Age under 18',
  'Other',
];

export const DEFAULT_ASSIGNEE = process.env.DEFAULT_ASSIGNEE || 'Татьяна';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataFile = process.env.VERCEL
  ? path.join('/tmp', 'kinozritel-applications.json')
  : path.join(__dirname, 'data', 'applications.json');
export const DATA_FILE =
  process.env.DATA_FILE || defaultDataFile;
