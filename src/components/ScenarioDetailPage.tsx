import React, { useEffect, useState } from 'react';
import { Columns2, Users } from 'lucide-react';
import { getScenarioById, getScenarioForGroup, isJoinedStudent } from '../data/scenarios';
import type {
  AppWorkspaceState,
  CanvasData,
  HumanVsAiData,
  IdeationCategory,
  PresenceUser,
  ReflectionData,
} from '../types';
import { GroupSubTab, GroupWorkspacePanel } from './GroupWorkspacePanel';
import { ScenarioBrief } from './ScenarioBrief';

interface ScenarioDetailPageProps {
  scenarioId: string;
  initialGroupId?: number;
  workspace: AppWorkspaceState;
  presence: PresenceUser[];
  userGroupId: number | null;
  activeTab: GroupSubTab;
  onChangeTab: (tab: GroupSubTab) => void;
  onSelectScenario: (scenarioId: string, groupId?: number) => void;
  onUpdateMeta: (groupId: number, field: string, value: string | boolean[]) => void;
  onAddIdeationNote: (groupId: number, category: IdeationCategory, text: string) => void;
  onVoteIdeationNote: (groupId: number, noteId: string) => void;
  onDeleteIdeationNote: (groupId: number, noteId: string) => void;
  onUpdateCanvas: (groupId: number, field: keyof CanvasData, value: string) => void;
  onUpdateHumanAi: (groupId: number, field: keyof HumanVsAiData, value: string) => void;
  onAddComment: (groupId: number, strengths: string, improvements: string) => void;
  onDeleteComment: (groupId: number, commentId: string) => void;
  onUpdateReflection: (groupId: number, field: keyof ReflectionData, value: string) => void;
}

