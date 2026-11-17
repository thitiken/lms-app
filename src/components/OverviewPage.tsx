import React from 'react';
import { ArrowRight, History, UserPlus, Users } from 'lucide-react';
import { ACTIVITY_PHASES, EXAMPLE_SCENARIO, getScenarioForGroup, isJoinedStudent } from '../data/scenarios';
import type { AppWorkspaceState, AuthSession, CanvasData } from '../types';
import { ScorePowerBars } from './ScorePowerBars';
import type { AppView } from './TopBar';

interface OverviewPageProps {
  workspace: AppWorkspaceState;
  session: AuthSession;
  onNavigate: (view: AppView) => void;
  onOpenAuthModal: (preselectedGroupId?: number) => void;
}

function countCanvasFilled(canvas: CanvasData): number {
  return [
    canvas.problemStatement,
    canvas.targetUser,
    canvas.applicationIdea,
    canvas.coreFeatures,
    canvas.expectedImpact,
  ].filter((v) => v.trim().length > 0).length;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  workspace,
  session,
  onNavigate,
  onOpenAuthModal,
}) => {
  const userGroup = session.groupId ? workspace.groups[session.groupId] : null;
  const myScoreRecord =
    session.role === 'student' && session.studentCode
      ? workspace.studentScores?.[session.studentCode]
      : null;
  const recentTimeline = (workspace.timeline || []).slice(0, 5);

  const allStudents = Object.values(workspace.studentScores || {});

  return (
    <div className="space-y-10">
      {/* Midnight Studio Hero + Prominent Live Activity Timeline (Single Clear Primary CTA) */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-300">
              <span>EcoLab Studio</span>
              <span aria-hidden="true">·</span>
              <span>1 สถานการณ์ตัวอย่าง + 5 สถานการณ์โลก</span>
              <span aria-hidden="true">·</span>
              <span>10 กลุ่มผู้เรียน ม.ปลาย</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-snug">
              วิเคราะห์สถานการณ์สิ่งแวดล้อม แล้วสร้างแอปแก้ปัญหาจริงร่วมกัน
            </h1>

            <p className="text-base text-slate-200 leading-relaxed max-w-[62ch]">
              เลือกกลุ่มที่ 1–10 ของคุณ แล้วเข้าสู่ระบบด้วยชื่อและรหัสนักเรียน เพื่อระดมไอเดียลง Design Canvas
              ออกแบบ Prompt V.1–V.2 แลกเปลี่ยนคอมเมนต์ข้ามกลุ่ม และติดตามหลอดค่าพลังคะแนนของคุณ
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              {session.role === 'guest' ? (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal()}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>เลือกกลุ่ม 1–10 และเข้าสู่ระบบ</span>
                </button>
              ) : userGroup ? (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({
                      type: 'scenario',
                      scenarioId: userGroup.scenarioId,
                      initialGroupId: userGroup.groupId,
                    })
                  }
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer"
                >
                  <span>เข้าห้องกลุ่มที่ {userGroup.groupId} ของฉัน</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate({ type: 'teacher' })}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer"
                >
                  <span>เปิดแดชบอร์ดครูผู้สอน (แบบกลุ่ม)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate({ type: 'scenario', scenarioId: 'example' })}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <span>ทดลองสถานการณ์ตัวอย่าง</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Panel: Prominent Active Mission + Live Timeline Stream (No clock timestamps) */}
          <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Timeline กิจกรรมล่าสุดในชั้นเรียน</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ type: 'timeline' })}
                className="text-xs font-semibold text-blue-300 hover:text-white cursor-pointer"
              >
                ดูทั้งหมด →
              </button>
            </div>

            {(() => {
              const activePhase =
                ACTIVITY_PHASES.find((p) => p.id === workspace.timer?.activePhase) ||
                ACTIVITY_PHASES[0];
              const isRunning = Boolean(workspace.timer?.isRunning);
              return (
                <div
                  className={`p-3 rounded-xl border ${
                    isRunning
                      ? 'bg-blue-600/90 border-amber-400 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className={isRunning ? 'text-amber-300' : 'text-blue-300'}>
                      {isRunning ? 'ภารกิจที่ครูกำลังเริ่มทำอยู่' : 'ภารกิจปัจจุบันบน Timeline'}
                    </span>
                    <span className="font-mono">ขั้นที่ 0{activePhase.stepNumber}/06</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white mt-1 leading-snug">
                    {activePhase.title}
                  </div>
                </div>
              );
            })()}

            <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-600">
              {recentTimeline.map((evt) => (
                <div key={evt.id} className="relative">
                  <span
                    className="absolute -left-[19px] top-2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-800"
                    aria-hidden="true"
                  />
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-emerald-400">{evt.actionType}</span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <span className="font-semibold text-blue-300">{evt.actorName}</span>
                      {evt.groupId > 0 && (
                        <>
                          <span aria-hidden="true" className="text-slate-500">·</span>
                          <span className="text-slate-300">กลุ่มที่ {evt.groupId}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
                      {evt.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Logged-in Student Power Bar directly on Overview */}
      {myScoreRecord && <ScorePowerBars record={myScoreRecord} compact />}

      {/* Direct Group 1–10 Entry Hub (Clear single place to pick Group 1-10 & see members) */}
      <section className="space-y-4" aria-label="เลือกกลุ่ม 1–10 เพื่อเข้าปฏิบัติการ">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-3 border-b-2 border-slate-300">
          <div>
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              ส่วนที่ 1 · เลือกกลุ่มและเข้าห้องปฏิบัติการ
            </div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <Users className="w-5 h-5 text-blue-600" />
              <span>เลือกกลุ่มที่ 1 – กลุ่มที่ 10 เพื่อเข้าเรียนร่วมกัน</span>
            </h2>
            <p className="text-sm text-slate-700 mt-0.5">
              กดเลือกกลุ่มของคุณเพื่อเข้าสู่ระบบด้วยชื่อและรหัสนักเรียน (คนที่เลือกกลุ่มเดียวกันจะมาอยู่ด้วยกันทันที)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((gId) => {
            const sc = getScenarioForGroup(gId);
            const grp = workspace.groups[gId];
            const canvasCount = grp ? countCanvasFilled(grp.canvas) : 0;
            const joinedStudents = allStudents.filter(
              (s) => s.groupId === gId && s.active && isJoinedStudent(s)
            );
            const isMyGroup = session.groupId === gId;

            return (
              <div
                key={gId}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all shadow-sm ${
                  isMyGroup
                    ? 'border-blue-600 ring-2 ring-blue-300'
                    : 'border-slate-300 hover:border-blue-500'
                }`}
              >
                <div>
                  {/* Distinct Header Band */}
                  <div
                    className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${
                      isMyGroup
                        ? 'bg-blue-600 border-blue-700 text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-900'
                    }`}
                  >
                    <span className="text-sm font-bold">กลุ่มที่ {gId}</span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isMyGroup ? 'text-blue-100' : 'text-blue-700'
                      }`}
                    >
                      {isMyGroup ? 'กลุ่มของคุณ' : `Canvas ${canvasCount}/5`}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {sc.shortTitle}
                    </div>

                    <div className="text-xs text-slate-600 min-h-[36px]">
                      {joinedStudents.length > 0 ? (
                        <span>
                          สมาชิก ({joinedStudents.length}):{' '}
                          <strong className="text-slate-900">
                            {joinedStudents.map((s) => s.studentName).join(', ')}
                          </strong>
                        </span>
                      ) : (
                        <span className="text-slate-500">ยังไม่มีผู้ลงชื่อเข้ากลุ่มนี้</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                  {session.role === 'student' && !isMyGroup ? (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate({
                          type: 'scenario',
                          scenarioId: sc.id,
                          initialGroupId: gId,
                        })
                      }
                      className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer transition-colors"
                    >
                      เยี่ยมชมกลุ่มที่ {gId}
                    </button>
                  ) : session.role === 'guest' ? (
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal(gId)}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
                    >
                      ลงชื่อเข้ากลุ่มที่ {gId}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate({
                          type: 'scenario',
                          scenarioId: sc.id,
                          initialGroupId: gId,
                        })
                      }
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
                    >
                      เปิดห้องกลุ่มที่ {gId}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Example Scenario Featured Card */}
      <section className="space-y-4" aria-label="สถานการณ์ตัวอย่าง">
        <div className="pb-3 border-b-2 border-slate-300">
          <div className="text-xs font-bold text-emerald-800">
            ส่วนที่ 2 · กิจกรรมฝึกวิเคราะห์ร่วมกันทั้งห้อง
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            สถานการณ์ตัวอย่างสำหรับฝึกปฏิบัติร่วมกันทั้งห้อง
          </h2>
          <p className="text-sm text-slate-700 mt-0.5">
            ทดลองวิเคราะห์ Design Canvas และเสนอแนะไอเดียร่วมกันก่อนแยกเข้าทำงานในกลุ่มที่ 1–10
          </p>
        </div>

        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm">
          <div className="lg:col-span-4 relative min-h-[200px] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-300">
            <img
              src={EXAMPLE_SCENARIO.imageUrl}
              alt={EXAMPLE_SCENARIO.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          </div>
          <div className="lg:col-span-8 p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-blue-700">
                หน้า 1 · {EXAMPLE_SCENARIO.pageNumber} · ร่วมกันทั้งชั้นเรียน
              </div>
              <h3 className="text-xl font-bold text-slate-900">{EXAMPLE_SCENARIO.title}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{EXAMPLE_SCENARIO.summary}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-700 tabular-nums">
                ข้อเสนอแนะ: <strong className="text-slate-900">{workspace.example.sandboxFeedbackNotes.length}</strong> รายการ ·
                Canvas <strong className="text-blue-700">{countCanvasFilled(workspace.example.canvas)}/5</strong> ช่อง
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ type: 'scenario', scenarioId: 'example' })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                <span>เปิดหน้าสถานการณ์ตัวอย่าง</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
