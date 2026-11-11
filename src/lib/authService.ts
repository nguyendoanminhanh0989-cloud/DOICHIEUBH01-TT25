/**
 * HỆ THỐNG QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN TẬP TRUNG TRÊN CLOUD (ADMIN & USERS)
 * - Đồng bộ trực tiếp qua Cloud API (/api/users + Cloud Object Store dự phòng đa luồng)
 *   giúp mọi thao tác: Đăng ký tài khoản mới, Đổi mật khẩu, Admin Duyệt / Tạm ngưng / Reset MK / Xóa
 *   có hiệu lực tức thì trên MỌI máy tính, trình duyệt và thiết bị.
 *
 * Tác giả: NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ ĐÀ NẴNG
 */

import md5 from 'md5';
import { getSupabaseClient, testSupabaseUsersTableConnection } from './supabase';

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type AppModuleId = 'DOI_SOAT' | 'CHUNG_TU' | 'KHAM_SUC_KHOE' | 'XML_3176' | 'TT12_BH01_BH02';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  plainPasswordHint?: string; // Lưu mật khẩu do Admin cấp / người dùng đặt (hiển thị cho Admin để hỗ trợ cấp lại)
  fullName: string;
  phone?: string;
  department?: string;        // Khoa / Phòng / Đơn vị CSKCB
  role: UserRole;
  status: UserStatus;
  allowedModules: AppModuleId[];
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  note?: string;
}

export interface AuthSession {
  user: AppUser;
  loginTime: string;
  rememberMe: boolean;
}

const LOCAL_USERS_STORAGE_KEY = 'bhxh_tt25_app_users_v1';
const LOCAL_DELETED_STORAGE_KEY = 'bhxh_tt25_deleted_users_v1';
const LOCAL_SESSION_STORAGE_KEY = 'bhxh_tt25_auth_session_v1';
const PASSWORD_SALT = 'BHXH_TT25_ANHKAN_2026_SALT_';

const CLOUD_SHARD_IDS = [
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

const USER_SHARD_IDS = CLOUD_SHARD_IDS.slice(0, 14);
const META_SHARD_ID = CLOUD_SHARD_IDS[14];
const ALL_MODULE_IDS: AppModuleId[] = ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176', 'TT12_BH01_BH02'];

export const ALL_MODULES: { id: AppModuleId; label: string }[] = [
  { id: 'DOI_SOAT', label: 'Đối chiếu BH01' },
  { id: 'CHUNG_TU', label: 'Hồ sơ Chứng từ TT25' },
  { id: 'KHAM_SUC_KHOE', label: 'Khám Sức Khỏe' },
  { id: 'XML_3176', label: 'Đọc & Ký XML 3176' },
  { id: 'TT12_BH01_BH02', label: 'Chứng từ TT12 BHXH - BH01 - BH02' },
];

export function hashPassword(password: string): string {
  return md5(PASSWORD_SALT + password.trim());
}

/**
 * Tài khoản Super Admin & các tài khoản thành viên gốc đã khởi tạo
 */
const DEFAULT_ADMIN_USER: AppUser = {
  id: 'admin-root-anhkan',
  username: 'admin',
  passwordHash: 'b2b15d5791aace330a8d0be5dc3d6689', // Anhkan@0989
  plainPasswordHint: 'Anhkan@0989',
  fullName: 'NGUYỄN ĐOÀN MINH ÁNH',
  phone: '0787222646',
  department: 'Giám Đốc',
  role: 'ADMIN',
  status: 'ACTIVE',
  allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176', 'TT12_BH01_BH02'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-11-09T03:47:44.264Z',
  note: 'Tài khoản Quản trị viên tối cao (Super Admin)',
};

const SEEDED_INITIAL_USERS: AppUser[] = [
  DEFAULT_ADMIN_USER,
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
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176', 'TT12_BH01_BH02'],
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
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176', 'TT12_BH01_BH02'],
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
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176', 'TT12_BH01_BH02'],
    createdAt: '2026-11-09T03:24:00.000Z',
    updatedAt: '2026-11-09T03:25:28.000Z',
    lastLogin: '2026-11-09T03:25:28.000Z',
    note: 'Admin Mãi đỉnh',
  },
];

function loadLocalDeletedIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalDeletedIds(ids: string[]): void {
  try {
    localStorage.setItem(LOCAL_DELETED_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function loadLocalUsers(): AppUser[] {
  const deleted = new Set(loadLocalDeletedIds().map(d => String(d).toLowerCase()));
  const map = new Map<string, AppUser>();

  for (const seed of SEEDED_INITIAL_USERS) {
    const k = seed.username.toLowerCase();
    if (k !== 'admin' && (deleted.has(k) || deleted.has(seed.id.toLowerCase()))) continue;
    map.set(k, seed);
  }

  try {
    const raw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          if (!u || !u.username) continue;
          const k = String(u.username).trim().toLowerCase();
          if (k !== 'admin' && (deleted.has(k) || deleted.has(String(u.id || '').toLowerCase()))) continue;
          const prev = map.get(k);
          map.set(k, prev ? mergeTwoUsers(prev, u) : u);
        }
      }
    }
  } catch {}

  return Array.from(map.values());
}

/**
 * Lưu danh sách người dùng vào LocalStorage theo cơ chế GỘP AN TOÀN (không bao giờ làm rơi tài khoản trừ khi bị Admin xóa trong deletedIds)
 */
function saveLocalUsers(users: AppUser[], deletedIds?: string[]): void {
  try {
    const delList = deletedIds || loadLocalDeletedIds();
    const delSet = new Set(delList.map(d => String(d).toLowerCase()));
    const map = new Map<string, AppUser>();

    // Giữ lại các tài khoản đã có ở local nếu chưa bị xóa
    const existingRaw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    if (existingRaw) {
      try {
        const existingArr = JSON.parse(existingRaw);
        if (Array.isArray(existingArr)) {
          for (const u of existingArr) {
            if (!u || !u.username) continue;
            const k = String(u.username).trim().toLowerCase();
            if (k !== 'admin' && (delSet.has(k) || delSet.has(String(u.id || '').toLowerCase()))) continue;
            map.set(k, u);
          }
        }
      } catch {}
    }

    for (const u of users) {
      if (!u || !u.username) continue;
      const k = String(u.username).trim().toLowerCase();
      if (k !== 'admin' && (delSet.has(k) || delSet.has(String(u.id || '').toLowerCase()))) continue;
      const prev = map.get(k);
      map.set(k, prev ? mergeTwoUsers(prev, u) : u);
    }

    if (!map.has('admin')) {
      map.set('admin', DEFAULT_ADMIN_USER);
    }

    localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
  } catch {}
}

