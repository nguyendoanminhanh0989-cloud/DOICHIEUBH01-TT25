import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Users, UserPlus, KeyRound, Trash2, ShieldCheck, ShieldAlert,
  CheckCircle2, PauseCircle, PlayCircle, Search, RefreshCw, Copy,
  Eye, EyeOff, Edit3, Lock, Check, AlertTriangle, Sparkles, Database, Cloud, ExternalLink
} from 'lucide-react';
import {
  AppUser,
  AppModuleId,
  UserRole,
  UserStatus,
  ALL_MODULES,
  fetchAllUsers,
  adminCreateUser,
  adminUpdateUserStatus,
  adminResetUserPassword,
  adminUpdateUserInfo,
  adminDeleteUser,
  changeOwnPassword,
  syncAllUsersToSupabase,
} from '../lib/authService';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseUsersTableConnection,
} from '../lib/supabase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onCurrentUserUpdated: (updated: AppUser) => void;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  currentUser,
  onCurrentUserUpdated,
}: UserManagementModalProps) {
  const isAdmin = currentUser.role === 'ADMIN';
  const [activeView, setActiveView] = useState<'USERS_LIST' | 'CREATE_USER' | 'MY_PROFILE' | 'SUPABASE_CONFIG'>(
    isAdmin ? 'USERS_LIST' : 'MY_PROFILE'
  );

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // State tạo tài khoản mới (Admin)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newModules, setNewModules] = useState<AppModuleId[]>([
    'DOI_SOAT',
    'CHUNG_TU',
    'KHAM_SUC_KHOE',
    'XML_3176',
  ]);
  const [newNote, setNewNote] = useState('');

  // State Modal Reset mật khẩu cho 1 user
  const [resetTargetUser, setResetTargetUser] = useState<AppUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  // State Modal Sửa thông tin & Phân quyền cho 1 user
  const [editTargetUser, setEditTargetUser] = useState<AppUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editModules, setEditModules] = useState<AppModuleId[]>([]);
  const [editNote, setEditNote] = useState('');

  // State Đổi mật khẩu cá nhân
  const [currentPwd, setCurrentPwd] = useState('');
  const [nextPwd, setNextPwd] = useState('');
  const [confirmNextPwd, setConfirmNextPwd] = useState('');

  // State Cấu hình Supabase (Admin)
  const initialSbConfig = useMemo(() => {
    const conf = getSupabaseConfig();
    const correctUrl = 'https://lfklyofxesbhmladfcbq.supabase.co';
    const correctKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma2x5b2Z4ZXNiaG1sYWRmY2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTg5MjgsImV4cCI6MjA5MjA3NDkyOH0.cJVlZIqF-30qcqP_BNkT3S7BpoXOGjQ2ZTK1Qj4bGUA';
    if (
      !conf.url ||
      conf.url.includes('vqoycqhunrcyrhjjhcbk') ||
      !conf.key ||
      conf.key.includes('vqoycqhunrcyrhjjhcbk')
    ) {
      conf.url = correctUrl;
      conf.key = correctKey;
      saveSupabaseConfig(conf.url, conf.key);
    }
    return conf;
  }, []);
  const [sbUrl, setSbUrl] = useState(initialSbConfig.url);
  const [sbKey, setSbKey] = useState(initialSbConfig.key);
  const [sbTestResult, setSbTestResult] = useState<{
    success: boolean;
    message: string;
    tableReady?: boolean;
  } | null>(null);
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [isSyncingSb, setIsSyncingSb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadUsers = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const list = await fetchAllUsers();
      setUsers(list);
    } catch (e: any) {
      setNotice({ ok: false, msg: e?.message || 'Lỗi tải danh sách người dùng' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setNotice(null);
      if (isAdmin) {
        loadUsers();
        const timer = setInterval(() => {
          fetchAllUsers()
            .then(list => setUsers(list))
            .catch(() => {});
        }, 8000);
        return () => clearInterval(timer);
      } else {
        setActiveView('MY_PROFILE');
      }
    }
  }, [isOpen, isAdmin]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.status === 'ACTIVE').length,
      pending: users.filter(u => u.status === 'PENDING').length,
      suspended: users.filter(u => u.status === 'SUSPENDED').length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q))
      );
    });
  }, [users, searchTerm, statusFilter]);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TK@${pass}`;
  };

  const copyCredentials = (username: string, pass: string, fullName: string) => {
    const text = `Thông tin đăng nhập Phần mềm Đối chiếu 01 & Chứng từ TT25:\n- Link: ${window.location.origin}\n- Người dùng: ${fullName}\n- Tên đăng nhập: ${username}\n- Mật khẩu: ${pass}`;
    navigator.clipboard.writeText(text);
    setNotice({
      ok: true,
      msg: `📋 Đã sao chép thông tin tài khoản "${username}" vào bộ nhớ tạm để gửi cho người dùng!`,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setIsLoading(true);
    try {
      const created = await adminCreateUser({
        username: newUsername,
        password: newPassword,
        fullName: newFullName,
        phone: newPhone,
        department: newDepartment,
        role: newRole,
        status: 'ACTIVE',
        allowedModules: newModules,
        note: newNote,
      });
      await loadUsers();
      setNotice({
        ok: true,
        msg: `✅ Đã tạo tài khoản "${created.username}" (Mật khẩu: ${newPassword}) cho ${created.fullName}!`,
      });
      setNewUsername('');
      setNewFullName('');
      setNewPhone('');
      setNewDepartment('');
      setNewNote('');
      setActiveView('USERS_LIST');
    } catch (err: any) {
      setNotice({ ok: false, msg: err?.message || 'Lỗi tạo tài khoản' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (u: AppUser, targetStatus: UserStatus) => {
    setNotice(null);
    setIsLoading(true);
    try {
      const updated = await adminUpdateUserStatus(u.id, targetStatus);
      await loadUsers();
      const statusLabel =
        targetStatus === 'ACTIVE'
          ? 'KÍCH HOẠT HOẠT ĐỘNG'
          : targetStatus === 'SUSPENDED'
          ? 'TẠM NGƯNG HOẠT ĐỘNG'
          : 'CHỜ DUYỆT';
      setNotice({
        ok: true,
        msg: `Đã chuyển trạng thái tài khoản "${updated.username}" (${updated.fullName}) sang: ${statusLabel}.`,
      });
    } catch (err: any) {
      setNotice({ ok: false, msg: err?.message || 'Không thể cập nhật trạng thái' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setNotice(null);
    setIsLoading(true);
    try {
      const updated = await adminResetUserPassword(resetTargetUser.id, resetPasswordValue);
      await loadUsers();
      if (updated.id === currentUser.id) {
        onCurrentUserUpdated(updated);
      }
      setNotice({
        ok: true,
        msg: `🔑 Đã Reset mật khẩu cho tài khoản "${updated.username}" thành: ${resetPasswordValue.trim()}`,
      });
      setResetTargetUser(null);
      setResetPasswordValue('');
    } catch (err: any) {
      setNotice({ ok: false, msg: err?.message || 'Lỗi reset mật khẩu' });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditUserModal = (u: AppUser) => {
    setEditTargetUser(u);
    setEditFullName(u.fullName);
    setEditPhone(u.phone || '');
    setEditDepartment(u.department || '');
    setEditRole(u.role);
    setEditModules(
      u.allowedModules && u.allowedModules.length > 0
        ? u.allowedModules
        : ['DOI_SOAT', 'CHUNG_TU', 'KHAM_SUC_KHOE', 'XML_3176']
    );
    setEditNote(u.note || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;
    setNotice(null);
    setIsLoading(true);
    try {
      const updated = await adminUpdateUserInfo(editTargetUser.id, {
        fullName: editFullName,
        phone: editPhone,
        department: editDepartment,
        role: editRole,
        allowedModules: editModules,
        note: editNote,
      });
      await loadUsers();
      if (updated.id === currentUser.id) {
        onCurrentUserUpdated(updated);
      }
      setNotice({
        ok: true,
        msg: `✅ Đã cập nhật thông tin & quyền hạn cho tài khoản "${updated.username}"!`,
      });
      setEditTargetUser(null);
    } catch (err: any) {
      setNotice({ ok: false, msg: err?.message || 'Lỗi cập nhật thông tin' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (u: AppUser) => {
    if (u.username.toLowerCase() === 'admin') {
      alert('Không thể xóa tài khoản Quản trị viên tối cao (admin)!');
      return;
    }
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${u.username}" (${u.fullName}) khỏi hệ thống không?`
      )
    ) {
      return;
    }
    setNotice(null);
    setIsLoading(true);
    try {
      await adminDeleteUser(u.id);
      await loadUsers();
      setNotice({
        ok: true,
        msg: `🗑️ Đã xóa vĩnh viễn tài khoản "${u.username}" (${u.fullName}) khỏi hệ thống.`,
      });
    } catch (err: any) {
      setNotice({ ok: false, msg: err?.message || 'Lỗi xóa tài khoản' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelfChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (nextPwd !== confirmNextPwd) {
      setNotice({ ok: false, msg: 'Mật khẩu mới xác nhận không khớp!' });
      return;
    }
    setIsLoading(true);
    try {
      const updated = await changeOwnPassword(currentUser.id, currentPwd, nextPwd);
      onCurrentUserUpdated(updated);
      if (isAdmin) await loadUsers();
      setCurrentPwd('');
      setNextPwd('');
      setConfirmNextPwd('');
      setNotice({ ok: true, msg: '✅ Đã đổi mật khẩu cá nhân thành công!' });
    } catch (err: any) {
      setNotice({ ok: false, msg: err?.message || 'Lỗi đổi mật khẩu' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(sbUrl, sbKey);
    setNotice({
      ok: true,
      msg: '✅ Đã lưu cấu hình Supabase! Bạn có thể bấm "Kiểm tra kết nối" hoặc "Đồng bộ tài khoản" ngay.',
    });
  };

  const handleResetSbDefault = () => {
    const defaultUrl = 'https://lfklyofxesbhmladfcbq.supabase.co';
    const defaultKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma2x5b2Z4ZXNiaG1sYWRmY2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTg5MjgsImV4cCI6MjA5MjA3NDkyOH0.cJVlZIqF-30qcqP_BNkT3S7BpoXOGjQ2ZTK1Qj4bGUA';
    setSbUrl(defaultUrl);
    setSbKey(defaultKey);
    saveSupabaseConfig(defaultUrl, defaultKey);
    setNotice({ ok: true, msg: 'Đã khôi phục URL & Key Supabase về dự án anhkan0989.' });
  };

  const handleTestSbConnection = async () => {
    setIsTestingSb(true);
    setSbTestResult(null);
    try {
      saveSupabaseConfig(sbUrl, sbKey);
      const res = await testSupabaseUsersTableConnection();
      setSbTestResult(res);
    } catch (err: any) {
      setSbTestResult({
        success: false,
        message: err?.message || 'Không thể kết nối đến máy chủ Supabase.',
      });
    } finally {
      setIsTestingSb(false);
    }
  };

  const handleSyncAllUsersToSb = async () => {
    setIsSyncingSb(true);
    setNotice(null);
    try {
      saveSupabaseConfig(sbUrl, sbKey);
      const res = await syncAllUsersToSupabase();
      if (res.success) {
        setNotice({
          ok: true,
          msg: `🎉 ${res.message}`,
        });
        await loadUsers();
      } else {
        setNotice({
          ok: false,
          msg: `⚠️ ${res.message}`,
        });
      }
    } catch (err: any) {
      setNotice({
        ok: false,
        msg: err?.message || 'Lỗi đồng bộ lên Supabase',
      });
    } finally {
      setIsSyncingSb(false);
    }
  };

  const sqlSchemaCode = `-- Dán đoạn mã này vào SQL Editor trên Supabase để tạo bảng quản lý người dùng:
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plain_password_hint TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'ACTIVE',
    allowed_modules JSONB DEFAULT '["DOI_SOAT","CHUNG_TU","KHAM_SUC_KHOE","XML_3176"]'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users (username);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON public.app_users (status);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép anon thao tác bảng quản lý người dùng"
ON public.app_users
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
    setNotice({
      ok: true,
      msg: '📋 Đã sao chép câu lệnh SQL tạo bảng app_users! Hãy mở Supabase SQL Editor và dán để chạy.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                {isAdmin
                  ? 'QUẢN TRỊ NGƯỜI DÙNG & PHÂN QUYỀN HỆ THỐNG (ADMIN CONSOLE)'
                  : 'THÔNG TIN TÀI KHOẢN & ĐỔI MẬT KHẨU'}
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {currentUser.role === 'ADMIN' ? 'QUYỀN ADMIN TỐI CAO' : 'TÀI KHOẢN NHÂN VIÊN'}
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Đang đăng nhập: <b>{currentUser.fullName}</b> ({currentUser.username})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh chuyển Tab */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveView('USERS_LIST')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeView === 'USERS_LIST'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Danh sách người dùng ({stats.total})
                  {stats.pending > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                      {stats.pending} chờ duyệt
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('CREATE_USER');
                    setNewUsername('');
                    setNewFullName('');
                    setNewPhone('');
                    setNewDepartment('');
                    setNewNote('');
                    setNewPassword(generateRandomPassword());
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeView === 'CREATE_USER'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Tạo tài khoản & Cấp mật khẩu
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveView('MY_PROFILE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                activeView === 'MY_PROFILE'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Đổi mật khẩu của tôi ({currentUser.username})
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveView('SUPABASE_CONFIG');
                  const conf = getSupabaseConfig();
                  setSbUrl(conf.url);
                  setSbKey(conf.key);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  activeView === 'SUPABASE_CONFIG'
                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-50'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Cơ sở dữ liệu Supabase
              </button>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới dữ liệu
            </button>
          )}
        </div>

        {/* Nội dung chính */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {notice && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                notice.ok
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {notice.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{notice.msg}</span>
              </div>
              <button
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* VIEW 1: DANH SÁCH NGƯỜI DÙNG (ADMIN) */}
          {isAdmin && activeView === 'USERS_LIST' && (
            <div className="space-y-4">
              {/* 4 Thẻ thống kê */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Tổng tài khoản</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Đang hoạt động</div>
                  <div className="text-xl font-black text-emerald-800 mt-0.5">{stats.active}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-700 uppercase">Chờ phê duyệt</div>
                  <div className="text-xl font-black text-amber-800 mt-0.5">{stats.pending}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200">
                  <div className="text-[11px] font-bold text-rose-700 uppercase">Đang tạm ngưng</div>
                  <div className="text-xl font-black text-rose-800 mt-0.5">{stats.suspended}</div>
                </div>
              </div>

              {/* Bộ lọc & Tìm kiếm */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'ALL', label: `Tất cả (${stats.total})` },
                      { id: 'ACTIVE', label: `Đang hoạt động (${stats.active})` },
                      { id: 'PENDING', label: `Chờ duyệt (${stats.pending})` },
                      { id: 'SUSPENDED', label: `Tạm ngưng (${stats.suspended})` },
                    ] as { id: 'ALL' | UserStatus; label: string }[]
                  ).map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        statusFilter === f.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên, username, khoa phòng, SĐT..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Bảng danh sách tài khoản */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
                        <th className="py-2.5 px-3">Người dùng / Khoa phòng</th>
                        <th className="py-2.5 px-3">Tên ĐN & Mật khẩu cấp</th>
                        <th className="py-2.5 px-3">Vai trò & Module được phép</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Thao tác Quản trị (Admin)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUsers.map(u => {
                        const isRootAdmin = u.username.toLowerCase() === 'admin';
                        const showPass = Boolean(revealedPasswords[u.id]);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 align-top">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {u.fullName}
                                {u.id === currentUser.id && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-black">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {u.department || 'Chưa cập nhật khoa/phòng'}
                                {u.phone ? ` • 📞 ${u.phone}` : ''}
                              </div>
                              {u.note && (
                                <div className="text-[10.5px] text-slate-400 italic mt-0.5">
                                  Ghi chú: {u.note}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 align-top">
                              <div className="font-mono font-bold text-blue-700">{u.username}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[11px] text-slate-500">MK:</span>
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                  {showPass
                                    ? u.plainPasswordHint || '(Đã mã hóa)'
                                    : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedPasswords(prev => ({
                                      ...prev,
                                      [u.id]: !prev[u.id],
                                    }))
                                  }
                                  className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                                  title={showPass ? 'Ẩn mật khẩu' : 'Xem mật khẩu đã cấp'}
                                >
                                  {showPass ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                {u.plainPasswordHint && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyCredentials(u.username, u.plainPasswordHint!, u.fullName)
                                    }
                                    className="p-1 rounded hover:bg-blue-100 text-blue-600 cursor-pointer"
                                    title="Copy thông tin tài khoản & mật khẩu để gửi cho người dùng"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  u.role === 'ADMIN'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {u.role === 'ADMIN' ? 'ADMIN QUẢN TRỊ' : 'USER NHÂN VIÊN'}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {(u.allowedModules || []).map(mId => {
                                  const meta = ALL_MODULES.find(m => m.id === mId);
                                  return (
                                    <span
                                      key={mId}
                                      className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold"
                                    >
                                      {meta?.label || mId}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top">
                              {u.status === 'ACTIVE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Đang hoạt động
                                </span>
                              )}
                              {u.status === 'PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  Chờ Admin duyệt
                                </span>
                              )}
                              {u.status === 'SUSPENDED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                  Đã tạm ngưng
                                </span>
                              )}
                              <div className="text-[10px] text-slate-400 mt-1">
                                {u.lastLogin
                                  ? `ĐN cuối: ${new Date(u.lastLogin).toLocaleString('vi-VN')}`
                                  : 'Chưa đăng nhập'}
                              </div>
                            </td>

                            <td className="py-3 px-3 align-top text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                {/* Nút Duyệt kích hoạt nếu đang PENDING */}
                                {u.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(u, 'ACTIVE')}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                                    title="Duyệt và cho phép tài khoản này đăng nhập"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Duyệt TK
                                  </button>
                                )}

                                {/* Nút Tạm ngưng / Kích hoạt lại */}
                                {!isRootAdmin &&
                                  (u.status === 'ACTIVE' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(u, 'SUSPENDED')}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold cursor-pointer"
                                      title="Tạm ngưng hoạt động tài khoản này"
                                    >
                                      <PauseCircle className="w-3.5 h-3.5" />
                                      Tạm ngưng
                                    </button>
                                  ) : (
                                    u.status === 'SUSPENDED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStatus(u, 'ACTIVE')}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold cursor-pointer"
                                        title="Kích hoạt lại tài khoản này"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        Mở khóa
                                      </button>
                                    )
                                  ))}

                                {/* Nút Reset mật khẩu */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetTargetUser(u);
                                    setResetPasswordValue(generateRandomPassword());
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer"
                                  title="Reset cấp lại mật khẩu mới cho tài khoản này"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  Reset MK
                                </button>

                                {/* Nút Sửa / Phân quyền */}
                                <button
                                  type="button"
                                  onClick={() => openEditUserModal(u)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold cursor-pointer"
                                  title="Sửa thông tin & phân quyền module"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Sửa
                                </button>

                                {/* Nút Xóa tài khoản */}
                                {!isRootAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
                                    title="Xóa vĩnh viễn tài khoản này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                            Không tìm thấy tài khoản nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: TẠO TÀI KHOẢN MỚI & CẤP MẬT KHẨU (ADMIN) */}
          {isAdmin && activeView === 'CREATE_USER' && (
            <form
              onSubmit={handleCreateUser}
              autoComplete="off"
              className="max-w-2xl mx-auto bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4"
            >
              {/* Dummy hidden inputs để chống Chrome tự động điền tài khoản đã lưu */}
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }} aria-hidden="true">
                <input type="text" name="fake_chrome_autofill_adm_user" tabIndex={-1} autoComplete="username" />
                <input type="password" name="fake_chrome_autofill_adm_pwd" tabIndex={-1} autoComplete="current-password" />
              </div>

              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    TẠO TÀI KHOẢN MỚI & CẤP MẬT KHẨU CHO NGƯỜI DÙNG
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tài khoản do Admin tạo sẽ được kích hoạt sẵn (ACTIVE), người dùng có thể đăng nhập ngay lập tức.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewUsername('');
                    setNewFullName('');
                    setNewPhone('');
                    setNewDepartment('');
                    setNewNote('');
                    setNewPassword(generateRandomPassword());
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  Xóa trắng form
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập (Username) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="VD: bshung, ketoan01..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu cấp cho người dùng <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPassword(generateRandomPassword())}
                      className="px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
                      title="Tự sinh mật khẩu ngẫu nhiên"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Tự sinh
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên người dùng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    placeholder="VD: BS. Trần Văn Hùng"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="0905xxxxxx"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khoa / Phòng / Đơn vị
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    placeholder="VD: Phòng KHTH / Khoa Nội..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vai trò hệ thống
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="USER">USER — Nhân viên / Bác sĩ sử dụng</option>
                    <option value="ADMIN">ADMIN — Quản trị viên toàn quyền</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phân quyền các Module được phép truy cập:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_MODULES.map(m => {
                    const checked = newModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewModules(prev => [...prev, m.id]);
                            } else if (newModules.length > 1) {
                              setNewModules(prev => prev.filter(x => x !== m.id));
                            }
                          }}
                          className="accent-emerald-600"
                        />
                        {m.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Ghi chú thêm (nếu có)..."
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveView('USERS_LIST')}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Tạo tài khoản & Cấp mật khẩu
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: ĐỔI MẬT KHẨU CÁ NHÂN */}
          {activeView === 'MY_PROFILE' && (
            <form
              onSubmit={handleSelfChangePassword}
              className="max-w-md mx-auto bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4"
            >
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  ĐỔI MẬT KHẨU CÁ NHÂN ({currentUser.username})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Họ tên: <b>{currentUser.fullName}</b> • Vai trò: <b>{currentUser.role}</b>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="Nhập mật khẩu đang sử dụng..."
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={nextPwd}
                  onChange={e => setNextPwd(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)..."
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmNextPwd}
                  onChange={e => setConfirmNextPwd(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Lưu mật khẩu mới
              </button>
            </form>
          )}

          {/* VIEW 4: CẤU HÌNH SUPABASE (ĐÁM MÂY) */}
          {activeView === 'SUPABASE_CONFIG' && isAdmin && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Thẻ điều khiển & Trạng thái kết nối */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-indigo-900 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                      <Database className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black tracking-tight text-white uppercase">
                          Cơ sở dữ liệu Supabase (Primary Cloud Database)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          BẢO MẬT & ĐỘC LẬP
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        Lưu trữ an toàn, bền vững toàn bộ tài khoản người dùng, mật khẩu, phân quyền và dữ liệu chứng từ.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={isTestingSb}
                      onClick={handleTestSbConnection}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSb ? 'animate-spin' : ''}`} />
                      {isTestingSb ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </button>

                    <button
                      type="button"
                      disabled={isSyncingSb}
                      onClick={handleSyncAllUsersToSb}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Cloud className={`w-3.5 h-3.5 ${isSyncingSb ? 'animate-spin' : ''}`} />
                      {isSyncingSb ? 'Đang đồng bộ...' : 'Đồng bộ tài khoản lên Supabase ngay'}
                    </button>
                  </div>
                </div>

                {/* Kết quả kiểm tra Supabase */}
                {sbTestResult && (
                  <div
                    className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                      sbTestResult.success
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/60 border-red-500/40 text-red-200'
                    }`}
                  >
                    {sbTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold">
                        {sbTestResult.success ? 'KẾT NỐI SUPABASE THÀNH CÔNG' : 'CẢNH BÁO KẾT NỐI SUPABASE'}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">{sbTestResult.message}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Cấu hình URL & Key */}
              <form
                onSubmit={handleSaveSbConfig}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-purple-600" />
                    Thông số kết nối Supabase API
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetSbDefault}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer"
                  >
                    Khôi phục cấu hình mặc định
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supabase Project URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={sbUrl}
                    onChange={e => setSbUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    URL của dự án Supabase (Ví dụ: https://vqoycqhunrcyrhjjhcbk.supabase.co)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supabase Anon Public API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={sbKey}
                    onChange={e => setSbKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mã khóa công khai (Project API keys -&gt; anon / public) trên Supabase Dashboard.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Lưu cấu hình Supabase
                  </button>
                </div>
              </form>

              {/* Hướng dẫn khi dự án Supabase bị Tạm dừng (PAUSED) */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  LƯU Ý VỀ GÓI MIỄN PHÍ CỦA SUPABASE (FREE TIER) & TỰ ĐỘNG BẢO LƯU
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11.5px] leading-relaxed">
                  <li>
                    Trên gói Free của Supabase, nếu hệ thống không có người truy cập trong <b>7 ngày liên tục</b>, Supabase sẽ tạm dừng dự án (<b>PAUSED</b>) để tiết kiệm tài nguyên.
                  </li>
                  <li>
                    <b>Cách mở lại dự án (chỉ mất 1 phút):</b> Đăng nhập{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 font-bold underline inline-flex items-center gap-0.5"
                    >
                      supabase.com/dashboard <ExternalLink className="w-3 h-3 inline" />
                    </a>
                    , mở dự án và nhấn nút <b>"Restore project"</b>. Chờ 1-2 phút là cơ sở dữ liệu hoạt động lại bình thường.
                  </li>
                  <li>
                    <b>Dữ liệu của bạn luôn an toàn:</b> Toàn bộ tài khoản và cấu hình của đơn vị đã được hệ thống lưu trữ dự phòng 2 tầng (Cơ sở dữ liệu đám mây đa phân vùng + Trình duyệt), nên tài khoản nhân viên không bao giờ bị mất.
                  </li>
                </ul>
              </div>

              {/* Hộp mã SQL tạo bảng app_users */}
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Mã SQL tạo bảng <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">public.app_users</code>
                  </div>
                  <div className="flex items-center gap-2">
                  <a
                    href={`https://supabase.com/dashboard/project/${sbUrl.replace('https://','').replace('.supabase.co','').trim()}/sql/new`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg border border-blue-600 transition-all"
                    title="Mở Supabase SQL Editor để dán và chạy SQL bên dưới"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở SQL Editor
                  </a>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Đã chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép SQL
                      </>
                    )}
                  </button>
                  </div>
                </div>
                <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-48 text-emerald-300 leading-relaxed">
                  {sqlSchemaCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* MODAL CON: RESET MẬT KHẨU CHO NGƯỜI DÙNG */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmResetPassword}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  RESET MẬT KHẨU NGƯỜI DÙNG
                </h3>
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-700 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
                <div>
                  • Người dùng: <b>{resetTargetUser.fullName}</b>
                </div>
                <div>
                  • Tên đăng nhập: <b className="font-mono text-blue-700">{resetTargetUser.username}</b>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới cấp lại cho người dùng:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    value={resetPasswordValue}
                    onChange={e => setResetPasswordValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setResetPasswordValue(generateRandomPassword())}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Ngẫu nhiên
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Xác nhận Reset mật khẩu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL CON: SỬA THÔNG TIN & PHÂN QUYỀN */}
        {editTargetUser && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveEditUser}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  CHỈNH SỬA & PHÂN QUYỀN ({editTargetUser.username})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditTargetUser(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khoa / Phòng</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò</label>
                  <select
                    value={editRole}
                    disabled={editTargetUser.username.toLowerCase() === 'admin'}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                  >
                    <option value="USER">USER (Nhân viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phân quyền sử dụng các Module:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MODULES.map(m => {
                    const checked = editModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                          checked
                            ? 'bg-blue-50 border-blue-400 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditModules(prev => [...prev, m.id]);
                            } else if (editModules.length > 1) {
                              setEditModules(prev => prev.filter(x => x !== m.id));
                            }
                          }}
                          className="accent-blue-600"
                        />
                        {m.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditTargetUser(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

