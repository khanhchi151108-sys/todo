import { useState } from 'react';
import { Sword, Shield, Lock, Mail, User, Eye, EyeOff, Check, AlertCircle, KeyRound, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ onAuthSuccess, showToast }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password strength checker
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passStrength = getPasswordStrength(password);

  const getStrengthLabel = (score) => {
    if (!password) return { text: '', color: 'bg-gray-700' };
    if (score <= 2) return { text: 'Mật khẩu yếu', color: 'bg-red-500' };
    if (score <= 3) return { text: 'Mật khẩu trung bình', color: 'bg-yellow-500' };
    return { text: 'Mật khẩu mạnh', color: 'bg-green-500' };
  };

  const handleAdminMasterLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (adminPin.trim() !== '151108' && adminPin.trim() !== 'admin' && adminPin.trim() !== 'Admin@123456') {
        throw new Error('Mã PIN không chính xác.');
      }

      // Fetch or ensure KhanhChi admin profile exists
      const { data: adminProfile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', 'KhanhChi')
        .maybeSingle();

      if (pErr) throw pErr;

      const adminUser = {
        id: 'admin-master-khanhchi',
        email: 'khanhchi151108@gmail.com',
        user_metadata: { username: 'KhanhChi' },
        name: 'KhanhChi',
        is_admin: true,
        ...(adminProfile || {
          username: 'KhanhChi',
          level: 99,
          exp: 9999,
          hp: 100,
          gold: 99999,
          streak: 99,
          title: 'Chủ Phòng Vô Song',
          border: 'border-yellow-400 shadow-[0_0_25px_#facc15] animate-pulse',
          double_xp: true
        })
      };

      showToast({
        type: 'level-up',
        title: 'Xác thực thành công',
        message: 'Chào mừng Admin KhanhChi!'
      });

      if (onAuthSuccess) {
        onAuthSuccess(adminUser);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMsg(err.message || 'Mã PIN không đúng.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (error) throw error;
        
        showToast({
          type: 'success',
          title: 'Đăng nhập thành công',
          message: 'Chào mừng trở lại!'
        });
        
        if (onAuthSuccess) onAuthSuccess(data.user);
      } else if (authMode === 'register') {
        // Validation for Sign Up
        if (username.trim().length < 3) {
          throw new Error('Tên nhân vật phải có ít nhất 3 ký tự.');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
        }
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp.');
        }

        // Sign Up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              username: username.trim()
            }
          }
        });

        if (error) throw error;

        // Ensure profile exists in profiles table
        if (data?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              username: username.trim(),
              level: 1,
              exp: 0,
              hp: 100,
              gold: 50,
              streak: 0,
              frozen_days: 0,
              title: 'Tân Binh'
            }, { onConflict: 'username' });

          if (profileError) {
            console.warn('Profile sync fallback:', profileError);
          }
        }

        showToast({
          type: 'success',
          title: 'Đăng ký thành công',
          message: 'Tài khoản đã sẵn sàng!'
        });

        if (onAuthSuccess) onAuthSuccess(data.user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let message = err.message || 'Có lỗi xảy ra trong quá trình xác thực.';
      if (message.includes('Invalid login credentials')) {
        message = 'Email hoặc mật khẩu không chính xác.';
      } else if (message.includes('User already registered')) {
        message = 'Email này đã được đăng ký.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrengthLabel(passStrength);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#1a1a2e]">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-gamePrimary rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-[45%] right-[10%] w-80 h-80 bg-gameEasy rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="game-card w-full max-w-md animate-fade-in-up border-gameSecondary/80 backdrop-blur-md shadow-2xl p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-2xl bg-gameSecondary/50 border border-gamePrimary/40 mb-3 shadow-[0_0_20px_rgba(233,69,96,0.3)]">
            <Sword className="w-9 h-9 text-gamePrimary animate-bounce" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-rpg text-transparent bg-clip-text bg-gradient-to-r from-gamePrimary via-pink-400 to-gameEasy">
            Quest Log RPG
          </h1>
        </div>

        {/* Mode switch tabs */}
        <div className="flex bg-[#0f172a] p-1 rounded-lg border border-gameSecondary mb-5 gap-1">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
              authMode === 'login' 
                ? 'bg-gamePrimary text-white shadow-md' 
                : 'text-gameText/60 hover:text-white'
            }`}
          >
            <KeyRound size={13} /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
              authMode === 'register' 
                ? 'bg-gameEasy text-white shadow-md' 
                : 'text-gameText/60 hover:text-white'
            }`}
          >
            <Shield size={13} /> Đăng ký
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('admin'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
              authMode === 'admin' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md' 
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <ShieldAlert size={13} /> Admin
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ADMIN LOGIN FORM */}
        {authMode === 'admin' ? (
          <form onSubmit={handleAdminMasterLogin} className="space-y-4 animate-fade-in">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-amber-300">
                Mã PIN Admin
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-amber-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="input-field pl-9 pr-9 text-sm border-amber-500/50 focus:border-amber-400"
                  placeholder="••••••••"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/30 transition-all mt-2"
            >
              {loading ? (
                <span className="animate-pulse">Đang xác thực...</span>
              ) : (
                <>
                  <ShieldAlert size={16} /> Xác nhận Admin
                </>
              )}
            </button>
          </form>
        ) : (
          /* USER LOGIN / REGISTER FORM */
          <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
            
            {/* Username (Register only) */}
            {authMode === 'register' && (
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gameText/90">
                  Tên nhân vật
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field pl-9 text-sm"
                    placeholder="Nhập tên nhân vật..."
                    required={authMode === 'register'}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gameText/90">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-9 text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gameText/90">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-9 pr-9 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength meter on register */}
              {authMode === 'register' && password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${passStrength >= 1 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                    <div className={`h-full transition-all duration-300 ${passStrength >= 2 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                    <div className={`h-full transition-all duration-300 ${passStrength >= 3 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                    <div className={`h-full transition-all duration-300 ${passStrength >= 4 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }}></div>
                  </div>
                  <div className="text-[10px] text-right text-gray-400 font-medium">{strength.text}</div>
                </div>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            {authMode === 'register' && (
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gameText/90">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-9 text-sm"
                    placeholder="••••••••"
                    required={authMode === 'register'}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center gap-2 py-3 rounded-lg font-bold text-sm text-white transition-all shadow-lg mt-2 ${
                authMode === 'login' 
                  ? 'bg-gamePrimary hover:bg-red-500 shadow-gamePrimary/40' 
                  : 'bg-gameEasy hover:bg-cyan-500 shadow-gameEasy/40'
              } ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <span className="animate-pulse">Đang xử lý...</span>
              ) : authMode === 'login' ? (
                <>
                  <KeyRound size={16} /> Đăng nhập
                </>
              ) : (
                <>
                  <Check size={16} /> Đăng ký
                </>
              )}
            </button>
          </form>
        )}

        {/* Security badge footer */}
        <div className="mt-6 pt-4 border-t border-gameSecondary/50 flex items-center justify-center gap-2 text-[11px] text-gray-400">
          <Shield size={14} className="text-green-400 shrink-0" />
          <span>Bảo mật TLS 1.3 &bull; Dữ liệu được mã hóa</span>
        </div>

      </div>
    </div>
  );
}
