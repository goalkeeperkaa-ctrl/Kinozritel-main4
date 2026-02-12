import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const DEFAULT_USERS = [
  {
    username: 'tatyana',
    password: 'admin12345',
    role: 'admin',
    displayName: 'Татьяна',
  },
];

const JWT_SECRET = process.env.JWT_SECRET || 'kinozritel-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

const normalizeUser = (user) => ({
  username: user.username.trim(),
  password: user.password,
  role: user.role === 'viewer' ? 'viewer' : 'admin',
  displayName: user.displayName?.trim() || user.username.trim(),
});

export const getUsers = () => {
  const raw = process.env.ADMIN_USERS;
  if (!raw) {
    return DEFAULT_USERS;
  }

  const parsed = raw
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [username = '', password = '', role = 'admin', displayName = ''] = segment.split(':');
      return normalizeUser({ username, password, role, displayName });
    })
    .filter((user) => user.username && user.password);

  return parsed.length > 0 ? parsed : DEFAULT_USERS;
};

const safeEquals = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
};

export const validateCredentials = (username, password) => {
  const user = getUsers().find((item) => item.username === String(username).trim());
  if (!user) {
    return null;
  }

  if (!safeEquals(user.password, password)) {
    return null;
  }

  return user;
};

export const issueToken = (user) =>
  jwt.sign(
    {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  next();
};