function toCompactUser(u: AppUser): Record<string, any> {
  let mask = 0;
  const mods = Array.isArray(u.allowedModules) ? u.allowedModules : ALL_MODULE_IDS;
  ALL_MODULE_IDS.forEach((m, i) => {
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

function fromCompactUser(c: any): AppUser | null {
  if (!c || typeof c !== 'object') return null;
  if (c.username) return c as AppUser;
  if (!c.u) return null;
  const mask = typeof c.m === 'number' && c.m > 0 ? c.m : 15;
  const allowedModules = ALL_MODULE_IDS.filter((_, i) => (mask & (1 << i)) !== 0);
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
    allowedModules: allowedModules.length > 0 ? allowedModules : [...ALL_MODULE_IDS],
    createdAt: c.c || '2026-11-08T00:00:00.000Z',
    updatedAt: c.t || '2026-11-08T00:00:00.000Z',
    lastLogin: c.l || undefined,
    note: c.n || '',
  };
}

function decodeChunks(data: any): { users: AppUser[]; deletedIds: string[] } | null {
  if (!data || typeof data !== 'object') return null;
  if (data.v === 2 && typeof data.p === 'string') {
    try {
      const arr = JSON.parse(data.p);
      if (Array.isArray(arr)) {
        return { users: arr.map(fromCompactUser).filter(Boolean) as AppUser[], deletedIds: [] };
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
  if (typeof data.payload === 'string') {
    try {
      return JSON.parse(data.payload);
    } catch {
      return null;
    }
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

/**
 * Đồng bộ trực tiếp với bảng app_users trên Supabase (nếu Supabase khả dụng)
 */
export async function syncWithSupabaseTable(payload: {
  action: 'SYNC' | 'UPSERT' | 'DELETE';
  user?: AppUser;
  users?: AppUser[];
  userId?: string;
  username?: string;
}): Promise<AppUser[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    if (payload.action === 'UPSERT' && payload.user) {
      const u = payload.user;
      await supabase.from('app_users').upsert(
        {
          id: u.id,
          username: u.username.toLowerCase(),
          password_hash: u.passwordHash,
          plain_password_hint: u.plainPasswordHint || '',
          full_name: u.fullName,
          phone: u.phone || '',
          department: u.department || '',
          role: u.role,
          status: u.status,
          allowed_modules: u.allowedModules,
          created_at: u.createdAt,
          updated_at: u.updatedAt,
          last_login: u.lastLogin || null,
          note: u.note || '',
        },
        { onConflict: 'username' }
      );
    } else if (payload.action === 'DELETE') {
      if (payload.username) {
        await supabase.from('app_users').delete().eq('username', payload.username.toLowerCase());
      }
      if (payload.userId) {
        await supabase.from('app_users').delete().eq('id', payload.userId);
      }
    } else if (payload.action === 'SYNC' && Array.isArray(payload.users) && payload.users.length > 0) {
      for (const u of payload.users) {
        if (!u || !u.username) continue;
        await supabase.from('app_users').upsert(
          {
            id: u.id,
            username: u.username.toLowerCase(),
            password_hash: u.passwordHash,
            plain_password_hint: u.plainPasswordHint || '',
            full_name: u.fullName,
            phone: u.phone || '',
            department: u.department || '',
            role: u.role,
            status: u.status,
            allowed_modules: u.allowedModules,
            created_at: u.createdAt,
            updated_at: u.updatedAt,
            last_login: u.lastLogin || null,
            note: u.note || '',
          },
          { onConflict: 'username' }
        );
      }
    }

    const { data, error } = await supabase.from('app_users').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id || `u-${row.username}`,
        username: String(row.username || '').toLowerCase(),
        passwordHash: row.password_hash || '',
        plainPasswordHint: row.plain_password_hint || '',
        fullName: row.full_name || row.username,
        phone: row.phone || '',
        department: row.department || '',
        role: row.role === 'ADMIN' ? 'ADMIN' : 'USER',
        status: row.status === 'SUSPENDED' ? 'SUSPENDED' : row.status === 'PENDING' ? 'PENDING' : 'ACTIVE',
        allowedModules: Array.isArray(row.allowed_modules) ? row.allowed_modules : [...ALL_MODULE_IDS],
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
        lastLogin: row.last_login || undefined,
        note: row.note || '',
      }));
    }
  } catch (err) {
    console.warn('syncWithSupabaseTable error:', err);
  }
  return null;
}

/**
 * Đồng bộ chủ động toàn bộ tài khoản người dùng lên Supabase (app_users)
 */
export async function syncAllUsersToSupabase(): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  const connCheck = await testSupabaseUsersTableConnection();
  if (!connCheck.success) {
    return {
      success: false,
      message: connCheck.message,
      count: 0,
    };
  }

  const users = await fetchAllUsers();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Chưa cấu hình Supabase URL hoặc Anon Key trong hệ thống.',
      count: 0,
    };
  }

  try {
    const res = await syncWithSupabaseTable({
      action: 'SYNC',
      users,
    });
    if (res && res.length > 0) {
      saveLocalUsers(res);
      return {
        success: true,
        message: `Đã đồng bộ thành công ${res.length} tài khoản lên bảng app_users trên Supabase!`,
        count: res.length,
      };
    }
    return {
      success: false,
      message: 'Không thể ghi dữ liệu vào bảng "app_users". Hãy kiểm tra quyền (RLS) của bảng trên Supabase.',
      count: 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Lỗi khi đồng bộ lên Supabase.',
      count: 0,
    };
  }
}