export const ScenarioDetailPage: React.FC<ScenarioDetailPageProps> = ({
  scenarioId,
  initialGroupId,
  workspace,
  presence,
  userGroupId,
  activeTab,
  onChangeTab,
  onSelectScenario,
  onUpdateMeta,
  onAddIdeationNote,
  onVoteIdeationNote,
  onDeleteIdeationNote,
  onUpdateCanvas,
  onUpdateHumanAi,
  onAddComment,
  onDeleteComment,
  onUpdateReflection,
}) => {
  const scenario = getScenarioById(scenarioId);
  const [groupA, groupB] = scenario.assignedGroups;

  const [selectedMode, setSelectedMode] = useState<'single' | 'compare'>('single');
  const [selectedGroupId, setSelectedGroupId] = useState<number>(() => {
    if (initialGroupId && scenario.assignedGroups.includes(initialGroupId)) return initialGroupId;
    if (userGroupId && scenario.assignedGroups.includes(userGroupId)) return userGroupId;
    return groupA || 1;
  });

  useEffect(() => {
    if (initialGroupId && scenario.assignedGroups.includes(initialGroupId)) {
      setSelectedGroupId(initialGroupId);
      setSelectedMode('single');
    } else if (userGroupId && scenario.assignedGroups.includes(userGroupId)) {
      setSelectedGroupId(userGroupId);
      setSelectedMode('single');
    } else if (groupA) {
      setSelectedGroupId(groupA);
      setSelectedMode('single');
    }
  }, [scenarioId, initialGroupId, userGroupId, groupA]);

  const activeGroup = workspace.groups[selectedGroupId];
  const group1Data = workspace.groups[groupA];
  const group2Data = workspace.groups[groupB];

  const getOnlineNames = (gId: number) =>
    presence.filter((p) => p.groupId === gId).map((p) => p.name);

  const getJoinedRoster = (gId: number) =>
    Object.values(workspace.studentScores || {}).filter(
      (s) => s.groupId === gId && s.active && isJoinedStudent(s)
    );

  return (
    <div className="space-y-8">
      {/* Unified Single-Row Group 1–10 Selector */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 text-sm">
          <Users className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-900">
            กำลังเปิดดู: กลุ่มที่ {selectedGroupId} ({scenario.shortTitle})
          </span>
          {userGroupId && userGroupId === selectedGroupId && (
            <span className="text-xs font-bold text-emerald-700">· กลุ่มของคุณ</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="switch-group-1-10" className="text-xs font-semibold text-slate-700">
            เปลี่ยนไปกลุ่ม:
          </label>
          <select
            id="switch-group-1-10"
            value={selectedGroupId}
            onChange={(e) => {
              const gId = Number(e.target.value);
              const targetSc = getScenarioForGroup(gId);
              setSelectedMode('single');
              setSelectedGroupId(gId);
              if (targetSc.id !== scenario.id) {
                onSelectScenario(targetSc.id, gId);
              }
            }}
            className="px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((gId) => {
              const sc = getScenarioForGroup(gId);
              return (
                <option key={gId} value={gId}>
                  กลุ่มที่ {gId} · {sc.shortTitle}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Zone 1: Scenario Brief, Evidence, Context & Ideation Findings */}
      <div className="space-y-3">
        <div className="pb-2 border-b-2 border-slate-300">
          <h2 className="text-sm font-bold text-slate-800">
            ส่วนที่ 1 · ข้อมูลสถานการณ์ปัญหา (สำหรับอ่านวิเคราะห์ก่อนลงมือทำ)
          </h2>
        </div>
        <ScenarioBrief scenario={scenario} />
      </div>

      {/* Zone 2: 2-Group Collaborative Workspace */}
      <section className="space-y-5 pt-2" aria-label="พื้นที่ทำงานของ 2 กลุ่มในสถานการณ์นี้">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-3 border-b-2 border-slate-300">
          <div>
            <div className="text-xs font-bold text-blue-800">
              ส่วนที่ 2 · พื้นที่ปฏิบัติงานและส่งงานของกลุ่ม
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              กระดานปฏิบัติการกลุ่ม · กลุ่มที่ {groupA} และ กลุ่มที่ {groupB}
            </h2>
            <p className="text-sm text-slate-700 mt-0.5">
              ทำงานในกลุ่มของคุณ หรือสลับดูกลุ่มคู่ขนานในสถานการณ์เดียวกันเพื่อคอมเมนต์ V.1
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-300 rounded-xl shadow-xs shrink-0 self-start sm:self-auto">
            {[groupA, groupB].map((gId) => {
              const g = workspace.groups[gId];
              const isSelected = selectedMode === 'single' && selectedGroupId === gId;
              return (
                <button
                  key={gId}
                  type="button"
                  onClick={() => {
                    setSelectedMode('single');
                    setSelectedGroupId(gId);
                  }}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {g?.groupName || `กลุ่มที่ ${gId}`}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedMode('compare')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedMode === 'compare'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>เทียบ 2 กลุ่ม</span>
            </button>
          </div>
        </div>

        {selectedMode === 'single' && activeGroup ? (
          <GroupWorkspacePanel
            group={activeGroup}
            scenario={scenario}
            activeTab={activeTab}
            onChangeTab={onChangeTab}
            onlineMembers={getOnlineNames(activeGroup.groupId)}
            registeredMembers={getJoinedRoster(activeGroup.groupId)}
            onUpdateMeta={(f, v) => onUpdateMeta(activeGroup.groupId, f, v)}
            onAddIdeationNote={(cat, txt) => onAddIdeationNote(activeGroup.groupId, cat, txt)}
            onVoteIdeationNote={(nId) => onVoteIdeationNote(activeGroup.groupId, nId)}
            onDeleteIdeationNote={(nId) => onDeleteIdeationNote(activeGroup.groupId, nId)}
            onUpdateCanvas={(f, v) => onUpdateCanvas(activeGroup.groupId, f, v)}
            onUpdateHumanAi={(f, v) => onUpdateHumanAi(activeGroup.groupId, f, v)}
            onAddComment={(s, i) => onAddComment(activeGroup.groupId, s, i)}
            onDeleteComment={(cId) => onDeleteComment(activeGroup.groupId, cId)}
            onUpdateReflection={(f, v) => onUpdateReflection(activeGroup.groupId, f, v)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[group1Data, group2Data].map((g) => (
              <div
                key={g.groupId}
                className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{g.groupName}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      สมาชิก: {g.members || 'ยังไม่ได้ระบุรายชื่อ'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('single');
                      setSelectedGroupId(g.groupId);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer shrink-0"
                  >
                    เข้ากระดานกลุ่มนี้
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <dl className="space-y-3 text-sm">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <dt className="text-xs font-bold text-rose-700">1. Problem Statement</dt>
                      <dd className="text-slate-800 mt-0.5">{g.canvas.problemStatement || '—'}</dd>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <dt className="text-xs font-bold text-sky-700">2. Target User</dt>
                      <dd className="text-slate-800 mt-0.5">{g.canvas.targetUser || '—'}</dd>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <dt className="text-xs font-bold text-amber-700">3. Application Idea</dt>
                      <dd className="text-slate-800 mt-0.5">{g.canvas.applicationIdea || '—'}</dd>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <dt className="text-xs font-bold text-emerald-700">4. Core Features</dt>
                      <dd className="text-slate-800 mt-0.5 whitespace-pre-wrap">{g.canvas.coreFeatures || '—'}</dd>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <dt className="text-xs font-bold text-indigo-700">5. Expected Impact</dt>
                      <dd className="text-slate-800 mt-0.5">{g.canvas.expectedImpact || '—'}</dd>
                    </div>
                  </dl>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600 tabular-nums">
                    <span>ไอเดียระดมสมอง: {g.ideationNotes.length} รายการ</span>
                    <span>คอมเมนต์ V.1: {g.comments.length} รายการ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
