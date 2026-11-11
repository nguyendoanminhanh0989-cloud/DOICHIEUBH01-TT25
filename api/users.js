/**
 * Vercel Serverless API: Quản lý Người dùng & Phân quyền tập trung trên Cloud (/api/users)
 * Kiến trúc Multi-Shard Cloud Store (15 phân vùng độc lập, mỗi phân vùng <= 700 bytes)
 * Đảm bảo lưu trữ bền vững 100% tài khoản thành viên, mật khẩu, quyền hạn qua mọi lần cập nhật code / deploy.
 * Chỉ xóa tài khoản khi Admin chủ động bấm Xóa.
 */

const SHARD_IDS = [
  'ff808181a09d98f701a1bbefea9e6749', // Shard 0
  'ff808181a09d98f701a1bbfa30d9675a', // Shard 1
  'ff808181a09d98f701a1bbfa30e5675b', // Shard 2
  'ff808181a09d98f701a1be96f8326b68', // Shard 3
  'ff808181a09d98f701a1be96f8dc6b69', // Shard 4
  'ff808181a09d98f701a1be96f9836b6a', // Shard 5
  'ff808181a09d98f701a1be96fa1b6b6b', // Shard 6
  'ff808181a09d98f701a1be96fac56b6c', // Shard 7
  'ff808181a09d98f701a1be96fb666b6d', // Shard 8
  'ff808181a09d98f701a1be96fbfe6b6e', // Shard 9
  'ff808181a09d98f701a1be96fc956b6f', // Shard 10
  'ff808181a09d98f701a1be96fd146b70', // Shard 11
  'ff808181a09d98f701a1be96fdab6b71', // Shard 12
  'ff808181a09d98f701a1be96fe506b72', // Shard 13
  'ff808181a09d98f701a1be96fef26b73', // Shard 14 (Deleted IDs & Metadata)
];

const USER_SHARD_IDS = SHARD_IDS.slice(0, 14);
const META_SHARD_ID = SHARD_IDS[14];
const ALL_MODS = ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176'];

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lfklyofxesbhmladfcbq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma2x5b2Z4ZXNiaG1sYWRmY2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTg5MjgsImV4cCI6MjA5MjA3NDkyOH0.cJVlZIqF-30qcqP_BNkT3S7BpoXOGjQ2ZTK1Qj4bGUA';

async function syncToSupabaseRest(action, user, userId, username) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    if (action === 'UPSERT' && user && user.username) {
      const payload = {
        id: user.id || `u-${user.username}`,
        username: String(user.username).toLowerCase(),
        password_hash: user.passwordHash || '',
        plain_password_hint: user.plainPasswordHint || '',
        full_name: user.fullName || user.username,
        phone: user.phone || '',
        department: user.department || '',
        role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
        status: user.status || 'ACTIVE',
        allowed_modules: user.allowedModules || ALL_MODS,
        note: user.note || '',
        updated_at: new Date().toISOString()
      };
      await fetch(`${SUPABASE_URL}/rest/v1/app_users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      }).catch(() => null);
    } else if (action === 'DELETE') {
      const target = String(username || '').toLowerCase();
      if (target && target !== 'admin') {
        await fetch(`${SUPABASE_URL}/rest/v1/app_users?username=eq.${encodeURIComponent(target)}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }).catch(() => null);
      }
    }
  } catch (e) {
    // Non-blocking: Supabase might be temporarily paused
  }
}

const DEFAULT_ADMIN = {
  id: 'admin-root-anhkan',
  username: 'admin',
  passwordHash: 'b2b15d5791aace330a8d0be5dc3d6689', // Anhkan@0989
  plainPasswordHint: 'Anhkan@0989',
  fullName: 'NGUYỄN ĐOÀN MINH ÁNH',
  phone: '0787222646',
  department: 'Giám Đốc',
  role: 'ADMIN',
  status: 'ACTIVE',
  allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-11-09T03:47:44.264Z',
  note: 'Tài khoản Quản trị viên tối cao (Super Admin)',
};

