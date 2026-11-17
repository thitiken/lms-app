import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { getScenarioForGroup, isJoinedStudent } from '../data/scenarios';
import type { AppWorkspaceState, CanvasData, PresenceUser } from '../types';
import type { GroupSubTab } from './GroupWorkspacePanel';

interface ClassMatrixPageProps {
  workspace: AppWorkspaceState;
  presence: PresenceUser[];
  onOpenGroup: (scenarioId: string, groupId: number, tab?: GroupSubTab) => void;
}

function countCanvas(c: CanvasData): number {
  return [
    c.problemStatement,
    c.targetUser,
    c.applicationIdea,
    c.coreFeatures,
    c.expectedImpact,
  ].filter((v) => v.trim().length > 0).length;
}

export const ClassMatrixPage: React.FC<ClassMatrixPageProps> = ({
  workspace,
  presence,
  onOpenGroup,
}) => {
  const groups = Object.values(workspace.groups).sort((a, b) => a.groupId - b.groupId);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            กระดานติดตามความคืบหน้าทั้ง 10 กลุ่ม (เรียลไทม์)
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            5 สถานการณ์สิ่งแวดล้อมระดับโลก · สถานการณ์ละ 2 กลุ่ม · กดที่ปุ่มของกลุ่มเพื่อเข้าชมหรือร่วมคอมเมนต์ V.1
          </p>
        </div>
        <div className="text-xs text-slate-300 tabular-nums shrink-0">
          ผู้เรียนออนไลน์ขณะนี้: <span className="font-bold text-emerald-400">{presence.length} คน</span>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700">
                <th className="py-3.5 px-4 whitespace-nowrap">กลุ่ม</th>
                <th className="py-3.5 px-4 whitespace-nowrap">สถานการณ์ปัญหา</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Canvas (5 ช่อง)</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Prompt V.1 & AI</th>
                <th className="py-3.5 px-4 whitespace-nowrap">คอมเมนต์ V.1</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Prompt V.2</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Vercel & สะท้อนผล</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">เข้าดู / ตรวจงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {groups.map((g) => {
                const scenario = getScenarioForGroup(g.groupId);
                const canvasDone = countCanvas(g.canvas);
                const hasPromptV1 = g.promptV1.trim().length > 0;
                const hasHumanAi =
                  g.humanVsAi.humanStrengths.trim().length > 0 ||
                  g.humanVsAi.aiStrengths.trim().length > 0;
                const hasPromptV2 = g.promptV2.trim().length > 0;
                const hasVercel = g.vercelUrl.trim().length > 0;
                const hasReflection = g.reflection.keyLearning.trim().length > 0;
                const onlineCount = presence.filter((p) => p.groupId === g.groupId).length;

                const joinedNames = Object.values(workspace.studentScores || {})
                  .filter((s) => s.groupId === g.groupId && s.active && isJoinedStudent(s))
                  .map((s) => `${s.studentName} (${s.studentCode})`)
                  .join(', ');
                const membersDisplay = joinedNames || g.members || 'ยังไม่ระบุสมาชิก';

                return (
                  <tr key={g.groupId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-slate-900">{g.groupName}</div>
                      <div className="text-xs text-slate-600 mt-0.5 max-w-[200px] truncate" title={membersDisplay}>
                        {membersDisplay}
                      </div>
                      {onlineCount > 0 && (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 tabular-nums">
                          ออนไลน์ {onlineCount} คน
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="font-semibold text-slate-800">{scenario.shortTitle}</div>
                      <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">
                        {g.canvas.applicationIdea || 'ยังไม่มีแนวคิดแอป'}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top tabular-nums">
                      <div className="w-24 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-bold ${
                              canvasDone === 5
                                ? 'text-emerald-700'
                                : canvasDone > 0
                                ? 'text-blue-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {canvasDone}/5 ช่อง
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              canvasDone === 5 ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${(canvasDone / 5) * 100}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ไอเดีย {g.ideationNotes.length} ใบ
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top text-xs">
                      <div className={hasPromptV1 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                        {hasPromptV1 ? 'มี Prompt V.1 แล้ว' : 'รอออกแบบ V.1'}
                      </div>
                      <div className={hasHumanAi ? 'text-blue-700 mt-0.5 font-medium' : 'text-slate-400 mt-0.5'}>
                        {hasHumanAi ? 'วิเคราะห์มนุษย์-AI แล้ว' : 'รอวิเคราะห์มนุษย์-AI'}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top tabular-nums">
                      <button
                        type="button"
                        onClick={() => onOpenGroup(scenario.id, g.groupId, 'comments')}
                        className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        {g.comments.length} คอมเมนต์
                      </button>
                    </td>

                    <td className="py-4 px-4 align-top text-xs">
                      <span className={hasPromptV2 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                        {hasPromptV2 ? 'ปรับปรุง V.2 แล้ว' : 'รอดำเนินการ'}
                      </span>
                    </td>

                    <td className="py-4 px-4 align-top text-xs space-y-1">
                      {hasVercel ? (
                        <a
                          href={g.vercelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                        >
                          <span>เปิด Vercel</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <div className="text-slate-400">ยังไม่มีลิงก์ Vercel</div>
                      )}
                      <div className={hasReflection ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {hasReflection ? 'บันทึกสะท้อนผลแล้ว' : 'รอสะท้อนผล'}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onOpenGroup(scenario.id, g.groupId, 'canvas')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <span>เปิดกระดาน</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
