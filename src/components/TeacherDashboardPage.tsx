import React, { useMemo, useState } from 'react';
import {
  Check,
  Lock,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { ACTIVITY_PHASES, getScenarioForGroup, isJoinedStudent } from '../data/scenarios';
import type {
  ActivityPhaseId,
  AppWorkspaceState,
  AuthSession,
  StudentScoreRecord,
  TeacherClassroomControl,
} from '../types';

interface TeacherDashboardPageProps {
  workspace: AppWorkspaceState;
  session: AuthSession;
  onTeacherLogin: () => Promise<AuthSession>;
  onOpenPublicScoreboard: () => void;
  onUpsertStudentScore: (record: StudentScoreRecord) => Promise<void>;
  onDeleteStudentScore: (studentCode: string) => Promise<void>;
  onSeedDefaultRoster?: () => void;
  onUpsertGroupScores: (
    groupId: number,
    records: StudentScoreRecord[],
    summaryLabel?: string
  ) => Promise<void>;
  onUpdateTeacherControls: (controls: Partial<TeacherClassroomControl>) => Promise<void>;
  onControlTimer: (
    action: 'start' | 'pause' | 'reset' | 'setPhase' | 'startPhase',
    phase?: ActivityPhaseId
  ) => void;
}

const RUBRIC_FIELDS: {
  key: keyof Pick<
    StudentScoreRecord,
    'canvasScore' | 'promptV1Score' | 'peerReviewScore' | 'promptV2Score' | 'vercelScore'
  >;
  label: string;
  max: number;
  barClass: string;
  trackClass: string;
}[] = [
  { key: 'canvasScore', label: 'Canvas', max: 20, barClass: 'bg-rose-500', trackClass: 'bg-rose-100' },
  { key: 'promptV1Score', label: 'Prompt V.1', max: 20, barClass: 'bg-sky-500', trackClass: 'bg-sky-100' },
  { key: 'peerReviewScore', label: 'คอมเมนต์', max: 15, barClass: 'bg-indigo-500', trackClass: 'bg-indigo-100' },
  { key: 'promptV2Score', label: 'แอป V.2', max: 25, barClass: 'bg-emerald-500', trackClass: 'bg-emerald-100' },
  { key: 'vercelScore', label: 'Vercel', max: 20, barClass: 'bg-blue-600', trackClass: 'bg-blue-100' },
];

export const TeacherDashboardPage: React.FC<TeacherDashboardPageProps> = ({
  workspace,
  session,
  onTeacherLogin,
  onOpenPublicScoreboard,
  onUpsertStudentScore,
  onDeleteStudentScore,
  onSeedDefaultRoster,
  onUpsertGroupScores,
  onUpdateTeacherControls,
  onControlTimer,
}) => {
  const [groupFilter, setGroupFilter] = useState<number | 'all'>('all');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'joined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradingMode, setGradingMode] = useState<'individual' | 'special'>('individual');
  const [draftScores, setDraftScores] = useState<Record<string, StudentScoreRecord>>({});
  const [savedTag, setSavedTag] = useState<string | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroupId, setNewGroupId] = useState<number>(1);
  const [addFeedback, setAddFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState(
    workspace.teacherControls?.announcement || ''
  );
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const allStudentRecords = useMemo(
    () => Object.values(workspace.studentScores || {}),
    [workspace.studentScores]
  );

  const joinedStudentsList = useMemo(
    () =>
      allStudentRecords
        .filter((rec) => isJoinedStudent(rec))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [allStudentRecords]
  );

  const groupedRecords = useMemo(() => {
    const groups: Record<number, StudentScoreRecord[]> = {};
    for (let g = 1; g <= 10; g++) groups[g] = [];
    const q = searchQuery.trim().toLowerCase();

    for (const rec of allStudentRecords) {
      if (rosterFilter === 'joined' && !isJoinedStudent(rec)) continue;
      if (
        q &&
        !rec.studentName.toLowerCase().includes(q) &&
        !rec.studentCode.toLowerCase().includes(q)
      ) {
        continue;
      }
      const gId = rec.groupId >= 1 && rec.groupId <= 10 ? rec.groupId : 1;
      groups[gId].push(rec);
    }
    for (let g = 1; g <= 10; g++) {
      groups[g].sort((a, b) => {
        const aReal = isJoinedStudent(a) ? 0 : 1;
        const bReal = isJoinedStudent(b) ? 0 : 1;
        if (aReal !== bReal) return aReal - bReal;
        return a.studentCode.localeCompare(b.studentCode);
      });
    }
    return groups;
  }, [allStudentRecords, rosterFilter, searchQuery]);

  // Strict RBAC Gate: Students CANNOT enter Teacher Dashboard
  if (session.role !== 'teacher') {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white border border-slate-300 rounded-2xl p-8 text-center space-y-5 shadow-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">
            จำกัดสิทธิ์: เฉพาะครูผู้สอนเท่านั้น
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            หน้า <strong>แดชบอร์ดครู (Teacher Control Dashboard)</strong> สงวนสิทธิ์เฉพาะครูผู้สอนที่ยืนยันตัวตนแล้วเท่านั้น
            นักเรียนสามารถดูหลอดค่าพลังคะแนนและ Timeline ได้ที่หน้า <strong>Timeline & ค่าพลัง</strong>
          </p>
        </div>

        {loginError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800">
            {loginError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenPublicScoreboard}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            ไปหน้า Timeline & ค่าพลัง
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setLoginError('');
              setSubmitting(true);
              try {
                await onTeacherLogin();
              } catch (err) {
                setLoginError(
                  err instanceof Error ? err.message : 'เข้าสู่ระบบครูผู้สอนไม่สำเร็จ'
                );
              } finally {
                setSubmitting(false);
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{submitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบครูผู้สอน (Google)'}</span>
          </button>
        </div>
      </div>
    );
  }

  const getEditingRecord = (rec: StudentScoreRecord): StudentScoreRecord => {
    const base = draftScores[rec.studentCode] || rec;
    return {
      ...base,
      bonusScore: Number(base.bonusScore || 0),
    };
  };

  const computeTotal = (rec: StudentScoreRecord) =>
    Number(rec.canvasScore || 0) +
    Number(rec.promptV1Score || 0) +
    Number(rec.peerReviewScore || 0) +
    Number(rec.promptV2Score || 0) +
    Number(rec.vercelScore || 0) +
    Number(rec.bonusScore || 0);

  const updateDraftField = (
    rec: StudentScoreRecord,
    field: keyof StudentScoreRecord,
    value: string | number | boolean
  ) => {
    const base = getEditingRecord(rec);
    const updated: StudentScoreRecord = { ...base, [field]: value } as StudentScoreRecord;
    updated.totalScore = computeTotal(updated);
    setDraftScores((prev) => ({ ...prev, [rec.studentCode]: updated }));
  };

  const handleSaveStudent = async (rec: StudentScoreRecord) => {
    const target = getEditingRecord(rec);
    await onUpsertStudentScore(target);
    setSavedTag(rec.studentCode);
    setTimeout(() => setSavedTag(null), 1800);
  };

  const handleAwardGroupBonus = async (groupId: number, delta: number) => {
    const members = groupedRecords[groupId] || [];
    if (members.length === 0) return;
    const updatedList = members.map((rec) => {
      const current = getEditingRecord(rec);
      const nextBonus =
        delta === 0 ? 0 : Math.min(20, Math.max(0, Number(current.bonusScore || 0) + delta));
      const next: StudentScoreRecord = {
        ...current,
        bonusScore: nextBonus,
      };
      next.totalScore = computeTotal(next);
      return next;
    });
    setDraftScores((prev) => {
      const copy = { ...prev };
      for (const item of updatedList) copy[item.studentCode] = item;
      return copy;
    });
    await onUpsertGroupScores(
      groupId,
      updatedList,
      delta === 0
        ? `ครูผู้สอนรีเซ็ตคะแนนพิเศษของกลุ่มที่ ${groupId}`
        : `ครูผู้สอนมอบคะแนนพิเศษ +${delta} ให้สมาชิกกลุ่มที่ ${groupId} ทุกคน`
    );
    setSavedTag(`group-${groupId}`);
    setTimeout(() => setSavedTag(null), 1800);
  };

  const handleApplyGroupScorePreset = async (
    groupId: number,
    preset: { canvas: number; v1: number; peer: number; v2: number; vercel: number }
  ) => {
    const members = groupedRecords[groupId] || [];
    if (members.length === 0) return;
    const updatedList = members.map((rec) => {
      const current = getEditingRecord(rec);
      const next: StudentScoreRecord = {
        ...current,
        canvasScore: preset.canvas,
        promptV1Score: preset.v1,
        peerReviewScore: preset.peer,
        promptV2Score: preset.v2,
        vercelScore: preset.vercel,
      };
      next.totalScore = computeTotal(next);
      return next;
    });
    setDraftScores((prev) => {
      const copy = { ...prev };
      for (const item of updatedList) copy[item.studentCode] = item;
      return copy;
    });
    await onUpsertGroupScores(
      groupId,
      updatedList,
      `ครูผู้สอนบันทึกคะแนนรวมทั้งกลุ่มที่ ${groupId} (${updatedList.length} คน)`
    );
    setSavedTag(`group-${groupId}`);
    setTimeout(() => setSavedTag(null), 1800);
  };

  const handleSaveWholeGroup = async (groupId: number) => {
    const members = groupedRecords[groupId] || [];
    if (members.length === 0) return;
    const updatedList = members.map((rec) => getEditingRecord(rec));
    await onUpsertGroupScores(groupId, updatedList);
    setSavedTag(`group-${groupId}`);
    setTimeout(() => setSavedTag(null), 1800);
  };

  const handleAddStudentCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFeedback(null);
    const cleanCode = newCode.trim().replace(/\s+/g, '').toUpperCase();
    const cleanName = newName.trim();
    if (!/^[A-Z0-9_-]{1,32}$/.test(cleanCode)) {
      setAddFeedback({
        type: 'err',
        text: 'รหัสนักเรียนต้องเป็นตัวเลขหรือตัวอักษรภาษาอังกฤษ 1–32 ตัว (เช่น 15, 6731 หรือ S101)',
      });
      return;
    }
    if (!cleanName) {
      setAddFeedback({ type: 'err', text: 'กรุณากรอกชื่อ-สกุลนักเรียน' });
      return;
    }

    await onUpsertStudentScore({
      studentCode: cleanCode,
      studentName: cleanName,
      groupId: newGroupId,
      active: true,
      joined: true,
      canvasScore: 0,
      promptV1Score: 0,
      peerReviewScore: 0,
      promptV2Score: 0,
      vercelScore: 0,
      bonusScore: 0,
      totalScore: 0,
      teacherNote: '',
      updatedAt: Date.now(),
    });
    setAddFeedback({
      type: 'ok',
      text: `เพิ่ม ${cleanName} (${cleanCode}) เข้ากลุ่มที่ ${newGroupId} เรียบร้อยแล้ว`,
    });
    setNewCode('');
    setNewName('');
  };

  const handleConfirmDeleteStudent = async (studentCode: string) => {
    await onDeleteStudentScore(studentCode);
    setConfirmDeleteCode(null);
    setDraftScores((prev) => {
      const copy = { ...prev };
      delete copy[studentCode];
      return copy;
    });
  };

  const toggleLockedPhase = (phaseId: ActivityPhaseId) => {
    const current = workspace.teacherControls?.lockedPhases || [];
    const next = current.includes(phaseId)
      ? current.filter((p) => p !== phaseId)
      : [...current, phaseId];
    onUpdateTeacherControls({ lockedPhases: next });
  };

  const visibleGroupIds = useMemo(() => {
    const base =
      groupFilter === 'all' ? Array.from({ length: 10 }, (_, i) => i + 1) : [groupFilter];
    if (searchQuery.trim() !== '') {
      return base.filter((gId) => (groupedRecords[gId] || []).length > 0);
    }
    return base;
  }, [groupFilter, searchQuery, groupedRecords]);

  return (
    <div className="space-y-6">
      {/* Teacher Header */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-400">
            แผงควบคุมครูผู้สอน · แสดงผลแบบแยกกลุ่ม 1–10 พร้อมหลอดค่าพลัง
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Teacher Dashboard — จัดการกลุ่ม ให้คะแนนเดี่ยว & คะแนนพิเศษ
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            เข้าสู่ระบบโดย {session.displayName} ({session.email})
          </p>
        </div>

        {/* Grading Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-xl shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setGradingMode('individual')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer transition-colors ${
              gradingMode === 'individual' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>โหมดให้คะแนนเดี่ยว (5 ด้าน)</span>
          </button>
          <button
            type="button"
            onClick={() => setGradingMode('special')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer transition-colors ${
              gradingMode === 'special' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>โหมดให้คะแนนพิเศษ</span>
          </button>
        </div>
      </div>

      {/* Classroom Controls & New Student Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Phase Locks & Announcement */}
        <div className="lg:col-span-7 bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
            ควบคุมการเข้าถึงกิจกรรม & ประกาศหน้าชั้นเรียน
          </h2>

          <div className="space-y-2">
            <label htmlFor="teacher-announcement" className="block text-xs font-semibold text-slate-700">
              ประกาศจากครูผู้สอน (แสดงให้ผู้เรียนทุกคนเห็นทันที)
            </label>
            <div className="flex gap-2">
              <input
                id="teacher-announcement"
                type="text"
                value={announcementDraft}
                onChange={(e) => setAnnouncementDraft(e.target.value)}
                placeholder="พิมพ์ข้อความแจ้งเตือนหรือคำสั่งกิจกรรม..."
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => onUpdateTeacherControls({ announcement: announcementDraft })}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shrink-0"
              >
                อัปเดตประกาศ
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-700">
              สั่งเริ่มภารกิจ 6 ขั้นตอน (ขั้นที่เลือกจะเด่นขึ้นบน Timeline ส่วนบนทันที) &amp; ล็อกขั้นกิจกรรม
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ACTIVITY_PHASES.map((phase) => {
                const isLocked = workspace.teacherControls?.lockedPhases?.includes(phase.id);
                const isActivePhase = workspace.timer?.activePhase === phase.id;
                const isRunningHere = isActivePhase && Boolean(workspace.timer?.isRunning);
                return (
                  <div
                    key={phase.id}
                    className={`p-2.5 rounded-xl border space-y-2 transition-colors ${
                      isRunningHere
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-200'
                        : isActivePhase
                        ? 'bg-slate-100 border-blue-400'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-900">
                      <span className="truncate">{phase.shortTitle}</span>
                      <button
                        type="button"
                        onClick={() => toggleLockedPhase(phase.id)}
                        title={isLocked ? 'ปลดล็อกขั้นนี้' : 'ล็อกขั้นนี้'}
                        className={`p-1 rounded-md border cursor-pointer shrink-0 ${
                          isLocked
                            ? 'bg-rose-100 border-rose-300 text-rose-800'
                            : 'bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isRunningHere ? (
                      <button
                        type="button"
                        onClick={() => onControlTimer('pause')}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>กำลังทำอยู่ (พักชั่วคราว)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onControlTimer('startPhase', phase.id)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>เริ่มกิจกรรมนี้</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-700 font-medium">
              อนุญาตให้นักเรียนดูหลอดค่าพลังรวมทั้งห้องได้
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateTeacherControls({
                  allowStudentScoreView: !workspace.teacherControls?.allowStudentScoreView,
                })
              }
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                workspace.teacherControls?.allowStudentScoreView
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {workspace.teacherControls?.allowStudentScoreView ? 'เปิดให้นักเรียนดูได้' : 'ปิดซ่อนคะแนนรวม'}
            </button>
          </div>
        </div>

        {/* Right: Add New Student Access Code */}
        <div id="add-student-panel" className="lg:col-span-5 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>เพิ่มนักเรียนใหม่เข้ากลุ่ม (1–10)</span>
          </h2>
          {addFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold border ${
                addFeedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {addFeedback.text}
            </div>
          )}
          <form onSubmit={handleAddStudentCode} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-student-code" className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสนักเรียน
                </label>
                <input
                  id="new-student-code"
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="6731"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="new-student-group" className="block text-xs font-semibold text-slate-700 mb-1">
                  สังกัดกลุ่ม
                </label>
                <select
                  id="new-student-group"
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      กลุ่มที่ {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="new-student-name" className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ-สกุลนักเรียน
              </label>
              <input
                id="new-student-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="นายต้นกล้า ใจดี"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={!newCode.trim() || !newName.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเข้ากลุ่มที่ {newGroupId}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Joined Students Quick Finder & Search Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>นักเรียนที่ Join Class แล้ว ({joinedStudentsList.length} คน)</span>
            </h2>
            <p className="text-xs text-slate-600">
              ซิงก์รายชื่อนักเรียนที่ลงชื่อเข้ากลุ่ม 1–10 อัตโนมัติจากทุกหน้าจอ · ทั้งหมดในระบบ{' '}
              <strong className="text-slate-900">{allStudentRecords.length}</strong> คน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
                aria-label="ค้นหานักเรียน"
                className="w-56 sm:w-64 pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setRosterFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                  rosterFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                ทั้งหมด ({allStudentRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter('joined')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                  rosterFilter === 'joined'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                เฉพาะที่ Join แล้ว ({joinedStudentsList.length})
              </button>
            </div>

            {allStudentRecords.length === 0 && onSeedDefaultRoster && (
              <button
                type="button"
                onClick={onSeedDefaultRoster}
                className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl cursor-pointer"
              >
                + สร้างรหัสตั้งต้น 6701–6730
              </button>
            )}
          </div>
        </div>

        {joinedStudentsList.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            ยังไม่มีนักเรียนลงชื่อ Join Class — เมื่อนักเรียนกดเลือกกลุ่ม 1–10 และเข้าสู่ระบบ ชื่อและรหัสนักเรียนจะมาปรากฏที่นี่ทันที
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {joinedStudentsList.map((st) => (
              <button
                key={st.studentCode}
                type="button"
                onClick={() => {
                  setGroupFilter(st.groupId);
                  setSearchQuery(st.studentCode);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 rounded-xl cursor-pointer transition-colors"
              >
                <span className="font-bold">{st.studentName}</span>
                <span className="font-mono text-emerald-800">({st.studentCode})</span>
                <span className="text-slate-500">·</span>
                <span className="font-semibold text-blue-700">กลุ่ม {st.groupId}</span>
              </button>
            ))}
            {(searchQuery || groupFilter !== 'all' || rosterFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGroupFilter('all');
                  setRosterFilter('all');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                แสดงทั้งหมด
              </button>
            )}
          </div>
        )}
      </div>

      {/* Group 1-10 Filter Tabs */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Users className="w-4 h-4 text-blue-600" />
          <span>เลือกดูและให้คะแนนรายกลุ่ม (กลุ่ม 1–10):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setGroupFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              groupFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ทุกกลุ่ม (1–10)
          </button>
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((gId) => {
            const count = (groupedRecords[gId] || []).length;
            return (
              <button
                key={gId}
                type="button"
                onClick={() => setGroupFilter(gId)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  groupFilter === gId
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                กลุ่ม {gId} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Student Power Bar Grading Cards (Groups 1–10) */}
      <div className="space-y-6">
        {visibleGroupIds.length === 0 && (
          <div className="bg-white border border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-600 space-y-2 shadow-sm">
            <div>ไม่พบนักเรียนที่ตรงกับคำค้นหา "{searchQuery}"</div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGroupFilter('all');
                setRosterFilter('all');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
        {visibleGroupIds.map((gId) => {
          const scenario = getScenarioForGroup(gId);
          const grp = workspace.groups[gId];
          const members = groupedRecords[gId] || [];
          const editedMembers = members.map(getEditingRecord);
          const avgTotal =
            editedMembers.length > 0
              ? Math.round(
                  editedMembers.reduce((sum, m) => sum + computeTotal(m), 0) /
                    editedMembers.length
                )
              : 0;
          const isGroupSaved = savedTag === `group-${gId}`;

          return (
            <section
              key={gId}
              className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Group Card Header */}
              <div className="p-5 sm:p-6 bg-slate-100 border-b border-slate-300 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-700">
                    <span>กลุ่มที่ {gId}</span>
                    <span aria-hidden="true">·</span>
                    <span>{scenario.shortTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span>สมาชิก {members.length} คน</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {grp?.groupName || `กลุ่มที่ ${gId}`}
                  </h2>

                  {/* Group Average Power Bar */}
                  <div className="flex items-center gap-3 max-w-md pt-1">
                    <span className="text-xs font-semibold text-slate-600 shrink-0">
                      หลอดค่าพลังเฉลี่ยกลุ่ม:
                    </span>
                    <div className="h-3 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, avgTotal)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-blue-700 tabular-nums shrink-0">
                      {avgTotal}/100
                    </span>
                  </div>
                </div>

                {/* Group Quick Actions (Batch Rubric / Batch Special Bonus / Save Group) */}
                <div className="flex flex-wrap items-center gap-2">
                  {gradingMode === 'special' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAwardGroupBonus(gId, 2)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg cursor-pointer"
                      >
                        +2 พิเศษทั้งกลุ่ม
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAwardGroupBonus(gId, 5)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 rounded-lg cursor-pointer"
                      >
                        +5 พิเศษทั้งกลุ่ม
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAwardGroupBonus(gId, 10)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                      >
                        +10 พิเศษทั้งกลุ่ม
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAwardGroupBonus(gId, 0)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
                      >
                        ล้างพิเศษกลุ่ม
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyGroupScorePreset(gId, {
                            canvas: 18,
                            v1: 18,
                            peer: 14,
                            v2: 22,
                            vercel: 18,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer"
                      >
                        ให้คะแนนดีมากทั้งกลุ่ม (90)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyGroupScorePreset(gId, {
                            canvas: 16,
                            v1: 16,
                            peer: 12,
                            v2: 20,
                            vercel: 16,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-lg cursor-pointer"
                      >
                        ให้คะแนนมาตรฐานกลุ่ม (80)
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupId(gId);
                      document.getElementById('new-student-code')?.focus();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มคนเข้ากลุ่มนี้</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveWholeGroup(gId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    {isGroupSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isGroupSaved ? 'บันทึกทั้งกลุ่มแล้ว' : 'บันทึกทั้งกลุ่ม'}</span>
                  </button>
                </div>
              </div>

              {/* Group Members Grading List (With Live Power Bars) */}
              <div className="divide-y divide-slate-200">
                {members.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    ยังไม่มีนักเรียนในกลุ่มที่ {gId}
                  </div>
                ) : (
                  members.map((rec) => {
                    const row = getEditingRecord(rec);
                    const total = computeTotal(row);
                    const coreTotal = total - Number(row.bonusScore || 0);
                    const bonus = Number(row.bonusScore || 0);
                    const isSaved = savedTag === rec.studentCode;

                    return (
                      <div key={rec.studentCode} className="p-5 space-y-4 hover:bg-slate-50/60 transition-colors">
                        {/* Student Identity Row + Live Total Power Bar */}
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {row.studentCode}
                            </span>
                            {isJoinedStudent(rec) ? (
                              <span className="text-xs font-bold text-emerald-700">
                                · Join Class แล้ว
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">
                                · รหัสตั้งต้น
                              </span>
                            )}
                            <input
                              type="text"
                              value={row.studentName}
                              onChange={(e) => updateDraftField(rec, 'studentName', e.target.value)}
                              aria-label="ชื่อนักเรียน"
                              className="w-44 px-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <select
                              value={row.groupId}
                              onChange={(e) => updateDraftField(rec, 'groupId', Number(e.target.value))}
                              aria-label="ย้ายกลุ่ม"
                              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-700"
                            >
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                                <option key={g} value={g}>
                                  กลุ่มที่ {g}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => updateDraftField(rec, 'active', !row.active)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                                row.active
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {row.active ? 'ใช้งานปกติ' : 'ระงับ'}
                            </button>
                          </div>

                          {/* Live Power Bar Preview + Save & Delete Actions */}
                          <div className="flex flex-wrap items-center gap-3 xl:min-w-[460px] justify-between xl:justify-end">
                            <div className="flex-1 min-w-[180px] space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                                <span className="text-slate-600">หลอดค่าพลังรวม</span>
                                <span className="font-mono text-blue-700">
                                  {total} คะแนน{' '}
                                  {bonus > 0 && (
                                    <span className="text-amber-600">(+{bonus} พิเศษ)</span>
                                  )}
                                </span>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(0, coreTotal))}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSaveStudent(rec)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                              >
                                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                <span>{isSaved ? 'บันทึกแล้ว' : 'บันทึก'}</span>
                              </button>

                              {confirmDeleteCode === rec.studentCode ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDeleteStudent(rec.studentCode)}
                                    className="px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
                                  >
                                    ยืนยันลบ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteCode(null)}
                                    className="px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCode(rec.studentCode)}
                                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer"
                                  title={`ลบ ${row.studentName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>ลบ</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Grading Controls: Individual 5-Metric Power Bars OR Special Bonus Power Bar */}
                        {gradingMode === 'individual' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
                            {RUBRIC_FIELDS.map((field) => {
                              const val = Number(row[field.key] || 0);
                              const pct = Math.min(100, Math.round((val / field.max) * 100));
                              return (
                                <div key={field.key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-700">{field.label}</span>
                                    <span className="font-mono text-slate-900 tabular-nums">
                                      {val}/{field.max}
                                    </span>
                                  </div>
                                  <div className={`h-2 w-full rounded-full overflow-hidden ${field.trackClass}`}>
                                    <div
                                      className={`h-full rounded-full transition-all duration-200 ${field.barClass}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={field.max}
                                    value={val}
                                    onChange={(e) =>
                                      updateDraftField(rec, field.key, Number(e.target.value))
                                    }
                                    aria-label={`${field.label} ของ ${row.studentName}`}
                                    className="w-full accent-blue-600 cursor-pointer"
                                  />
                                </div>
                              );
                            })}

                            {/* Teacher Note */}
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                              <label className="block text-xs font-semibold text-slate-700">
                                หมายเหตุครู
                              </label>
                              <input
                                type="text"
                                value={row.teacherNote}
                                onChange={(e) => updateDraftField(rec, 'teacherNote', e.target.value)}
                                placeholder="ความเห็น..."
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                        ) : (
                          /* Special Bonus Power Mode */
                          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                            <div className="lg:col-span-5 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                                <span className="inline-flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  <span>หลอดค่าพลังพิเศษรายบุคคล (0–20)</span>
                                </span>
                                <span className="font-mono text-amber-800">+{bonus}/20</span>
                              </div>
                              <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden border border-amber-200">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                                  style={{ width: `${Math.min(100, (bonus / 20) * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
                              {[2, 5, 10].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() =>
                                    updateDraftField(
                                      rec,
                                      'bonusScore',
                                      Math.min(20, bonus + amt)
                                    )
                                  }
                                  className="px-2.5 py-1.5 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg cursor-pointer"
                                >
                                  +{amt}
                                </button>
                              ))}
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={bonus}
                                onChange={(e) =>
                                  updateDraftField(
                                    rec,
                                    'bonusScore',
                                    Math.min(20, Math.max(0, Number(e.target.value) || 0))
                                  )
                                }
                                aria-label="คะแนนพิเศษ"
                                className="w-16 px-2 py-1 text-center font-mono text-xs font-bold border border-amber-300 rounded-lg bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => updateDraftField(rec, 'bonusScore', 0)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                รีเซ็ต
                              </button>
                            </div>

                            <div className="lg:col-span-3">
                              <input
                                type="text"
                                value={row.teacherNote}
                                onChange={(e) => updateDraftField(rec, 'teacherNote', e.target.value)}
                                placeholder="เหตุผลคะแนนพิเศษ เช่น ช่วยเหลือเพื่อน..."
                                className="w-full px-3 py-1.5 text-xs border border-amber-200 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
