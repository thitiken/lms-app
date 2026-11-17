import React, { useEffect, useState } from 'react';
import { Check, KeyRound, LogOut, ShieldCheck, User, UserCheck, Users, X } from 'lucide-react';
import { getScenarioForGroup } from '../data/scenarios';
import type { AuthSession } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialGroupId?: number | null;
  onClose: () => void;
  session: AuthSession;
  onStudentLogin: (studentCode: string, displayName: string, groupId: number) => Promise<AuthSession>;
  onTeacherLogin: () => Promise<AuthSession>;
  onLogout: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialGroupId,
  onClose,
  session,
  onStudentLogin,
  onTeacherLogin,
  onLogout,
}) => {
  const [tab, setTab] = useState<'student' | 'teacher'>(
    session.role === 'teacher' ? 'teacher' : 'student'
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number>(
    initialGroupId || session.groupId || 1
  );
  const [studentCode, setStudentCode] = useState(session.studentCode || '');
  const [displayName, setDisplayName] = useState(
    session.role === 'student' ? session.displayName : ''
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (initialGroupId && initialGroupId >= 1 && initialGroupId <= 10) {
        setSelectedGroupId(initialGroupId);
      } else if (session.groupId) {
        setSelectedGroupId(session.groupId);
      }
      if (session.role === 'student') {
        setStudentCode(session.studentCode || '');
        setDisplayName(session.displayName || '');
      }
    }
  }, [isOpen, initialGroupId, session]);

  if (!isOpen) return null;

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanName = displayName.trim();
    const cleanCode = studentCode.trim().replace(/\s+/g, '').toUpperCase();

    if (!cleanName) {
      setErrorMsg('กรุณากรอกชื่อ-สกุล หรือชื่อเล่นของคุณ');
      return;
    }
    if (!cleanCode) {
      setErrorMsg('กรุณากรอกรหัสนักเรียน เช่น 6701 หรือเลขที่ 15');
      return;
    }
    if (!/^[A-Z0-9_-]{1,32}$/.test(cleanCode)) {
      setErrorMsg(
        'รหัสนักเรียนต้องเป็นตัวเลขหรือตัวอักษรภาษาอังกฤษเท่านั้น เช่น 15, 6701 หรือ S101 (ส่วนชื่อ-สกุลให้กรอกในช่องชื่อด้านซ้าย)'
      );
      return;
    }
    setLoading(true);
    try {
      await onStudentLogin(cleanCode, cleanName, selectedGroupId);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await onTeacherLogin();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถยืนยันตัวตนครูผู้สอนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await onLogout();
    setLoading(false);
    onClose();
  };

  const selectedScenario = getScenarioForGroup(selectedGroupId);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl my-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900">
              เลือกกลุ่ม & เข้าสู่ระบบ EcoLab Studio
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              เลือกกลุ่มที่ 1–10 แล้วกรอกชื่อและรหัสนักเรียน เพื่อเข้าทำงานร่วมกับเพื่อนในกลุ่มเดียวกัน
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active session indicator */}
        {session.role !== 'guest' && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs sm:text-sm">
              <div className="font-bold text-slate-900">
                {session.role === 'teacher'
                  ? `ครูผู้สอน: ${session.displayName}`
                  : `${session.displayName} (รหัส ${session.studentCode})`}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {session.role === 'teacher'
                  ? session.email
                  : `กำลังอยู่ในกลุ่มที่ ${session.groupId} (${getScenarioForGroup(session.groupId || 1).shortTitle})`}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('student');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'student'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            นักเรียน (เลือกกลุ่ม 1–10)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('teacher');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'teacher'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ครูผู้สอน (Dashboard)
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {tab === 'student' ? (
          <form onSubmit={handleStudentSubmit} className="mt-5 space-y-5">
            {/* Step 1: Group 1-10 Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>ขั้นที่ 1: เลือกกลุ่มของคุณ (กลุ่ม 1 – กลุ่ม 10)</span>
                </label>
                <span className="text-xs font-semibold text-blue-700">
                  เลือก: กลุ่มที่ {selectedGroupId} ({selectedScenario.shortTitle})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((gId) => {
                  const sc = getScenarioForGroup(gId);
                  const isSelected = selectedGroupId === gId;
                  return (
                    <button
                      key={gId}
                      type="button"
                      onClick={() => setSelectedGroupId(gId)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-blue-400 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">กลุ่มที่ {gId}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </div>
                      <div
                        className={`text-[11px] mt-0.5 truncate ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {sc.shortTitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Name & Student Code */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="text-sm font-bold text-slate-900">
                ขั้นที่ 2: กรอกชื่อ และ รหัสนักเรียน เพื่อเข้ากลุ่มที่ {selectedGroupId}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="login-student-name" className="block text-xs font-semibold text-slate-800 mb-1.5">
                    ชื่อ-สกุล หรือ ชื่อเล่น <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-student-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="เช่น ต้นน้ำ ม.5/1"
                      maxLength={60}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-student-code" className="block text-xs font-semibold text-slate-800 mb-1.5">
                    รหัสนักเรียน <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-student-code"
                      type="text"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      placeholder="เช่น 6701 หรือเลขประจำตัว"
                      maxLength={32}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                ทุกคนที่เลือก <strong>กลุ่มที่ {selectedGroupId}</strong> จะเข้าไปทำงานร่วมกันในห้องกลุ่มที่ {selectedGroupId} และแสดงรายชื่อรวมกันใน Dashboard ทันที
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl cursor-pointer transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {loading
                  ? 'กำลังเข้าสู่กลุ่ม...'
                  : `เข้าร่วมกลุ่มที่ ${selectedGroupId} และเข้าสู่ระบบ`}
              </span>
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-sm text-slate-700 leading-relaxed space-y-1">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>สิทธิ์เฉพาะครูผู้สอนเท่านั้น</span>
              </div>
              <p className="text-xs text-slate-600">
                ครูผู้สอนเข้าสู่ระบบด้วยบัญชี Google เพื่อเปิด Dashboard แบบแยกกลุ่ม 1–10 ให้คะแนนเดี่ยวหรือคะแนนพิเศษ และควบคุมขั้นกิจกรรม
              </p>
            </div>

            <button
              type="button"
              onClick={handleTeacherGoogleLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{loading ? 'กำลังยืนยันตัวตน...' : 'เข้าสู่ระบบครูผู้สอนด้วย Google'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
