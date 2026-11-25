// ============================================================
// Zia-Billing authentication & role-based access
//  - scrypt password hashing (no plain-text passwords stored)
//  - default admin account (admin / admin123, must change on first login)
//  - token sessions, login lockout after repeated failures
//  - admin-only user management (create / edit / reset / disable / delete)
// Mounted BEFORE the legacy routers so these routes take precedence.
// ============================================================
const express = require('express');
const crypto = require('crypto');

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

// Sidebar tabs each role may open. '*' = everything.
const ROLE_TABS = {
  SUPER_ADMIN: '*',
  REGIONAL_MGR: [
    'dashboard', 'pos', 'auto_catalogue', 'sales', 'cash_register', 'returns', 'purchases',
    'suppliers', 'customers', 'vat_201', 'branches', 'reports', 'products', 'inventory',
    'expenses', 'subscriptions'
  ],
  BRANCH_MGR: [
    'dashboard', 'pos', 'auto_catalogue', 'sales', 'cash_register', 'returns', 'purchases',
    'suppliers', 'customers', 'vat_201', 'reports', 'products', 'inventory', 'expenses',
    'subscriptions'
  ],
  CASHIER: ['dashboard', 'pos', 'sales', 'cash_register', 'returns', 'customers'],
  STOREKEEPER: ['dashboard', 'inventory', 'products', 'purchases', 'suppliers', 'auto_catalogue'],
  TECHNICIAN: ['dashboard', 'auto_catalogue', 'inventory']
};
const CUSTOM_ROLE_TABS = ['dashboard'];
const ALL_BRANCH_ROLES = ['SUPER_ADMIN', 'REGIONAL_MGR'];

