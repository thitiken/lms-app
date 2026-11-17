import React from 'react';
import { getScenarioForGroup } from '../data/scenarios';
import type { AuthSession } from '../types';

export type AppView =
  | { type: 'overview' }
  | { type: 'scenario'; scenarioId: string; initialGroupId?: number }
  | { type: 'matrix' }
  | { type: 'timeline' }
  | { type: 'teacher' }
  | { type: 'vercel' };

interface TopBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  session: AuthSession;
  onOpenAuthModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onNavigate,
  session,
  onOpenAuthModal,
}) => {
  const isOverview = currentView.type === 'overview';
  const isExample = currentView.type === 'scenario' && currentView.scenarioId === 'example';
  const isGroupWorkspace =
    (currentView.type === 'scenario' && currentView.scenarioId !== 'example') ||
    currentView.type === 'matrix' ||
    currentView.type === 'vercel';
  const isTimeline = currentView.type === 'timeline';
  const isTeacher = currentView.type === 'teacher';

  const navLinkClass = (active: boolean) =>
    `text-sm font-semibold whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
      active
        ? 'text-blue-700 border-blue-600'
        : 'text-slate-700 border-transparent hover:text-slate-950 hover:border-slate-300'
    }`;

  const goToGroupWorkspace = () => {
    const targetGroupId = session.groupId || 1;
    const scenario = getScenarioForGroup(targetGroupId);
    onNavigate({
      type: 'scenario',
      scenarioId: scenario.id,
      initialGroupId: targetGroupId,
    });
  };

  const ctaLabel =
    session.role === 'teacher'
      ? `ครูผู้สอน · ${session.displayName}`
      : session.role === 'student'
      ? `กลุ่มที่ ${session.groupId} · ${session.displayName} (${session.studentCode})`
      : 'เลือกกลุ่ม & เข้าสู่ระบบ';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-300 shadow-xs">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate({ type: 'overview' })}
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          EcoLab Studio
        </button>

        {/* Zone 2: 5 Clear Single-Line Links */}
        <nav className="hidden md:flex items-center gap-6 overflow-x-auto" aria-label="เมนูหลัก">
          <button
            type="button"
            onClick={() => onNavigate({ type: 'overview' })}
            className={navLinkClass(isOverview)}
          >
            หน้าหลัก
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ type: 'scenario', scenarioId: 'example' })}
            className={navLinkClass(isExample)}
          >
            ตัวอย่างร่วมกัน
          </button>
          <button
            type="button"
            onClick={goToGroupWorkspace}
            className={navLinkClass(isGroupWorkspace)}
          >
            {session.groupId ? `ห้องกลุ่มที่ ${session.groupId}` : 'ห้องกลุ่ม 1–10'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ type: 'timeline' })}
            className={navLinkClass(isTimeline)}
          >
            Timeline & ค่าพลัง
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ type: 'teacher' })}
            className={navLinkClass(isTeacher)}
          >
            แดชบอร์ดครู
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 max-w-[230px] truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              session.role === 'teacher'
                ? 'bg-slate-900 hover:bg-slate-800'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* Mobile secondary nav strip */}
      <nav
        className="md:hidden flex items-center gap-4 px-4 py-2 border-t border-slate-100 overflow-x-auto text-xs"
        aria-label="เมนูมือถือ"
      >
        <button
          type="button"
          onClick={() => onNavigate({ type: 'overview' })}
          className={navLinkClass(isOverview)}
        >
          หน้าหลัก
        </button>
        <button
          type="button"
          onClick={() => onNavigate({ type: 'scenario', scenarioId: 'example' })}
          className={navLinkClass(isExample)}
        >
          ตัวอย่าง
        </button>
        <button
          type="button"
          onClick={goToGroupWorkspace}
          className={navLinkClass(isGroupWorkspace)}
        >
          {session.groupId ? `กลุ่ม ${session.groupId}` : 'กลุ่ม 1–10'}
        </button>
        <button
          type="button"
          onClick={() => onNavigate({ type: 'timeline' })}
          className={navLinkClass(isTimeline)}
        >
          Timeline & ค่าพลัง
        </button>
        <button
          type="button"
          onClick={() => onNavigate({ type: 'teacher' })}
          className={navLinkClass(isTeacher)}
        >
          ครู
        </button>
      </nav>
    </header>
  );
};
