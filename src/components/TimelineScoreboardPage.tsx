import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Circle, History, Lock, Sparkles, Users, Zap } from 'lucide-react';
import { ACTIVITY_PHASES, getScenarioForGroup, isJoinedStudent } from '../data/scenarios';
import type { ActivityPhaseId, AppWorkspaceState, AuthSession, GroupWorkspace, StudentScoreRecord } from '../types';
import { ScorePowerBars } from './ScorePowerBars';

interface TimelineScoreboardPageProps {
  workspace: AppWorkspaceState;
  session: AuthSession;
  onOpenLoginModal: () => void;
}

function getGroupStepStatus(group: GroupWorkspace | undefined) {
  if (!group) {
    return {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
    };
  }
  const canvasDone =
    group.canvas.problemStatement.trim().length > 0 &&
    group.canvas.targetUser.trim().length > 0 &&
    group.canvas.applicationIdea.trim().length > 0;

  return {
    step1: true,
    step2: canvasDone || group.ideationNotes.length > 0,
    step3: group.promptV1.trim().length > 0,
    step4: group.comments.length > 0,
    step5: group.promptV2.trim().length > 0,
    step6: group.vercelUrl.trim().length > 0 || group.reflection.keyLearning.trim().length > 0,
  };
}

const PHASE_DOT_COLORS: Record<ActivityPhaseId, string> = {
  step1: 'bg-blue-600',
  step2: 'bg-emerald-600',
  step3: 'bg-amber-500',
  step4: 'bg-rose-500',
  step5: 'bg-indigo-600',
  step6: 'bg-slate-900',
};

const PHASE_CARD_BORDERS: Record<ActivityPhaseId, string> = {
  step1: 'border-blue-200 bg-blue-50/40',
  step2: 'border-emerald-200 bg-emerald-50/40',
  step3: 'border-amber-200 bg-amber-50/40',
  step4: 'border-rose-200 bg-rose-50/40',
  step5: 'border-indigo-200 bg-indigo-50/40',
  step6: 'border-slate-300 bg-slate-100/70',
};