function tabsForRole(roleKey) {
  return ROLE_TABS[roleKey] || CUSTOM_ROLE_TABS;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function publicUser(u, { includeSecrets = false } = {}) {
  const out = {
    id: u.id,
    name: u.name,
    username: u.username || '',
    role: u.role,
    roleKey: u.roleKey,
    email: u.email || '',
    phone: u.phone || '',
    branchId: u.branchId,
    branchName: u.branchName,
    active: u.active !== false,
    hasPassword: !!u.passwordHash,
    mustChangePassword: !!u.mustChangePassword,
    mfaEnabled: !!u.mfaEnabled
  };
  if (includeSecrets) out.pinCode = u.pinCode;
  return out;
}

function createAuthRouter({ state, persist, logAudit }) {
  const router = express.Router();
  const sessions = new Map(); // token -> { userId, expires }
  const failures = new Map(); // username -> { count, lockedUntil }

  // ---------- bootstrap: make sure a default admin exists ----------
  function ensureDefaultAdmin() {
    if (!Array.isArray(state.users)) state.users = [];
    let admin = state.users.find(u => u.roleKey === 'SUPER_ADMIN' && u.id === 'USR-001')
      || state.users.find(u => u.roleKey === 'SUPER_ADMIN');
    let changed = false;
    if (!admin) {
      admin = {
        id: 'USR-001', name: 'Super Admin', role: 'Super Administrator', roleKey: 'SUPER_ADMIN',
        email: 'admin@zia.local', phone: '', branchId: state.branches && state.branches[0] ? state.branches[0].id : null,
        branchName: state.branches && state.branches[0] ? state.branches[0].name : 'Head Office',
        active: true, pinCode: '1234', mfaEnabled: false
      };
      state.users.unshift(admin);
      changed = true;
    }
    if (!admin.username) { admin.username = DEFAULT_ADMIN_USERNAME; changed = true; }
    if (!admin.passwordHash) {
      admin.passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD);
      admin.mustChangePassword = true;
      admin.active = true;
      changed = true;
    }
    if (changed) persist();
  }
  ensureDefaultAdmin();

  function defaultAdminStillDefault() {
    const admin = state.users.find(u => u.username === DEFAULT_ADMIN_USERNAME);
    return !!(admin && admin.mustChangePassword && verifyPassword(DEFAULT_ADMIN_PASSWORD, admin.passwordHash));
  }

  function dropSessions(userId) {
    for (const [token, s] of sessions) if (s.userId === userId) sessions.delete(token);
  }

  // ---------- middleware ----------
  function readUser(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;
    const s = sessions.get(token);
    if (!s) return null;
    if (s.expires < Date.now()) { sessions.delete(token); return null; }
    const user = state.users.find(u => u.id === s.userId);
    if (!user || user.active === false) { sessions.delete(token); return null; }
    s.expires = Date.now() + SESSION_TTL_MS; // sliding expiry
    return { user, token };
  }

  function requireAuth(req, res, next) {
    const auth = readUser(req);
    if (!auth) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.authUser = auth.user;
    req.authToken = auth.token;
    next();
  }

  function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
      if (req.authUser.roleKey !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only an administrator can do this.' });
      }
      next();
    });
  }

  function activeAdminCount(excludingId) {
    return state.users.filter(u => u.roleKey === 'SUPER_ADMIN' && u.active !== false && u.passwordHash && u.id !== excludingId).length;
  }

  function validatePassword(pw) {
    if (typeof pw !== 'string' || pw.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
  }

  function usernameTaken(username, exceptId) {
    const lower = String(username).toLowerCase();
    return state.users.some(u => u.id !== exceptId && u.username && u.username.toLowerCase() === lower);
  }

  function sessionPayload(user, branchId, token) {
    const branch = (state.branches || []).find(b => b.id === branchId) || (state.branches || [])[0] || null;
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        roleKey: user.roleKey,
        email: user.email,
        branchId: branch ? branch.id : user.branchId,
        branchName: branch ? branch.name : user.branchName,
        emirate: branch && branch.emirate ? branch.emirate : undefined
      },
      branch,
      company: state.companySettings,
      mustChangePassword: !!user.mustChangePassword,
      permissions: { tabs: tabsForRole(user.roleKey) }
    };
  }

  // ---------- public auth routes ----------
  router.get('/auth/bootstrap-status', (req, res) => {
    res.json({ defaultAdminPasswordUnchanged: defaultAdminStillDefault() });
  });

  router.post('/auth/login', (req, res) => {
    const { username, password, branchId } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const key = String(username).toLowerCase();
    const fail = failures.get(key) || { count: 0, lockedUntil: 0 };
    if (fail.lockedUntil > Date.now()) {
      const mins = Math.ceil((fail.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many failed attempts. Try again in ${mins} minute(s).` });
    }

    const user = state.users.find(u =>
      (u.username && u.username.toLowerCase() === key) ||
      (u.email && u.email.toLowerCase() === key)
    );
    const ok = !!user && user.active !== false && verifyPassword(password, user.passwordHash);

    if (!ok) {
      fail.count += 1;
      if (fail.count >= MAX_FAILS) { fail.lockedUntil = Date.now() + LOCK_MS; fail.count = 0; }
      failures.set(key, fail);
      logAudit('System', 'LOGIN_FAILED', `Failed login attempt for username: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    failures.delete(key);

    // Only admins / regional managers may pick a branch; everyone else is fixed to theirs.
    const useBranch = ALL_BRANCH_ROLES.includes(user.roleKey) ? (branchId || user.branchId) : user.branchId;
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_TTL_MS });
    const payload = sessionPayload(user, useBranch, token);
    logAudit(user.name, 'LOGIN_SUCCESS', `Signed in to branch: ${payload.user.branchName || '-'}`);
    res.json(payload);
  });

  router.post('/auth/logout', requireAuth, (req, res) => {
    sessions.delete(req.authToken);
    logAudit(req.authUser.name, 'LOGOUT', 'Signed out');
    res.json({ success: true });
  });

  router.get('/auth/me', requireAuth, (req, res) => {
    res.json(sessionPayload(req.authUser, req.authUser.branchId, req.authToken));
  });

  router.post('/auth/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = req.authUser;
    if (!verifyPassword(currentPassword || '', user.passwordHash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const err = validatePassword(newPassword);
    if (err) return res.status(400).json({ error: err });
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from the current one.' });
    }
    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;
    // sign out every other session of this user
    for (const [t, s] of sessions) if (s.userId === user.id && t !== req.authToken) sessions.delete(t);
    logAudit(user.name, 'CHANGE_PASSWORD', 'Password changed');
    persist();
    res.json({ success: true });
  });

  // ---------- user management ----------
  router.get('/users', (req, res) => {
    const auth = readUser(req);
    const isAdmin = auth && auth.user.roleKey === 'SUPER_ADMIN';
    if (isAdmin) return res.json(state.users.map(u => publicUser(u, { includeSecrets: true })));
    // anyone else: bare roster, no PINs or login details
    res.json(state.users.map(u => ({
      id: u.id, name: u.name, role: u.role, roleKey: u.roleKey,
      branchId: u.branchId, branchName: u.branchName, active: u.active !== false
    })));
  });

  router.post('/users', requireAdmin, (req, res) => {
    const { name, username, password, roleKey, email, phone, branchId, pinCode } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Full name is required.' });
    if (!username || !/^[A-Za-z0-9._@-]{3,40}$/.test(String(username))) {
      return res.status(400).json({ error: 'Username must be 3-40 characters (letters, numbers, . _ @ -).' });
    }
    if (usernameTaken(username)) return res.status(409).json({ error: 'That username is already in use.' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const roleObj = (state.roles || []).find(r => r.roleKey === roleKey);
    if (!roleObj) return res.status(400).json({ error: 'Choose a valid role.' });
    if (pinCode && !/^\d{4,6}$/.test(String(pinCode))) {
      return res.status(400).json({ error: 'Supervisor PIN must be 4-6 digits.' });
    }
    const branchObj = (state.branches || []).find(b => b.id === branchId) || (state.branches || [])[0];

    const maxNum = state.users.reduce((m, u) => Math.max(m, parseInt(String(u.id).replace(/\D/g, ''), 10) || 0), 0);
    const newUser = {
      id: `USR-${String(maxNum + 1).padStart(3, '0')}`,
      name: String(name).trim(),
      username: String(username).trim(),
      passwordHash: hashPassword(password),
      mustChangePassword: true,
      role: roleObj.displayName,
      roleKey: roleObj.roleKey,
      email: email || '',
      phone: phone || '',
      branchId: branchObj ? branchObj.id : null,
      branchName: branchObj ? branchObj.name : 'Head Office',
      active: true,
      pinCode: pinCode || '',
      mfaEnabled: false
    };
    state.users.push(newUser);
    logAudit(req.authUser.name, 'CREATE_USER', `Created login "${newUser.username}" (${newUser.role})`);
    persist();
    res.status(201).json(publicUser(newUser, { includeSecrets: true }));
  });

  router.put('/users/:id', requireAdmin, (req, res) => {
    const user = state.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const b = req.body || {};
    const isSelf = user.id === req.authUser.id;

    if (b.username !== undefined && b.username !== user.username) {
      if (!/^[A-Za-z0-9._@-]{3,40}$/.test(String(b.username))) {
        return res.status(400).json({ error: 'Username must be 3-40 characters (letters, numbers, . _ @ -).' });
      }
      if (usernameTaken(b.username, user.id)) return res.status(409).json({ error: 'That username is already in use.' });
      user.username = String(b.username).trim();
    }
    if (b.name !== undefined) user.name = String(b.name).trim() || user.name;
    if (b.email !== undefined) user.email = b.email;
    if (b.phone !== undefined) user.phone = b.phone;
    if (b.pinCode !== undefined) {
      if (b.pinCode && !/^\d{4,6}$/.test(String(b.pinCode))) {
        return res.status(400).json({ error: 'Supervisor PIN must be 4-6 digits.' });
      }
      user.pinCode = b.pinCode;
    }
    if (b.branchId !== undefined) {
      const br = (state.branches || []).find(x => x.id === b.branchId);
      if (br) { user.branchId = br.id; user.branchName = br.name; }
    }
    if (b.roleKey !== undefined && b.roleKey !== user.roleKey) {
      const roleObj = (state.roles || []).find(r => r.roleKey === b.roleKey);
      if (!roleObj) return res.status(400).json({ error: 'Choose a valid role.' });
      if (user.roleKey === 'SUPER_ADMIN' && (isSelf || activeAdminCount(user.id) === 0)) {
        return res.status(400).json({ error: 'Cannot remove the last active administrator role.' });
      }
      user.roleKey = roleObj.roleKey;
      user.role = roleObj.displayName;
      dropSessions(user.id);
    }
    if (b.active !== undefined && !!b.active !== (user.active !== false)) {
      if (!b.active && (isSelf || (user.roleKey === 'SUPER_ADMIN' && activeAdminCount(user.id) === 0))) {
        return res.status(400).json({ error: 'You cannot disable yourself or the last active administrator.' });
      }
      user.active = !!b.active;
      if (!user.active) dropSessions(user.id);
    }
    if (b.password) {
      const pwErr = validatePassword(b.password);
      if (pwErr) return res.status(400).json({ error: pwErr });
      user.passwordHash = hashPassword(b.password);
      user.mustChangePassword = !isSelf;
      dropSessions(user.id);
    }
    logAudit(req.authUser.name, 'UPDATE_USER', `Updated login "${user.username || user.name}"`);
    persist();
    res.json(publicUser(user, { includeSecrets: true }));
  });

  router.delete('/users/:id', requireAdmin, (req, res) => {
    const idx = state.users.findIndex(u => u.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'User not found.' });
    const user = state.users[idx];
    if (user.id === req.authUser.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    if (user.roleKey === 'SUPER_ADMIN' && activeAdminCount(user.id) === 0) {
      return res.status(400).json({ error: 'Cannot delete the last active administrator.' });
    }
    state.users.splice(idx, 1);
    dropSessions(user.id);
    logAudit(req.authUser.name, 'DELETE_USER', `Deleted login "${user.username || user.name}"`);
    persist();
    res.json({ success: true });
  });

  // ---------- server-side access control for every other API route ----------
  // Needed before sign-in (login page, public website lead capture).
  const PUBLIC_ROUTES = [
    ['GET', '/branches'],
    ['GET', '/settings/theme'],
    ['GET', '/settings/login-designer'],
    ['GET', '/license/system-id'],
    ['POST', '/auth/forgot-password'],
    ['POST', '/lead-generation/track-visitor'],
    ['POST', '/lead-generation/leads']
  ];

  // Which sidebar areas a role needs to be able to call each API group.
  // 'ANY' = every signed-in user, 'ADMIN' = administrators only,
  // { readAny, tabs } = anyone may read; writes need one of `tabs` (none = admin only).
  const ROUTE_RULES = {
    '/dashboard': 'ANY',
    '/auth': 'ANY',
    '/products': ['products', 'auto_catalogue', 'inventory', 'pos', 'purchases', 'sales'],
    '/catalog': ['auto_catalogue', 'products', 'inventory', 'pos', 'sales'],
    '/barcode': ['auto_catalogue', 'products', 'inventory', 'pos', 'sales'],
    '/vehicles': ['auto_catalogue', 'products', 'inventory', 'pos', 'sales'],
    '/inventory': ['inventory'],
    '/stn': ['inventory'],
    '/invoices': ['sales', 'pos'],
    '/sales': ['sales', 'pos'],
    '/quotations': ['sales', 'pos'],
    '/pos': ['pos', 'cash_register'],
    '/customers': ['customers', 'pos', 'sales'],
    '/suppliers': ['suppliers', 'purchases'],
    '/purchases': ['purchases'],
    '/expenses': ['expenses'],
    '/reports': ['reports'],
    '/accounting': ['reports'],
    '/etax': ['vat_201', 'sales', 'pos'],
    '/subscriptions': ['subscriptions'],
    '/service': ['auto_catalogue', 'inventory', 'sales'],
    '/branches': { readAny: true, tabs: ['branches'] },
    '/settings': { readAny: true, tabs: [] },
    '/localization': { readAny: true, tabs: [] }
    // everything else (admin, roles, entitlements, backup, security, license,
    // marketing, communications, lead-generation, unknown) is administrators only
  };

  function roleMayCall(user, method, path) {
    if (user.roleKey === 'SUPER_ADMIN') return true;
    const prefix = '/' + (path.split('/')[1] || '');
    const rule = ROUTE_RULES[prefix];
    if (rule === undefined || rule === 'ADMIN') return false;
    if (rule === 'ANY') return true;
    const tabs = tabsForRole(user.roleKey);
    if (Array.isArray(rule)) return tabs === '*' || rule.some(t => tabs.includes(t));
    if (rule.readAny && method === 'GET') return true;
    return tabs === '*' || rule.tabs.some(t => tabs.includes(t));
  }

  router.guard = function apiGuard(req, res, next) {
    if (req.method === 'OPTIONS') return next();
    const path = req.path;
    if (PUBLIC_ROUTES.some(([m, p]) => m === req.method && p === path)) return next();
    const auth = readUser(req);
    if (!auth) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.authUser = auth.user;
    if (!roleMayCall(auth.user, req.method, path)) {
      return res.status(403).json({ error: 'Your role does not have access to this.' });
    }
    next();
  };

  return router;
}

module.exports = { createAuthRouter, tabsForRole, hashPassword, verifyPassword };