function mergeTwoUsers(cloudUser: AppUser, localUser: AppUser): AppUser {
  if (!cloudUser.passwordHash && localUser.passwordHash) {
    return {
      ...localUser,
      ...cloudUser,
      id: cloudUser.id || localUser.id,
      passwordHash: localUser.passwordHash,
      plainPasswordHint: localUser.plainPasswordHint || cloudUser.plainPasswordHint,
      fullName:
        localUser.fullName && !localUser.fullName.includes('(Cơ sở KCB')
          ? localUser.fullName
          : cloudUser.fullName || localUser.fullName,
      phone: cloudUser.phone || localUser.phone || '',
      department: localUser.department || cloudUser.department || '',
      status: cloudUser.status !== 'PENDING' ? cloudUser.status : localUser.status,
      updatedAt:
        new Date(localUser.updatedAt || 0).getTime() > new Date(cloudUser.updatedAt || 0).getTime()
          ? localUser.updatedAt
          : cloudUser.updatedAt,
    };
  }

  const cloudTime = new Date(cloudUser.updatedAt || cloudUser.createdAt || 0).getTime();
  const localTime = new Date(localUser.updatedAt || localUser.createdAt || 0).getTime();

  if (localTime > cloudTime) {
    return {
      ...cloudUser,
      ...localUser,
      passwordHash: localUser.passwordHash || cloudUser.passwordHash,
      plainPasswordHint:
        localUser.plainPasswordHint !== undefined && localUser.plainPasswordHint !== ''
          ? localUser.plainPasswordHint
          : cloudUser.plainPasswordHint,
    };
  }
  return cloudUser;
}

/**
 * Gọi Cloud API (/api/users) hoặc fallback trực tiếp tới Cloud Object Store
 */
async function callCloudUsersApi(payload: {
  action: 'SYNC' | 'UPSERT' | 'DELETE';
  users?: AppUser[];
  user?: AppUser;
  userId?: string;
  username?: string;
}): Promise<{ users: AppUser[]; deletedIds: string[] } | null> {
  // 1. ƯU TIÊN SỐ 1: Trực tiếp thao tác và đồng bộ với bảng app_users trên Supabase
  try {
    const supabaseUsers = await syncWithSupabaseTable(payload);
    if (supabaseUsers && supabaseUsers.length > 0) {
      // Gửi ngầm sao lưu lên /api/users
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC', users: supabaseUsers }),
      }).catch(() => null);

      return {
        users: supabaseUsers,
        deletedIds: [],
      };
    }
  } catch {}

  // 2. Dự phòng: Serverless API /api/users trên cùng domain Vercel
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.users)) {
        return {
          users: data.users,
          deletedIds: Array.isArray(data.deletedIds) ? data.deletedIds : [],
        };
      }
    }
  } catch {}

  // 3. Fallback (khi chạy local vite dev không có /api/users): đọc trực tiếp các phân vùng Cloud (chỉ đọc, không ghi đè)
  try {
    const query = CLOUD_SHARD_IDS.map(id => `id=${id}`).join('&');
    const res = await fetch(`https://api.restful-api.dev/objects?${query}`, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const map = new Map<string, AppUser>();
        const deleted = new Set<string>();
        for (const item of list) {
          const decoded = decodeChunks(item?.data);
          if (!decoded) continue;
          (decoded.deletedIds || []).forEach(d => deleted.add(String(d).toLowerCase()));
          for (const u of decoded.users || []) {
            if (!u || !u.username) continue;
            const k = u.username.toLowerCase();
            const prev = map.get(k);
            map.set(k, prev ? mergeTwoUsers(prev, u) : u);
          }
        }
        for (const u of payload.users || (payload.user ? [payload.user] : [])) {
          const k = u.username.toLowerCase();
          const prev = map.get(k);
          map.set(k, prev ? mergeTwoUsers(prev, u) : u);
        }
        if (!map.has('admin')) map.set('admin', DEFAULT_ADMIN_USER);
        const users = Array.from(map.values()).filter(
          u => u.username.toLowerCase() === 'admin' || (!deleted.has(u.username.toLowerCase()) && !deleted.has(String(u.id).toLowerCase()))
        );
        return { users, deletedIds: Array.from(deleted) };
      }
    }
  } catch {}

  return null;
}

/**
 * Đọc và đồng bộ danh sách người dùng từ Cloud Server + Local
 */