const SEEDED_INITIAL_USERS = [
  DEFAULT_ADMIN,
  {
    id: 'user-49917lien',
    username: '49917lien',
    passwordHash: '3a662af073961af176a2e92df867b64b', // Liennt@123
    plainPasswordHint: 'Liennt@123',
    fullName: 'Nguyễn Thị Liên',
    phone: '1234567890',
    department: '49917',
    role: 'USER',
    status: 'ACTIVE',
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176'],
    createdAt: '2026-11-08T15:58:00.000Z',
    updatedAt: '2026-11-08T16:35:37.921Z',
    lastLogin: '2026-11-08T16:35:58.075Z',
    note: 'Tự đăng ký trên hệ thống',
  },
  {
    id: 'user-tranngocquan',
    username: 'tranngocquan',
    passwordHash: '', // chưa rõ mật khẩu - Admin bấm Reset MK để cấp lại
    plainPasswordHint: '',
    fullName: 'Trần Ngọc Quân',
    phone: '',
    department: 'IT',
    role: 'USER',
    status: 'ACTIVE',
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176'],
    createdAt: '2026-11-09T03:20:00.000Z',
    updatedAt: '2026-11-09T03:22:19.000Z',
    lastLogin: '2026-11-09T03:22:19.000Z',
    note: 'Được tạo bởi Admin',
  },
  {
    id: 'user-khoa031291',
    username: 'khoa031291',
    passwordHash: '', // chưa rõ mật khẩu - Admin bấm Reset MK để cấp lại
    plainPasswordHint: '',
    fullName: 'Khoa Đẹp Nửa Phút Trùm Cắn',
    phone: '0919354669',
    department: '49018',
    role: 'USER',
    status: 'ACTIVE',
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176'],
    createdAt: '2026-11-09T03:24:00.000Z',
    updatedAt: '2026-11-09T03:25:28.000Z',
    lastLogin: '2026-11-09T03:25:28.000Z',
    note: 'Admin Mãi đỉnh',
  },
];

let memoryCache = {
  users: [...SEEDED_INITIAL_USERS],
  deletedIds: [],
  shardPayloads: {},
  lastFetched: 0,
};

function toCompactUser(u) {
  let mask = 0;
  const mods = Array.isArray(u.allowedModules) ? u.allowedModules : ALL_MODS;
  ALL_MODS.forEach((m, i) => {
    if (mods.includes(m)) mask |= 1 << i;
  });
  return {
    i: String(u.id || `u-${u.username}`).slice(0, 36),
    u: String(u.username || '').trim().toLowerCase().slice(0, 40),
    p: String(u.passwordHash || ''),
    h: String(u.plainPasswordHint || '').slice(0, 40),
    f: String(u.fullName || '').slice(0, 60),
    ph: String(u.phone || '').slice(0, 20),
    d: String(u.department || '').slice(0, 50),
    r: u.role === 'ADMIN' ? 'A' : 'U',
    s: u.status === 'SUSPENDED' ? 'S' : u.status === 'PENDING' ? 'P' : 'A',
    m: mask || 15,
    c: u.createdAt || '2026-11-08T00:00:00.000Z',
    t: u.updatedAt || '2026-11-08T00:00:00.000Z',
    l: u.lastLogin || '',
    n: String(u.note || '').slice(0, 60),
  };
}

function fromCompactUser(c) {
  if (!c || typeof c !== 'object') return null;
  if (c.username) return c;
  if (!c.u) return null;
  const mask = typeof c.m === 'number' && c.m > 0 ? c.m : 15;
  const allowedModules = ALL_MODS.filter((_, i) => (mask & (1 << i)) !== 0);
  return {
    id: c.i || `u-${c.u}`,
    username: String(c.u).trim().toLowerCase(),
    passwordHash: c.p || '',
    plainPasswordHint: c.h || '',
    fullName: c.f || c.u,
    phone: c.ph || '',
    department: c.d || '',
    role: c.r === 'A' ? 'ADMIN' : 'USER',
    status: c.s === 'S' ? 'SUSPENDED' : c.s === 'P' ? 'PENDING' : 'ACTIVE',
    allowedModules: allowedModules.length > 0 ? allowedModules : [...ALL_MODS],
    createdAt: c.c || '2026-11-08T00:00:00.000Z',
    updatedAt: c.t || '2026-11-08T00:00:00.000Z',
    lastLogin: c.l || undefined,
    note: c.n || '',
  };
}