export const TimelineScoreboardPage: React.FC<TimelineScoreboardPageProps> = ({
  workspace,
  session,
  onOpenLoginModal,
}) => {
  const [viewTab, setViewTab] = useState<'scores' | 'timeline'>('scores');
  const [groupFilter, setGroupFilter] = useState<number | 'all'>(session.groupId || 'all');
  const [phaseFilter, setPhaseFilter] = useState<ActivityPhaseId | 'all'>('all');

  const allScores = useMemo(
    () =>
      Object.values(workspace.studentScores || {}).sort((a, b) =>
        a.studentCode.localeCompare(b.studentCode)
      ),
    [workspace.studentScores]
  );

  const groupedScores = useMemo(() => {
    const map: Record<number, StudentScoreRecord[]> = {};
    for (let g = 1; g <= 10; g++) {
      map[g] = [];
    }
    for (const rec of allScores) {
      const gId = rec.groupId >= 1 && rec.groupId <= 10 ? rec.groupId : 1;
      map[gId].push(rec);
    }
    return map;
  }, [allScores]);

  const myRecord =
    session.role === 'student' && session.studentCode
      ? workspace.studentScores?.[session.studentCode]
      : null;

  const focusGroupId =
    groupFilter !== 'all' ? groupFilter : session.groupId || 1;
  const focusGroup = workspace.groups?.[focusGroupId];
  const groupSteps = getGroupStepStatus(focusGroup);

  const filteredTimeline = useMemo(() => {
    return (workspace.timeline || []).filter((evt) => {
      if (groupFilter !== 'all' && evt.groupId !== groupFilter) return false;
      if (phaseFilter !== 'all' && evt.phaseId !== phaseFilter) return false;
      return true;
    });
  }, [workspace.timeline, groupFilter, phaseFilter]);

  const canViewAllScores =
    session.role === 'teacher' || workspace.teacherControls?.allowStudentScoreView !== false;

  const visibleGroupIds =
    groupFilter === 'all' ? Array.from({ length: 10 }, (_, i) => i + 1) : [groupFilter];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-300">
            หลอดค่าพลังแยกตามกลุ่ม 1–10 & เส้นทางกิจกรรม
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            คะแนนสะสม (แบบกลุ่ม & รายบุคคล) และ Timeline กิจกรรม
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            แสดงสมาชิกที่อยู่กลุ่มเดียวกันเป็นกลุ่มที่ 1–10 พร้อมหลอดค่าพลังหลักและคะแนนพิเศษจากครูผู้สอน
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-xl shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewTab('scores')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-colors ${
              viewTab === 'scores' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>หลอดค่าพลัง (กลุ่ม 1–10)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('timeline')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-colors ${
              viewTab === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Timeline กิจกรรม</span>
          </button>
        </div>
      </div>

      {/* Logged-in Student Power Bars Card */}
      {myRecord ? (
        <ScorePowerBars record={myRecord} />
      ) : session.role === 'guest' ? (
        <div className="bg-white border border-slate-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="text-sm text-slate-700">
            เข้าสู่ระบบด้วย <strong className="text-slate-900">กลุ่ม 1–10 + ชื่อ + รหัสนักเรียน</strong> เพื่อดูหลอดค่าพลังคะแนนส่วนตัวของคุณ
          </div>
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shrink-0"
          >
            เลือกกลุ่ม & เข้าสู่ระบบ
          </button>
        </div>
      ) : null}

      {/* Shared Group Filter Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Users className="w-4 h-4 text-blue-600" />
          <span>กรองดูตามกลุ่ม (1–10):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setGroupFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              groupFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ทุกกลุ่ม (1–10)
          </button>
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((gId) => (
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
              กลุ่ม {gId}
            </button>
          ))}
        </div>
      </div>

      {/* View 1: Grouped Power Bar Scoreboard (Groups 1–10) */}
      {viewTab === 'scores' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>กระดานหลอดค่าพลังแยกตามกลุ่ม (โหมดดูผลเท่านั้น)</span>
            </h2>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>เฉพาะครูผู้สอนเท่านั้นที่ปรับคะแนนได้</span>
            </div>
          </div>

          {!canViewAllScores ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-600">
              ครูผู้สอนปิดการแสดงผลคะแนนรวมทั้งห้องชั่วคราว — นักเรียนสามารถดูหลอดค่าพลังส่วนตัวได้ที่การ์ดด้านบน
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {visibleGroupIds.map((gId) => {
                const sc = getScenarioForGroup(gId);
                const grp = workspace.groups[gId];
                const members = groupedScores[gId] || [];
                const activeJoined = members.filter((m) => isJoinedStudent(m));
                const displayMembers = activeJoined.length > 0 ? activeJoined : members;

                const avgTotal =
                  displayMembers.length > 0
                    ? Math.round(
                        displayMembers.reduce((sum, m) => sum + Number(m.totalScore || 0), 0) /
                          displayMembers.length
                      )
                    : 0;
                const avgPct = Math.min(100, Math.max(0, avgTotal));

                return (
                  <div
                    key={gId}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${
                      session.groupId === gId ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-300'
                    }`}
                  >
                    {/* Group Header + Group Average Power Bar */}
                    <div className="p-5 bg-slate-100 border-b border-slate-300 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                            <span>กลุ่มที่ {gId}</span>
                            <span aria-hidden="true">·</span>
                            <span>{sc.shortTitle}</span>
                            {session.groupId === gId && (
                              <span className="text-emerald-700 font-bold">· กลุ่มของคุณ</span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">
                            {grp?.groupName || `กลุ่มที่ ${gId}`}
                          </h3>
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <div className="text-[11px] font-semibold text-slate-500">พลังเฉลี่ยกลุ่ม</div>
                          <div className="font-mono text-lg font-bold text-blue-700">{avgTotal}/100</div>
                        </div>
                      </div>

                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                          style={{ width: `${avgPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Group Members & Individual Power Bars */}
                    <div className="divide-y divide-slate-100">
                      {displayMembers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          ยังไม่มีสมาชิกในกลุ่มนี้
                        </div>
                      ) : (
                        displayMembers.map((rec) => {
                          const isMe = session.studentCode === rec.studentCode;
                          const core =
                            rec.canvasScore +
                            rec.promptV1Score +
                            rec.peerReviewScore +
                            rec.promptV2Score +
                            rec.vercelScore;
                          const bonus = Number(rec.bonusScore || 0);
                          const corePct = Math.min(100, Math.max(0, core));

                          return (
                            <div
                              key={rec.studentCode}
                              className={`p-4 space-y-2.5 ${isMe ? 'bg-blue-50/60' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="font-mono text-xs font-bold text-slate-600">
                                    {rec.studentCode}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {rec.studentName}
                                  </span>
                                  {isMe && (
                                    <span className="text-xs font-bold text-blue-700">(คุณ)</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 font-mono text-xs font-bold tabular-nums">
                                  <span className="text-blue-700">{rec.totalScore} คะแนน</span>
                                  {bonus > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-amber-700">
                                      <Sparkles className="w-3 h-3" />+{bonus}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Core + Bonus Power Bar */}
                              <div className="space-y-1">
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                                    style={{ width: `${corePct}%` }}
                                  />
                                </div>
                                {bonus > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-amber-700 shrink-0">
                                      พิเศษ +{bonus}
                                    </span>
                                    <div className="h-1.5 flex-1 bg-amber-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-amber-500"
                                        style={{ width: `${Math.min(100, (bonus / 20) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 5 mini skill power bars */}
                              <div className="grid grid-cols-5 gap-2 text-[11px] font-mono tabular-nums pt-0.5">
                                <div title="Canvas /20">
                                  <div className="flex justify-between text-rose-800">
                                    <span>C</span>
                                    <span>{rec.canvasScore}</span>
                                  </div>
                                  <div className="h-1 bg-rose-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500" style={{ width: `${(rec.canvasScore / 20) * 100}%` }} />
                                  </div>
                                </div>
                                <div title="V.1 /20">
                                  <div className="flex justify-between text-sky-800">
                                    <span>V1</span>
                                    <span>{rec.promptV1Score}</span>
                                  </div>
                                  <div className="h-1 bg-sky-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-sky-500" style={{ width: `${(rec.promptV1Score / 20) * 100}%` }} />
                                  </div>
                                </div>
                                <div title="คอมเมนต์ /15">
                                  <div className="flex justify-between text-indigo-800">
                                    <span>CM</span>
                                    <span>{rec.peerReviewScore}</span>
                                  </div>
                                  <div className="h-1 bg-indigo-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${(rec.peerReviewScore / 15) * 100}%` }} />
                                  </div>
                                </div>
                                <div title="V.2 /25">
                                  <div className="flex justify-between text-emerald-800">
                                    <span>V2</span>
                                    <span>{rec.promptV2Score}</span>
                                  </div>
                                  <div className="h-1 bg-emerald-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${(rec.promptV2Score / 25) * 100}%` }} />
                                  </div>
                                </div>
                                <div title="Vercel /20">
                                  <div className="flex justify-between text-blue-800">
                                    <span>VC</span>
                                    <span>{rec.vercelScore}</span>
                                  </div>
                                  <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{ width: `${(rec.vercelScore / 20) * 100}%` }} />
                                  </div>
                                </div>
                              </div>

                              {rec.teacherNote && (
                                <p className="text-xs text-slate-600">
                                  <strong>หมายเหตุครู:</strong> {rec.teacherNote}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View 2: Prominent 6-Stage Visual Timeline + Chronological Activity Feed (NO Timestamps) */}
      {viewTab === 'timeline' && (
        <div className="space-y-6">
          {/* Prominent 6-Step Visual Journey Track */}
          <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                เส้นทางความสำเร็จ 6 ขั้นตอน — {focusGroup?.groupName || `กลุ่มที่ ${focusGroupId}`}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                แสดงความคืบหน้าแต่ละด่านของกลุ่มตามลำดับขั้นตอนโดยไม่ต้องกำกับเวลา
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {ACTIVITY_PHASES.map((phase) => {
                const done = groupSteps[phase.id];
                return (
                  <div
                    key={phase.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      done
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold ${
                          done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        0{phase.stepNumber}
                      </span>
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-bold leading-snug">{phase.shortTitle}</div>
                      <div
                        className={`text-xs font-semibold mt-1 ${
                          done ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {done ? 'ดำเนินการแล้ว' : 'รอดำเนินการ'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prominent Activity Feed Timeline (No Clock Timestamps) */}
          <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Timeline การทำกิจกรรมของนักเรียน (เรียงตามลำดับเหตุการณ์ล่าสุด)
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  ติดตามทุกกิจกรรมของสมาชิกในกลุ่มและชั้นเรียนแบบเรียลไทม์
                </p>
              </div>

              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value as ActivityPhaseId | 'all')}
                aria-label="กรองตามขั้นตอน"
                className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">ทุกขั้นตอน (1–6)</option>
                {ACTIVITY_PHASES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortTitle}
                  </option>
                ))}
              </select>
            </div>

            {filteredTimeline.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                ยังไม่มีรายการกิจกรรมในกลุ่มหรือขั้นตอนที่เลือก
              </div>
            ) : (
              <div className="relative pl-8 space-y-4 before:content-[''] before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:rounded-full before:bg-slate-200">
                {filteredTimeline.map((evt, index) => {
                  const phaseObj = ACTIVITY_PHASES.find((p) => p.id === evt.phaseId);
                  const dotColor = PHASE_DOT_COLORS[evt.phaseId] || 'bg-blue-600';
                  const cardBg = PHASE_CARD_BORDERS[evt.phaseId] || 'border-slate-200 bg-slate-50';

                  return (
                    <div key={evt.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${dotColor}`}
                        aria-hidden="true"
                      />
                      <div className={`p-4 sm:p-5 rounded-2xl border ${cardBg} space-y-2`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-mono text-xs font-bold text-slate-500 tabular-nums">
                              #{filteredTimeline.length - index}
                            </span>
                            <span className="font-bold text-slate-900">{evt.actionType}</span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="font-semibold text-blue-800">{evt.actorName}</span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="font-mono text-xs text-slate-700">
                              รหัส {evt.studentCode}
                            </span>
                            {evt.groupId > 0 && (
                              <>
                                <span aria-hidden="true" className="text-slate-400">·</span>
                                <span className="text-xs font-bold text-emerald-800">
                                  กลุ่มที่ {evt.groupId}
                                </span>
                              </>
                            )}
                          </div>

                          {phaseObj && (
                            <span className="text-xs font-bold text-slate-700">
                              {phaseObj.shortTitle}
                            </span>
                          )}
                        </div>

                        <p className="text-sm sm:text-base text-slate-900 leading-relaxed font-medium">
                          {evt.summary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