export async function fetchAllUsers(): Promise<AppUser[]> {
  const localUsers = loadLocalUsers();
  const localDeleted = loadLocalDeletedIds();

  // Chỉ đẩy các tài khoản local chưa bị xóa lên SYNC
  const validLocalUsers = localUsers.filter(
    u =>
      u.username.toLowerCase() === 'admin' ||
      (!localDeleted.includes(u.id) && !localDeleted.includes(u.username.toLowerCase()))
  );

  const cloudResult = await callCloudUsersApi({
    action: 'SYNC',
    users: validLocalUsers,
  });

  if (cloudResult && Array.isArray(cloudResult.users) && cloudResult.users.length > 0) {
    saveLocalUsers(cloudResult.users, cloudResult.deletedIds);
    saveLocalDeletedIds(cloudResult.deletedIds);
    return cloudResult.users;
  }

  return validLocalUsers;
}

/**
 * Lưu 1 người dùng lên Cloud Server và cập nhật Local cache
 */
async function upsertUserEverywhere(user: AppUser): Promise<AppUser> {
  const localUsers = loadLocalUsers();
  const cleanU = user.username.trim().toLowerCase();
  const existsIdx = localUsers.findIndex(
    u => u.id === user.id || u.username.toLowerCase() === cleanU
  );

  let nextLocal: AppUser[];
  if (existsIdx >= 0) {
    nextLocal = localUsers.map((u, i) => (i === existsIdx ? user : u));
  } else {
    nextLocal = [...localUsers, user];
  }
  saveLocalUsers(nextLocal);

  const cloudResult = await callCloudUsersApi({
    action: 'UPSERT',
    user,
  });

  if (cloudResult && Array.isArray(cloudResult.users)) {
    saveLocalUsers(cloudResult.users, cloudResult.deletedIds);
    saveLocalDeletedIds(cloudResult.deletedIds);
    const saved = cloudResult.users.find(
      u => u.id === user.id || u.username.toLowerCase() === cleanU
    );
    if (saved) return saved;
  }

  return user;
}

const SAVED_CREDENTIALS_STORAGE_KEY = 'bhxh_tt25_saved_credentials_v1';

export interface SavedLoginCredentials {
  username: string;
  password: string;
  remember: boolean;
}

/**
 * Lấy thông tin tài khoản đã lưu vết trên trình duyệt (dùng cho màn hình Đăng nhập)
 */
export function getSavedLoginCredentials(): SavedLoginCredentials {
  try {
    const raw = localStorage.getItem(SAVED_CREDENTIALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.username === 'string') {
        return {
          username: parsed.username || '',
          password: parsed.password || '',
          remember: parsed.remember !== false,
        };
      }
    }
  } catch {}
  return { username: '', password: '', remember: true };
}

/**
 * Lưu vết tài khoản đăng nhập trên trình duyệt
 */