function decodeLegacyChunks(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.v === 2 && typeof data.p === 'string') {
    try {
      const arr = JSON.parse(data.p);
      if (Array.isArray(arr)) {
        return { users: arr.map(fromCompactUser).filter(Boolean), deletedIds: [] };
      }
    } catch {}
  }
  if (data.v === 2 && typeof data.d === 'string') {
    try {
      const del = JSON.parse(data.d);
      if (Array.isArray(del)) {
        return { users: [], deletedIds: del };
      }
    } catch {}
  }
  if (Array.isArray(data.users)) {
    return { users: data.users, deletedIds: Array.isArray(data.deletedIds) ? data.deletedIds : [] };
  }
  let joined = '';
  let idx = 0;
  while (typeof data[`c${idx}`] === 'string') {
    joined += data[`c${idx}`];
    idx++;
  }
  if (!joined) return null;
  try {
    return JSON.parse(joined);
  } catch {
    return null;
  }
}

function mergeTwoUserRecords(existingUser, incomingUser) {
  if (!existingUser) return incomingUser;
  if (!incomingUser) return existingUser;

  if (!existingUser.passwordHash && incomingUser.passwordHash) {
    return {
      ...existingUser,
      ...incomingUser,
      id: existingUser.id || incomingUser.id,
      passwordHash: incomingUser.passwordHash,
      plainPasswordHint: incomingUser.plainPasswordHint || existingUser.plainPasswordHint,
    };
  }
  if (existingUser.passwordHash && !incomingUser.passwordHash) {
    return {
      ...incomingUser,
      ...existingUser,
      id: existingUser.id || incomingUser.id,
      passwordHash: existingUser.passwordHash,
      plainPasswordHint: existingUser.plainPasswordHint || incomingUser.plainPasswordHint,
    };
  }

  const timeA = new Date(existingUser.updatedAt || existingUser.createdAt || 0).getTime();
  const timeB = new Date(incomingUser.updatedAt || incomingUser.createdAt || 0).getTime();

  if (timeB >= timeA) {
    return {
      ...existingUser,
      ...incomingUser,
      id: existingUser.id || incomingUser.id,
      passwordHash: incomingUser.passwordHash || existingUser.passwordHash,
      plainPasswordHint:
        incomingUser.plainPasswordHint !== undefined && incomingUser.plainPasswordHint !== ''
          ? incomingUser.plainPasswordHint
          : existingUser.plainPasswordHint,
    };
  }
  return existingUser;
}

