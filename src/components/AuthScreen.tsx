import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, User, Eye, EyeOff, LogIn, UserPlus,
  Phone, Building2, AlertTriangle, CheckCircle2, KeyRound, FileText
} from 'lucide-react';
import {
  AppUser,
  fetchAllUsers,
  loginWithCredentials,
  registerUserAccount,
} from '../lib/authService';

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
  forcedLogoutMessage?: string | null;
}

export default function AuthScreen({
  onLoginSuccess,
  forcedLogoutMessage,
}: AuthScreenProps) {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  useEffect(() => {
    fetchAllUsers().catch(() => {});
  }, []);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(forcedLogoutMessage || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regNote, setRegNote] = useState('');

  // Hàm xóa trắng form đăng ký
  const resetRegisterForm = () => {
    setRegFullName('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegPhone('');
    setRegDepartment('');
    setRegNote('');
  };

  // Tự động xóa trắng khi mở tab đăng ký
  useEffect(() => {
    if (tab === 'REGISTER') {
      resetRegisterForm();
    }
  }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const user = await loginWithCredentials(username, password, rememberMe);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await registerUserAccount({
        username: regUsername,
        password: regPassword,
        fullName: regFullName,
        phone: regPhone,
        department: regDepartment,
        note: regNote,
      });
      setSuccessMsg(
        `🎉 Đăng ký tài khoản "${created.username}" thành công! Tài khoản hiện đang ở trạng thái CHỜ DUYỆT. Vui lòng báo Quản trị viên (Nguyễn Đoàn Minh Ánh) kích hoạt để đăng nhập.`
      );
      setUsername(created.username);
      setPassword('');
      setRegFullName('');
      setRegUsername('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegPhone('');
      setRegDepartment('');
      setRegNote('');
      setTab('LOGIN');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đăng ký tài khoản thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 pb-14 relative select-none"
      style={{
        backgroundImage: "url('/hinh_nen.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Lớp phủ tối giúp form đăng nhập nổi bật */}
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />

      {/* Khối Đăng nhập / Đăng ký trung tâm */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
        {/* Header thương hiệu */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-emerald-300" />
          </div>
          <h1 className="text-lg font-black tracking-tight uppercase">
            ĐỐI CHIẾU 01 & CHỨNG TỪ TT25
          </h1>
          <p className="text-xs text-blue-200 font-semibold mt-0.5">
            Hệ thống Đối chiếu BHYT • KSK • Đọc & Ký số XML 3176
          </p>
        </div>

        {/* Chuyển đổi Đăng nhập / Đăng ký */}
        <div className="grid grid-cols-2 bg-slate-100 p-1.5 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              tab === 'LOGIN'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            ĐĂNG NHẬP
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              tab === 'REGISTER'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            ĐĂNG KÝ TÀI KHOẢN
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="whitespace-pre-line leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="whitespace-pre-line leading-relaxed">{successMsg}</span>
            </div>
          )}

          {tab === 'LOGIN' ? (
            <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên đăng nhập (Username)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="off"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập..."
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu được cấp..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                  🔒 Tự động đăng xuất khi F5 hoặc thoát web
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setErrorMsg(
                      '🔑 Nếu quên mật khẩu, vui lòng liên hệ Quản trị viên (Nguyễn Đoàn Minh Ánh - IT Y Tế Đà Nẵng) để được Reset mật khẩu!'
                    )
                  }
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? 'Đang xác thực tài khoản...' : 'Đăng nhập vào phần mềm'}
              </button>

              <div className="pt-3 border-t border-slate-200 text-center text-[11px] text-slate-500">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('REGISTER');
                    setErrorMsg(null);
                  }}
                  className="text-indigo-600 font-extrabold hover:underline cursor-pointer"
                >
                  Đăng ký tài khoản mới
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} autoComplete="off" className="space-y-3">
              {/* Dummy inputs vô hình để bẫy Chrome Password Manager không tự động điền tài khoản đã lưu vào form đăng ký */}
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }} aria-hidden="true">
                <input type="text" name="fake_chrome_autofill_user" tabIndex={-1} autoComplete="username" />
                <input type="password" name="fake_chrome_autofill_pwd" tabIndex={-1} autoComplete="current-password" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Điền thông tin để đăng ký tài khoản thành viên mới
                </span>
                <button
                  type="button"
                  onClick={resetRegisterForm}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Xóa trắng form
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên nhân viên / Bác sĩ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    name="custom_reg_fullname"
                    autoComplete="off"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="VD: BS. Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      name="custom_reg_username"
                      autoComplete="off"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value.replace(/\s+/g, ''))}
                      placeholder="VD: bsnguyenvana"
                      className="w-full pl-8 pr-2.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="custom_reg_phone"
                      autoComplete="off"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="SĐT liên hệ..."
                      className="w-full pl-8 pr-2.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khoa / Phòng / Đơn vị CSKCB
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="custom_reg_department"
                    autoComplete="off"
                    value={regDepartment}
                    onChange={e => setRegDepartment(e.target.value)}
                    placeholder="VD: Khoa Khám bệnh / Phòng KHTH..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    name="custom_reg_password"
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 4 ký tự"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhập lại mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    name="custom_reg_confirm_password"
                    autoComplete="new-password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú gửi Admin
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    name="custom_reg_note"
                    autoComplete="off"
                    value={regNote}
                    onChange={e => setRegNote(e.target.value)}
                    placeholder="Ghi chú chức vụ hoặc công việc phụ trách..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Đang gửi đăng ký...' : 'Gửi Đăng ký Tài khoản'}
              </button>
            </form>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-semibold">
          Quản trị hệ thống: <span className="text-slate-800 font-extrabold">NGUYỄN ĐOÀN MINH ÁNH – IT Y TẾ ĐÀ NẴNG</span>
        </div>
      </div>

      {/* Thanh chân trang nền lon bia Tiger Bạc xếp ngang cố định dưới cùng */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 h-[38px] border-t border-slate-300 shadow-lg flex items-center justify-between px-4 text-[10.5px] select-none overflow-hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/tiger_crystal.png')",
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
            backgroundPosition: 'left center',
            backgroundColor: '#ffffff',
            zIndex: 0,
          }}
        />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[0.3px]" style={{ zIndex: 1 }} />
        <div className="relative flex items-center justify-between w-full" style={{ zIndex: 2 }}>
          <span className="font-semibold text-slate-800 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded shadow-xs border border-slate-300/80 tracking-tight">
            ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
          </span>
          <span className="font-extrabold text-blue-900 bg-white/95 backdrop-blur-md px-3 py-0.5 rounded shadow-xs border border-blue-300/80 tracking-wide">
            NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
          </span>
          <span className="font-semibold text-slate-700 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded shadow-xs border border-slate-300/80">
            v2.0 · egw.baohiemxahoi.gov.vn
          </span>
        </div>
      </footer>
    </div>
  );
}