export function saveLoginCredentials(username: string, password: string, remember = true): void {
  try {
    if (!remember) {
      localStorage.removeItem(SAVED_CREDENTIALS_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      SAVED_CREDENTIALS_STORAGE_KEY,
      JSON.stringify({
        username: username.trim(),
        password,
        remember: true,
      })
    );
  } catch {}
}

let inMemoryActiveSession: AuthSession | null = null;

/**
 * Lấy phiên đăng nhập hiện tại (lưu vết trên trình duyệt qua F5 & các lần mở trình duyệt)
 */
export function getCurrentSession(): AuthSession | null {
  if (inMemoryActiveSession) return inMemoryActiveSession;
  try {
    const raw =
      sessionStorage.getItem(LOCAL_SESSION_STORAGE_KEY) ||
      localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed && parsed.user && parsed.user.username) {
        inMemoryActiveSession = parsed;
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Lưu phiên đăng nhập hiện tại vào trình duyệt (giữ đăng nhập khi bấm F5 hoặc mở lại trình duyệt)
 */
export function saveCurrentSession(session: AuthSession): void {
  inMemoryActiveSession = session;
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(LOCAL_SESSION_STORAGE_KEY, serialized);
    localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, serialized);
  } catch {}
}

/**
 * Đăng xuất tài khoản (xóa phiên đăng nhập hiện tại, nhưng vẫn giữ vết tài khoản gợi ý nếu người dùng đã lưu)
 */
export function logoutUser(): void {
  inMemoryActiveSession = null;
  try {
    sessionStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
    localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * Kiểm tra lại trạng thái tài khoản đang đăng nhập từ Cloud
 */
export async function verifyActiveSession(): Promise<{
  valid: boolean;
  user?: AppUser;
  reason?: string;
}> {
  const session = getCurrentSession();
  if (!session) return { valid: false };

  const users = await fetchAllUsers();
  const matched = users.find(
    u =>
      u.id === session.user.id ||
      u.username.toLowerCase() === session.user.username.toLowerCase()
  );

  if (!matched) {
    logoutUser();
    return {
      valid: false,
      reason: 'Tài khoản của bạn đã bị Quản trị viên xóa khỏi hệ thống!',
    };
  }

  if (matched.status === 'SUSPENDED') {
    logoutUser();
    return {
      valid: false,
      reason: 'Tài khoản của bạn đã bị Quản trị viên TẠM NGƯNG HOẠT ĐỘNG!',
    };
  }

  if (matched.status === 'PENDING') {
    logoutUser();
    return {
      valid: false,
      reason: 'Tài khoản của bạn đang ở trạng thái CHỜ ADMIN PHÊ DUYỆT!',
    };
  }

  saveCurrentSession({
    ...session,
    user: matched,
  });

  return { valid: true, user: matched };
}

/**
 * Đăng nhập tài khoản
 * - Ưu tiên đọc local cache (nhanh, tức thì)
 * - Chạy ngầm đồng bộ Cloud sau khi đã đăng nhập xong
 */
export async function loginWithCredentials(
  usernameInput: string,
  passwordInput: string,
  rememberMe = true
): Promise<AppUser> {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanUser || !cleanPass) {
    throw new Error('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
  }

  // 1. Đọc nhanh từ local cache TRƯỚC (không cần đợi Cloud/Supabase)
  const localUsers = loadLocalUsers();
  let found = localUsers.find(u => u.username.toLowerCase() === cleanUser);

  // 2. Nếu local cache không có (lần đầu dùng hoặc xóa cache), mới fetch từ Cloud (có timeout 5s)
  if (!found) {
    try {
      const cloudResult = await Promise.race([
        callCloudUsersApi({ action: 'SYNC', users: localUsers }),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
      ]);
      if (cloudResult && Array.isArray(cloudResult.users)) {
        saveLocalUsers(cloudResult.users, cloudResult.deletedIds);
        saveLocalDeletedIds(cloudResult.deletedIds);
        found = cloudResult.users.find(u => u.username.toLowerCase() === cleanUser);
      }
    } catch {}
  }

  if (!found) {
    throw new Error(
      'Tên đăng nhập không tồn tại trên hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới!'
    );
  }

  const inputHash = hashPassword(cleanPass);

  if (found.passwordHash !== inputHash && found.plainPasswordHint !== cleanPass) {
    throw new Error(
      'Mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc liên hệ Admin để Reset mật khẩu!'
    );
  }

  if (found.status === 'SUSPENDED') {
    throw new Error(
      '⛔ Tài khoản của bạn đang bị TẠM NGƯNG HOẠT ĐỘNG bởi Quản trị viên.\nVui lòng liên hệ Admin (Nguyễn Đoàn Minh Ánh) để được mở lại!'
    );
  }

  if (found.status === 'PENDING') {
    throw new Error(
      '⏳ Tài khoản của bạn đã đăng ký nhưng đang CHỜ QUẢN TRỊ VIÊN DUYỆT kích hoạt.\nVui lòng liên hệ Admin (Nguyễn Đoàn Minh Ánh) để được cấp quyền truy cập!'
    );
  }

  const now = new Date().toISOString();
  const updatedUser: AppUser = {
    ...found,
    lastLogin: now,
  };

  // 3. Lưu phiên đăng nhập ngay vào RAM (tức thì, không cần đợi Cloud)
  saveCurrentSession({
    user: updatedUser,
    loginTime: now,
    rememberMe,
  });

  // 4. Chạy ngầm đồng bộ lastLogin lên Cloud/Supabase (không block UI)
  upsertUserEverywhere(updatedUser).catch(() => null);

  return updatedUser;
}

/**
 * Người dùng tự đăng ký tài khoản mới
 */
export async function registerUserAccount(params: {
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  department?: string;
  note?: string;
}): Promise<AppUser> {
  const cleanUsername = params.username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự (không dấu, không khoảng trắng).');
  }
  if (/\s/.test(cleanUsername)) {
    throw new Error('Tên đăng nhập không được chứa khoảng trắng.');
  }
  if (!params.password || params.password.trim().length < 4) {
    throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
  }
  if (!params.fullName.trim()) {
    throw new Error('Vui lòng nhập Họ và tên của bạn.');
  }

  const users = await fetchAllUsers();
  const existing = users.find(u => u.username.toLowerCase() === cleanUsername);
  if (existing && existing.passwordHash) {
    throw new Error(
      `Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác!`
    );
  }

  const now = new Date().toISOString();
  const newUser: AppUser = {
    id: existing?.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username: cleanUsername,
    passwordHash: hashPassword(params.password),
    plainPasswordHint: params.password.trim(),
    fullName: params.fullName.trim(),
    phone: params.phone?.trim() || '',
    department: params.department?.trim() || '',
    role: 'USER',
    status: existing?.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
    allowedModules: ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176', 'TT12_BH01_BH02'],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    note: params.note?.trim() || 'Tự đăng ký trên hệ thống',
  };

  return await upsertUserEverywhere(newUser);
}

/**
 * Admin tạo tài khoản mới và cấp mật khẩu trực tiếp cho người dùng
 */
export async function adminCreateUser(params: {
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  department?: string;
  role?: UserRole;
  status?: UserStatus;
  allowedModules?: AppModuleId[];
  note?: string;
}): Promise<AppUser> {
  const cleanUsername = params.username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự.');
  }
  if (/\s/.test(cleanUsername)) {
    throw new Error('Tên đăng nhập không được chứa khoảng trắng.');
  }
  if (!params.password || params.password.trim().length < 4) {
    throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
  }
  if (!params.fullName.trim()) {
    throw new Error('Vui lòng nhập Họ và tên người dùng.');
  }

  const users = await fetchAllUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống!`);
  }

  const now = new Date().toISOString();
  const newUser: AppUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username: cleanUsername,
    passwordHash: hashPassword(params.password),
    plainPasswordHint: params.password.trim(),
    fullName: params.fullName.trim(),
    phone: params.phone?.trim() || '',
    department: params.department?.trim() || '',
    role: params.role || 'USER',
    status: params.status || 'ACTIVE',
    allowedModules:
      params.allowedModules && params.allowedModules.length > 0
        ? params.allowedModules
        : ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176'],
    createdAt: now,
    updatedAt: now,
    note: params.note?.trim() || 'Được tạo bởi Admin',
  };

  return await upsertUserEverywhere(newUser);
}

/**
 * Admin cập nhật trạng thái tài khoản (Kích hoạt / Tạm ngưng / Duyệt)
 */
export async function adminUpdateUserStatus(
  userId: string,
  newStatus: UserStatus
): Promise<AppUser> {
  const users = await fetchAllUsers();
  const target = users.find(u => u.id === userId);
  if (!target) {
    throw new Error('Không tìm thấy tài khoản người dùng.');
  }
  if (target.username.toLowerCase() === 'admin' && newStatus !== 'ACTIVE') {
    throw new Error('Không thể tạm ngưng tài khoản Quản trị viên tối cao (admin)!');
  }

  const updated: AppUser = {
    ...target,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  return await upsertUserEverywhere(updated);
}

/**
 * Admin Reset mật khẩu cho người dùng (hoặc tự đổi mật khẩu)
 */
export async function adminResetUserPassword(
  userId: string,
  newPassword: string
): Promise<AppUser> {
  const cleanNewPass = newPassword ? newPassword.trim() : '';
  if (cleanNewPass.length < 4) {
    throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
  }

  const users = await fetchAllUsers();
  const session = getCurrentSession();
  const target = users.find(
    u =>
      u.id === userId ||
      (session &&
        session.user.id === userId &&
        u.username.toLowerCase() === session.user.username.toLowerCase())
  );

  if (!target) {
    throw new Error('Không tìm thấy tài khoản người dùng.');
  }

  const updated: AppUser = {
    ...target,
    passwordHash: hashPassword(cleanNewPass),
    plainPasswordHint: cleanNewPass,
    updatedAt: new Date().toISOString(),
  };

  const saved = await upsertUserEverywhere(updated);

  if (
    session &&
    (session.user.id === saved.id ||
      session.user.username.toLowerCase() === saved.username.toLowerCase())
  ) {
    saveCurrentSession({ ...session, user: saved });
  }

  return saved;
}

/**
 * Admin cập nhật thông tin & phân quyền của người dùng
 */
export async function adminUpdateUserInfo(
  userId: string,
  updates: {
    fullName?: string;
    phone?: string;
    department?: string;
    role?: UserRole;
    allowedModules?: AppModuleId[];
    note?: string;
  }
): Promise<AppUser> {
  const users = await fetchAllUsers();
  const target = users.find(u => u.id === userId);
  if (!target) {
    throw new Error('Không tìm thấy tài khoản người dùng.');
  }

  if (target.username.toLowerCase() === 'admin' && updates.role && updates.role !== 'ADMIN') {
    throw new Error('Không thể hạ quyền của tài khoản Quản trị viên gốc (admin)!');
  }

  const updated: AppUser = {
    ...target,
    fullName: updates.fullName !== undefined ? updates.fullName.trim() : target.fullName,
    phone: updates.phone !== undefined ? updates.phone.trim() : target.phone,
    department: updates.department !== undefined ? updates.department.trim() : target.department,
    role: updates.role !== undefined ? updates.role : target.role,
    allowedModules:
      updates.allowedModules !== undefined ? updates.allowedModules : target.allowedModules,
    note: updates.note !== undefined ? updates.note.trim() : target.note,
    updatedAt: new Date().toISOString(),
  };

  const saved = await upsertUserEverywhere(updated);

  const session = getCurrentSession();
  if (
    session &&
    (session.user.id === saved.id ||
      session.user.username.toLowerCase() === saved.username.toLowerCase())
  ) {
    saveCurrentSession({ ...session, user: saved });
  }

  return saved;
}

/**
 * Admin xóa vĩnh viễn tài khoản người dùng
 */
export async function adminDeleteUser(userId: string): Promise<void> {
  const users = await fetchAllUsers();
  const target = users.find(u => u.id === userId);
  if (!target) {
    throw new Error('Không tìm thấy tài khoản cần xóa.');
  }
  if (target.username.toLowerCase() === 'admin') {
    throw new Error('Không thể xóa tài khoản Quản trị viên tối cao (admin)!');
  }

  const localDeleted = loadLocalDeletedIds();
  if (!localDeleted.includes(target.id)) localDeleted.push(target.id);
  if (!localDeleted.includes(target.username.toLowerCase())) {
    localDeleted.push(target.username.toLowerCase());
  }
  saveLocalDeletedIds(localDeleted);

  const nextUsers = users.filter(
    u => u.id !== userId && u.username.toLowerCase() !== target.username.toLowerCase()
  );
  saveLocalUsers(nextUsers);

  const cloudResult = await callCloudUsersApi({
    action: 'DELETE',
    userId: target.id,
    username: target.username,
  });

  if (cloudResult && Array.isArray(cloudResult.users)) {
    saveLocalUsers(cloudResult.users, cloudResult.deletedIds);
    saveLocalDeletedIds(cloudResult.deletedIds);
  }
}

/**
 * Người dùng tự đổi mật khẩu của chính mình
 */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<AppUser> {
  const cleanCurrent = currentPassword ? currentPassword.trim() : '';
  const cleanNew = newPassword ? newPassword.trim() : '';

  if (cleanNew.length < 4) {
    throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
  }

  const users = await fetchAllUsers();
  const session = getCurrentSession();
  const target = users.find(
    u =>
      u.id === userId ||
      (session &&
        session.user.id === userId &&
        u.username.toLowerCase() === session.user.username.toLowerCase())
  );

  if (!target) {
    throw new Error('Không tìm thấy tài khoản của bạn.');
  }

  const currentHash = hashPassword(cleanCurrent);
  const sessionHash = session?.user ? hashPassword(cleanCurrent) : '';
  const matchesTarget =
    target.passwordHash === currentHash || target.plainPasswordHint === cleanCurrent;
  const matchesSession =
    session?.user &&
    (session.user.passwordHash === sessionHash ||
      session.user.plainPasswordHint === cleanCurrent);

  if (!matchesTarget && !matchesSession) {
    throw new Error('Mật khẩu hiện tại không chính xác!');
  }

  return await adminResetUserPassword(target.id, cleanNew);
}