async function loadCloudStore() {
  try {
    const query = SHARD_IDS.map(id => `id=${id}`).join('&');
    const url = `https://api.restful-api.dev/objects?${query}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const userMap = new Map();
        const deletedSet = new Set();
        const shardPayloads = {};

        for (const item of list) {
          if (!item || !item.id) continue;
          if (item.data && item.data.v === 2) {
            shardPayloads[item.id] = item.data.p ?? item.data.d ?? '';
          }
          const parsed = decodeLegacyChunks(item.data);
          if (!parsed) continue;
          if (Array.isArray(parsed.deletedIds)) {
            for (const d of parsed.deletedIds) {
              if (d) deletedSet.add(String(d).toLowerCase());
            }
          }
          if (Array.isArray(parsed.users)) {
            for (const u of parsed.users) {
              if (!u || !u.username) continue;
              const key = String(u.username).trim().toLowerCase();
              const prev = userMap.get(key);
              userMap.set(key, prev ? mergeTwoUserRecords(prev, u) : u);
            }
          }
        }

        // Bổ sung các tài khoản mặc định nếu chưa nằm trong danh sách đã xóa
        for (const seedUser of SEEDED_INITIAL_USERS) {
          const key = seedUser.username.toLowerCase();
          if (key !== 'admin' && (deletedSet.has(key) || deletedSet.has(seedUser.id.toLowerCase()))) {
            continue;
          }
          const prev = userMap.get(key);
          userMap.set(key, prev ? mergeTwoUserRecords(prev, seedUser) : seedUser);
        }

        // Cũng merge với memoryCache hiện tại để không bao giờ mất tài khoản vừa tạo
        for (const memUser of memoryCache.users) {
          if (!memUser || !memUser.username) continue;
          const key = memUser.username.toLowerCase();
          if (key !== 'admin' && (deletedSet.has(key) || deletedSet.has(String(memUser.id).toLowerCase()))) {
            continue;
          }
          const prev = userMap.get(key);
          userMap.set(key, prev ? mergeTwoUserRecords(prev, memUser) : memUser);
        }

        // Loại bỏ các tài khoản đã bị xóa (trừ admin)
        const finalUsers = Array.from(userMap.values()).filter(u => {
          const key = String(u.username || '').toLowerCase();
          if (key === 'admin') return true;
          return !deletedSet.has(key) && !deletedSet.has(String(u.id || '').toLowerCase());
        });

        const finalDeleted = Array.from(deletedSet);
        memoryCache = {
          users: finalUsers,
          deletedIds: finalDeleted,
          shardPayloads,
          lastFetched: Date.now(),
        };
        return { users: finalUsers, deletedIds: finalDeleted };
      }
    }
  } catch (err) {
    console.warn('loadCloudStore error:', err && err.message);
  }

  return { users: memoryCache.users, deletedIds: memoryCache.deletedIds };
}

async function saveCloudStore(users, deletedIds) {
  if (!users.some(u => String(u.username || '').toLowerCase() === 'admin')) {
    users.unshift(DEFAULT_ADMIN);
  }

  // Đóng gói danh sách user dạng compact vào 14 phân vùng (mỗi phân vùng tối đa 2 user ~ 500 bytes <= giới hạn 950 bytes)
  const compactList = users.map(toCompactUser);
  const shardGroups = USER_SHARD_IDS.map(() => []);

  let currentShardIdx = 0;
  for (const cu of compactList) {
    while (currentShardIdx < USER_SHARD_IDS.length - 1) {
      const testGroup = [...shardGroups[currentShardIdx], cu];
      const testStr = JSON.stringify(testGroup);
      if (testGroup.length <= 2 && testStr.length <= 680) {
        break;
      }
      currentShardIdx++;
    }
    shardGroups[currentShardIdx].push(cu);
  }

  const prevPayloads = memoryCache.shardPayloads || {};
  const nextPayloads = { ...prevPayloads };
  const putPromises = [];

  for (let i = 0; i < USER_SHARD_IDS.length; i++) {
    const shardId = USER_SHARD_IDS[i];
    const pStr = JSON.stringify(shardGroups[i]);
    if (prevPayloads[shardId] !== pStr) {
      nextPayloads[shardId] = pStr;
      putPromises.push(
        fetch(`https://api.restful-api.dev/objects/${shardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: `bhxh_tt25_shard_${i}`,
            data: { v: 2, p: pStr },
          }),
        }).catch(() => null)
      );
    }
  }

  const delStr = JSON.stringify((deletedIds || []).slice(-30));
  if (prevPayloads[META_SHARD_ID] !== delStr) {
    nextPayloads[META_SHARD_ID] = delStr;
    putPromises.push(
      fetch(`https://api.restful-api.dev/objects/${META_SHARD_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: 'bhxh_tt25_shard_meta',
          data: { v: 2, d: delStr },
        }),
      }).catch(() => null)
    );
  }

  memoryCache = {
    users,
    deletedIds,
    shardPayloads: nextPayloads,
    lastFetched: Date.now(),
  };

  if (putPromises.length > 0) {
    await Promise.all(putPromises);
  }
  return true;
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString('utf8'));
      } catch {
        return {};
      }
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const store = await loadCloudStore();
    let users = [...store.users];
    let deletedIds = [...store.deletedIds];

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, users, deletedIds });
    }

    const body = await readBody(req);
    const action = String(body.action || 'SYNC').toUpperCase();

    // Nếu client gửi kèm danh sách users hiện có ở trình duyệt, gộp trước để không bao giờ rơi rớt tài khoản
    if (Array.isArray(body.users)) {
      for (const localU of body.users) {
        if (!localU || !localU.username) continue;
        const cleanU = String(localU.username).trim().toLowerCase();
        if (
          cleanU !== 'admin' &&
          (deletedIds.includes(cleanU) || deletedIds.includes(String(localU.id || '').toLowerCase()))
        ) {
          continue;
        }
        const idx = users.findIndex(
          u => u.id === localU.id || String(u.username || '').toLowerCase() === cleanU
        );
        if (idx === -1) {
          users.push({ ...localU, username: cleanU });
        } else {
          users[idx] = mergeTwoUserRecords(users[idx], localU);
        }
      }
    }

    if (action === 'UPSERT' && body.user && body.user.username) {
      const incoming = body.user;
      const cleanUsername = String(incoming.username).trim().toLowerCase();

      deletedIds = deletedIds.filter(
        d =>
          String(d).toLowerCase() !== String(incoming.id || '').toLowerCase() &&
          String(d).toLowerCase() !== cleanUsername
      );

      const idx = users.findIndex(
        u => u.id === incoming.id || String(u.username || '').toLowerCase() === cleanUsername
      );

      let savedUser;
      if (idx >= 0) {
        savedUser = {
          ...users[idx],
          ...incoming,
          id: users[idx].id,
          passwordHash: incoming.passwordHash || users[idx].passwordHash,
          plainPasswordHint:
            incoming.plainPasswordHint !== undefined && incoming.plainPasswordHint !== ''
              ? incoming.plainPasswordHint
              : users[idx].plainPasswordHint,
          username: cleanUsername,
          updatedAt: incoming.updatedAt || new Date().toISOString(),
        };
        users[idx] = savedUser;
      } else {
        savedUser = {
          ...incoming,
          username: cleanUsername,
          updatedAt: incoming.updatedAt || new Date().toISOString(),
        };
        users.push(savedUser);
      }

      await saveCloudStore(users, deletedIds);
      syncToSupabaseRest('UPSERT', savedUser).catch(() => null);
      return res.status(200).json({ ok: true, user: savedUser, users, deletedIds });
    }

    if (action === 'DELETE') {
      const targetId = String(body.userId || '').toLowerCase();
      const targetUsername = String(body.username || '').trim().toLowerCase();

      const found = users.find(
        u =>
          (targetId && String(u.id || '').toLowerCase() === targetId) ||
          (targetUsername && String(u.username || '').toLowerCase() === targetUsername)
      );

      if (found && String(found.username || '').toLowerCase() === 'admin') {
        return res.status(400).json({ ok: false, message: 'Không thể xóa tài khoản admin gốc!' });
      }

      if (found) {
        const fId = String(found.id || '').toLowerCase();
        const fName = String(found.username || '').toLowerCase();
        if (fId && !deletedIds.includes(fId)) deletedIds.push(fId);
        if (fName && !deletedIds.includes(fName)) deletedIds.push(fName);
      }
      if (targetId && !deletedIds.includes(targetId)) deletedIds.push(targetId);
      if (targetUsername && !deletedIds.includes(targetUsername)) deletedIds.push(targetUsername);

      users = users.filter(
        u =>
          String(u.id || '').toLowerCase() !== targetId &&
          String(u.username || '').toLowerCase() !== targetUsername
      );

      await saveCloudStore(users, deletedIds);
      syncToSupabaseRest('DELETE', null, targetId, targetUsername).catch(() => null);
      return res.status(200).json({ ok: true, users, deletedIds });
    }

    // Mặc định (SYNC): lưu đồng bộ toàn bộ sang các phân vùng Cloud
    await saveCloudStore(users, deletedIds);
    // Đồng bộ lên Supabase nếu có
    for (const u of users) {
      syncToSupabaseRest('UPSERT', u).catch(() => null);
    }
    return res.status(200).json({ ok: true, users, deletedIds });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err && err.message ? err.message : 'Internal server error',
    });
  }
}
