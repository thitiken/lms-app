import React from 'react';
import {
  CheckCircle2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ACTIVITY_PHASES } from '../data/scenarios';
import type { ActivityPhaseId, PresenceUser, TimerState } from '../types';

interface ActivityTimerBarProps {
  timer: TimerState | undefined;
  remainingSeconds: number;
  connected: boolean;
  presence: PresenceUser[];
  lockedPhases: ActivityPhaseId[];
  isTeacher: boolean;
  onJumpToPhase: (phase: ActivityPhaseId) => void;
  onControlTimer: (
    action: 'start' | 'pause' | 'reset' | 'setPhase' | 'startPhase',
    phase?: ActivityPhaseId
  ) => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ActivityTimerBar: React.FC<ActivityTimerBarProps> = ({
  timer,
  remainingSeconds,
  connected,
  presence,
  lockedPhases,
  isTeacher,
  onJumpToPhase,
  onControlTimer,
}) => {
  const activePhaseId = timer?.activePhase || 'step1';
  const currentPhase =
    ACTIVITY_PHASES.find((p) => p.id === activePhaseId) || ACTIVITY_PHASES[0];
  const isRunning = Boolean(timer?.isRunning);
  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 60;

  return (
    <div className="bg-slate-900 text-slate-100 border-b border-slate-800 shadow-xs">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-1.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        {/* Compact 6-Step Horizontal Mission Timeline */}
        <div className="relative flex-1 min-w-0">
          <div
            className="hidden lg:block absolute left-3 right-3 top-1/2 -translate-y-1/2 h-px bg-slate-700/80 pointer-events-none"
            aria-hidden="true"
          />

          <div
            className="relative flex items-center gap-1.5 overflow-x-auto py-0.5"
            role="list"
            aria-label="แถบ Timeline ภารกิจ 6 ขั้นตอน"
          >
            {ACTIVITY_PHASES.map((phase) => {
              const isActive = phase.id === activePhaseId;
              const isStarted = isActive && isRunning;
              const isCompleted = phase.stepNumber < currentPhase.stepNumber;
              const isLocked = lockedPhases.includes(phase.id);
              const shortName = phase.shortTitle.replace(/^\d+\.\s*/, '');

              let nodeClasses =
                'bg-slate-800/90 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white';
              let numClasses = 'bg-slate-700 text-slate-200';

              if (isStarted) {
                nodeClasses =
                  'bg-blue-600 border-amber-400 text-white shadow-md ring-1 ring-amber-400/70';
                numClasses = 'bg-amber-400 text-slate-950';
              } else if (isActive) {
                nodeClasses =
                  'bg-blue-700/85 border-blue-400 text-white shadow-xs';
                numClasses = 'bg-white text-blue-800';
              } else if (isCompleted) {
                nodeClasses =
                  'bg-emerald-950/75 border-emerald-600/60 text-emerald-100 hover:border-emerald-400';
                numClasses = 'bg-emerald-600 text-white';
              }

              return (
                <div
                  key={phase.id}
                  role="listitem"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-all whitespace-nowrap shrink-0 ${nodeClasses}`}
                >
                  <button
                    type="button"
                    disabled={isLocked && !isTeacher}
                    onClick={() => onJumpToPhase(phase.id)}
                    title={phase.title}
                    className={`inline-flex items-center gap-1.5 text-left ${
                      isLocked && !isTeacher ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center px-1 py-0.5 rounded font-mono text-[10px] font-bold tabular-nums leading-none ${numClasses}`}
                    >
                      0{phase.stepNumber}
                    </span>

                    <span className="font-semibold leading-none">{shortName}</span>

                    {isLocked ? (
                      <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                    ) : isStarted ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse shrink-0"
                        title="กำลังทำกิจกรรมนี้"
                      />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : null}
                  </button>

                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() =>
                        isStarted
                          ? onControlTimer('pause')
                          : onControlTimer('startPhase', phase.id)
                      }
                      title={isStarted ? 'พักกิจกรรมนี้' : `เริ่มขั้นที่ ${phase.stepNumber}`}
                      aria-label={isStarted ? 'พักกิจกรรมนี้' : `เริ่มขั้นที่ ${phase.stepNumber}`}
                      className={`ml-0.5 p-0.5 rounded transition-colors cursor-pointer shrink-0 ${
                        isStarted
                          ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                          : 'text-slate-300 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {isStarted ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact Status & Teacher Timer Cluster */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 text-[11px] shrink-0">
          {isRunning && (
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold whitespace-nowrap">
              กำลังทำขั้นที่ {currentPhase.stepNumber}
            </span>
          )}

          {(isTeacher || isRunning) && (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5">
              <span
                className={`font-mono text-[11px] font-bold tabular-nums ${
                  isLowTime ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {formatTime(remainingSeconds)}
              </span>
              {isTeacher && (
                <>
                  <div className="h-3 w-px bg-slate-700" aria-hidden="true" />
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={() => onControlTimer('pause')}
                      className="p-0.5 text-slate-200 hover:text-amber-300 cursor-pointer"
                      aria-label="หยุดเวลาชั่วคราว"
                      title="หยุดชั่วคราว"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onControlTimer('start')}
                      className="p-0.5 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      aria-label="เริ่มกิจกรรมปัจจุบัน"
                      title="เริ่มกิจกรรมปัจจุบัน"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onControlTimer('reset')}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="รีเซ็ตเวลา"
                    title="รีเซ็ตเวลา"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}

          <span className="inline-flex items-center gap-1 text-slate-200 tabular-nums whitespace-nowrap">
            <Users className="w-3 h-3 text-slate-400" />
            <span>{presence.length} คน</span>
          </span>

          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap ${
              connected ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {connected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>ซิงค์สด</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>กำลังเชื่อมต่อ</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

