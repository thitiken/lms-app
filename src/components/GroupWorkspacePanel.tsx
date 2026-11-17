import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Circle,
  Copy,
  ExternalLink,
  Save,
  Send,
  Sparkles,
  Square,
  Upload,
} from 'lucide-react';
import type {
  CanvasData,
  GroupWorkspace,
  HumanVsAiData,
  IdeationCategory,
  ReflectionData,
  ScenarioDefinition,
  StudentScoreRecord,
} from '../types';
import { IdeationCanvasSection } from './IdeationCanvasSection';

export type GroupSubTab = 'canvas' | 'prompt-v1' | 'comments' | 'prompt-v2' | 'vercel';

interface GroupWorkspacePanelProps {
  group: GroupWorkspace;
  scenario: ScenarioDefinition;
  activeTab: GroupSubTab;
  onChangeTab: (tab: GroupSubTab) => void;
  onlineMembers: string[];
  registeredMembers?: StudentScoreRecord[];
  onUpdateMeta: (field: string, value: string | boolean[]) => void;
  onAddIdeationNote: (category: IdeationCategory, text: string) => void;
  onVoteIdeationNote: (noteId: string) => void;
  onDeleteIdeationNote: (noteId: string) => void;
  onUpdateCanvas: (field: keyof CanvasData, value: string) => void;
  onUpdateHumanAi: (field: keyof HumanVsAiData, value: string) => void;
  onAddComment: (strengths: string, improvements: string) => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateReflection: (field: keyof ReflectionData, value: string) => void;
}

const VERCEL_CHECKLIST_LABELS = [
  '1. ส่งออกไฟล์โปรเจกต์หรือ Build โฟลเดอร์ (dist / zip / repo) เรียบร้อยแล้ว',
  '2. อัปโหลดโปรเจกต์เข้าสู่ Vercel Dashboard หรือเชื่อมต่อ Git Repository แล้ว',
  '3. ทดสอบเปิดลิงก์ Production (.vercel.app) บนมือถือและคอมพิวเตอร์แล้วใช้งานได้จริง',
  '4. วางลิงก์ Vercel URL และบันทึกสะท้อนผลการเรียนรู้ด้านล่างครบถ้วน',
];

export const GroupWorkspacePanel: React.FC<GroupWorkspacePanelProps> = ({
  group,
  scenario,
  activeTab,
  onChangeTab,
  onlineMembers,
  registeredMembers = [],
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [commentStrengths, setCommentStrengths] = useState('');
  const [commentImprovements, setCommentImprovements] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const handleCopy = (key: string, text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const buildPromptFromCanvas = () => {
    const c = group.canvas;
    return [
      `จงพัฒนาเว็บแอปพลิเคชันสำหรับสถานการณ์: ${scenario.title}`,
      ``,
      `1. ปัญหาสิ่งแวดล้อมที่ต้องการแก้ไข (Problem Statement):`,
      c.problemStatement || '[ยังไม่ได้กรอก — โปรดระบุปัญหาหลัก]',
      ``,
      `2. กลุ่มผู้ใช้งานเป้าหมาย (Target User):`,
      c.targetUser || '[ยังไม่ได้กรอก — โปรดระบุผู้ได้รับผลกระทบ]',
      ``,
      `3. แนวคิดแอปพลิเคชัน (Application Idea):`,
      c.applicationIdea || '[ยังไม่ได้กรอก — โปรดระบุแนวคิดแอป]',
      ``,
      `4. ฟีเจอร์หลักที่ต้องมี (Core Features):`,
      c.coreFeatures || '[ยังไม่ได้กรอก — โปรดระบุฟีเจอร์หลัก 3-4 อย่าง]',
      ``,
      `5. ผลลัพธ์ที่คาดหวัง (Expected Impact):`,
      c.expectedImpact || '[ยังไม่ได้กรอก — โปรดระบุผลกระทบเชิงบวก]',
      ``,
      `ข้อกำหนดด้านการออกแบบและ UX:`,
      `- ภาษาไทยทั้งหมด อ่านง่าย ชัดเจน ใช้ได้ทั้งมือถือและคอมพิวเตอร์`,
      `- เน้นข้อมูลที่ช่วยให้ Target User ตัดสินใจหรือลงมือปฏิบัติได้จริงทันที`,
    ].join('\n');
  };

  const handleGeneratePromptV1 = () => {
    onUpdateMeta('promptV1', buildPromptFromCanvas());
  };

  const handleCopyV1ToV2 = () => {
    const source = group.promptV1.trim() ? group.promptV1 : buildPromptFromCanvas();
    const commentsSummary =
      group.comments.length > 0
        ? `\n\nข้อเสนอแนะที่นำมาปรับปรุงจาก V.1:\n` +
          group.comments
            .map((c, idx) => `${idx + 1}. (${c.fromGroupLabel}) ${c.improvements || c.strengths}`)
            .join('\n')
        : '';
    onUpdateMeta('promptV2', `${source}${commentsSummary}`);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentStrengths.trim() && !commentImprovements.trim()) {
      setCommentError('กรุณาพิมพ์จุดเด่นหรือข้อเสนอแนะอย่างน้อย 1 ช่องก่อนกดส่ง');
      return;
    }
    setCommentError('');
    onAddComment(commentStrengths.trim(), commentImprovements.trim());
    setCommentStrengths('');
    setCommentImprovements('');
    setCommentSent(true);
    setTimeout(() => setCommentSent(false), 2400);
  };

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    setReflectionSaved(true);
    setTimeout(() => setReflectionSaved(false), 2400);
  };

  const handlePackageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdateMeta('vercelPackageName', `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
    }
  };

  // Prompt V.1 quality check against Canvas fields
  const promptChecks = [
    { label: 'ระบุปัญหาสิ่งแวดล้อม', ok: group.promptV1.includes('ปัญหา') || group.canvas.problemStatement.trim().length > 0 },
    { label: 'ระบุ Target User', ok: group.promptV1.includes('Target User') || group.promptV1.includes('ผู้ใช้') },
    { label: 'ระบุ Core Features', ok: group.promptV1.includes('ฟีเจอร์') || group.promptV1.includes('Features') },
    { label: 'ระบุผลลัพธ์ (Impact)', ok: group.promptV1.includes('ผลลัพธ์') || group.promptV1.includes('Impact') },
  ];

  const canvasDone =
    group.canvas.problemStatement.trim().length > 0 &&
    group.canvas.targetUser.trim().length > 0 &&
    group.canvas.applicationIdea.trim().length > 0;
  const promptV1Done = group.promptV1.trim().length > 0;
  const commentsDone = group.comments.length > 0;
  const promptV2Done = group.promptV2.trim().length > 0;
  const vercelDone =
    group.vercelUrl.trim().length > 0 || group.reflection.keyLearning.trim().length > 0;

  const tabs: { id: GroupSubTab; step: string; label: string; done: boolean }[] = [
    { id: 'canvas', step: 'ภารกิจ 1', label: 'Ideate & Canvas', done: canvasDone },
    { id: 'prompt-v1', step: 'ภารกิจ 2', label: 'Prompt V.1 & มนุษย์-AI', done: promptV1Done },
    { id: 'comments', step: 'ภารกิจ 3', label: `ส่งข้อคิดเห็น V.1 (${group.comments.length})`, done: commentsDone },
    { id: 'prompt-v2', step: 'ภารกิจ 4', label: 'แก้สร้าง V.2', done: promptV2Done },
    { id: 'vercel', step: 'ภารกิจ 5', label: 'นำเข้า Vercel + สะท้อนผล', done: vercelDone },
  ];

  const completedTasks = tabs.filter((t) => t.done).length;

  const safeVercelHref =
    group.vercelUrl.trim().startsWith('http://') || group.vercelUrl.trim().startsWith('https://')
      ? group.vercelUrl.trim()
      : '';

  return (
    <div className="space-y-6">
      {/* Group Studio Header & 5-Task Switcher */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="font-bold text-white">พื้นที่ทำงาน · กลุ่มที่ {group.groupId}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-blue-300 font-semibold">{scenario.shortTitle}</span>
          </div>
          <div className="flex items-center gap-4 text-xs tabular-nums">
            <span className="text-emerald-400 font-bold">
              ความคืบหน้า: {completedTasks}/5 ภารกิจ
            </span>
            <span className="text-slate-300">
              ออนไลน์ {onlineMembers.length} คน
              {onlineMembers.length > 0 ? ` (${onlineMembers.join(', ')})` : ''}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 space-y-1">
              <label htmlFor={`group-name-${group.groupId}`} className="text-xs font-semibold text-slate-700">
                ชื่อกลุ่ม / ชื่อทีม (กลุ่มที่ {group.groupId})
              </label>
              <input
                id={`group-name-${group.groupId}`}
                type="text"
                value={group.groupName}
                onChange={(e) => onUpdateMeta('groupName', e.target.value)}
                placeholder={`กลุ่มที่ ${group.groupId}`}
                className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-7 space-y-1">
              <label htmlFor={`group-members-${group.groupId}`} className="text-xs font-semibold text-slate-700">
                รายชื่อสมาชิกในกลุ่ม (อัปเดตอัตโนมัติเมื่อลงชื่อเข้ากลุ่ม)
              </label>
              <input
                id={`group-members-${group.groupId}`}
                type="text"
                value={group.members}
                onChange={(e) => onUpdateMeta('members', e.target.value)}
                placeholder="พิมพ์ชื่อสมาชิกเพิ่มเติม หรือลงชื่อเข้ากลุ่มเพื่อเชื่อมรายชื่ออัตโนมัติ..."
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Registered teammates who joined this group */}
          {registeredMembers.length > 0 && (
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">สมาชิกที่เข้าร่วมกลุ่มที่ {group.groupId}:</span>
              {registeredMembers.map((m, idx) => (
                <span key={m.studentCode} className="text-slate-900 font-semibold">
                  {idx > 0 && <span className="text-slate-400 mr-2">·</span>}
                  {m.studentName}{' '}
                  <span className="font-mono text-slate-600">({m.studentCode})</span>
                </span>
              ))}
            </div>
          )}

          {/* Clear Numbered 5-Task Switcher */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-700">
              เลือกขั้นตอนภารกิจที่ต้องการทำ (เรียงตามลำดับ 1 → 5):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChangeTab(tab.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isActive
                        ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold">
                      <span className={isActive ? 'text-blue-100' : 'text-blue-700'}>
                        {tab.step}
                      </span>
                      {tab.done ? (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-emerald-300' : 'text-emerald-600'
                          }`}
                        />
                      ) : (
                        <Circle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-bold leading-snug">{tab.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: Ideation & 5-Part Canvas */}
      {activeTab === 'canvas' && (
        <IdeationCanvasSection
          title={`พื้นที่ระดมไอเดียและวิเคราะห์ Canvas — ${group.groupName}`}
          subtitle={`สถานการณ์: ${scenario.shortTitle} · สมาชิกในกลุ่มช่วยกันแปะไอเดียและสรุปลงใน Canvas 5 ช่อง`}
          notes={group.ideationNotes}
          canvas={group.canvas}
          lastEditor={group.lastEditor}
          onAddNote={onAddIdeationNote}
          onVoteNote={onVoteIdeationNote}
          onDeleteNote={onDeleteIdeationNote}
          onUpdateCanvas={onUpdateCanvas}
        />
      )}

      {/* Tab 2: Prompt V.1 & Human vs AI Analysis */}
      {activeTab === 'prompt-v1' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Prompt V.1 Studio */}
          <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="text-xs font-bold text-blue-700">งานย่อย 2A · สร้างต้นแบบ</div>
                <h3 className="text-base font-bold text-slate-900">ออกแบบ Prompt สร้างแอป V.1</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  ดึงข้อมูลจาก Canvas 5 ช่องมาสังเคราะห์เป็น Prompt เพื่อนำไปสร้างแอปต้นแบบ V.1
                </p>
              </div>
              <button
                type="button"
                onClick={handleGeneratePromptV1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>สังเคราะห์จาก Canvas</span>
              </button>
            </div>

            {/* Prompt Completeness Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {promptChecks.map((chk) => (
                <div key={chk.label} className="flex items-center gap-1.5 text-xs">
                  {chk.ok && group.promptV1.trim() ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={chk.ok && group.promptV1.trim() ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                    {chk.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={`prompt-v1-${group.groupId}`} className="text-xs font-semibold text-slate-700">
                  เนื้อหา Prompt V.1 (แก้ไขเพิ่มเติมรายละเอียด UI/สี/การใช้งานได้)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy('v1', group.promptV1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                >
                  {copiedKey === 'v1' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'v1' ? 'คัดลอกแล้ว' : 'คัดลอก Prompt'}</span>
                </button>
              </div>
              <textarea
                id={`prompt-v1-${group.groupId}`}
                rows={11}
                value={group.promptV1}
                onChange={(e) => onUpdateMeta('promptV1', e.target.value)}
                placeholder="กดปุ่ม 'สังเคราะห์จาก Canvas' ด้านบน หรือเขียน Prompt สร้างแอป V.1 ของกลุ่มคุณที่นี่..."
                className="w-full px-3.5 py-2.5 font-mono text-xs sm:text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label htmlFor={`v1-url-${group.groupId}`} className="block text-xs font-semibold text-slate-700">
                ลิงก์ตัวอย่างแอป V.1 (เพื่อให้เพื่อนกลุ่มอื่นเข้าชมและคอมเมนต์)
              </label>
              <input
                id={`v1-url-${group.groupId}`}
                type="url"
                value={group.v1AppUrl}
                onChange={(e) => onUpdateMeta('v1AppUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Right: Human vs AI Analysis (during the 10-minute wait) */}
          <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-emerald-700">งานย่อย 2B · วิเคราะห์ระหว่างรอผล</div>
              <h3 className="text-base font-bold text-slate-900">
                วิเคราะห์บทบาท "มนุษย์ กับ AI" (ทำระหว่างรอผล V.1)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                ระหว่างรอผลแอป V.1 ให้สมาชิกในกลุ่มช่วยกันวิเคราะห์เปรียบเทียบ 4 มุมมอง
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5">
                <label htmlFor={`human-str-${group.groupId}`} className="block text-xs font-bold text-blue-900">
                  1. จุดแข็งของ "มนุษย์" ในการแก้ปัญหาสิ่งแวดล้อมนี้
                </label>
                <textarea
                  id={`human-str-${group.groupId}`}
                  rows={2}
                  value={group.humanVsAi.humanStrengths}
                  onChange={(e) => onUpdateHumanAi('humanStrengths', e.target.value)}
                  placeholder="เช่น ความเข้าใจบริบทชุมชนจริง ความเห็นอกเห็นใจผู้ประสบภัย การตัดสินใจเชิงคุณค่า..."
                  className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                <label htmlFor={`ai-str-${group.groupId}`} className="block text-xs font-bold text-emerald-900">
                  2. จุดแข็งของ "AI" ที่ช่วยเสริมงานของกลุ่ม
                </label>
                <textarea
                  id={`ai-str-${group.groupId}`}
                  rows={2}
                  value={group.humanVsAi.aiStrengths}
                  onChange={(e) => onUpdateHumanAi('aiStrengths', e.target.value)}
                  placeholder="เช่น การสังเคราะห์ข้อมูลเร็ว การสร้างโครงสร้างแอปต้นแบบ V.1 ในเวลาจำกัด..."
                  className="w-full px-3 py-2 text-sm bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
                <label htmlFor={`verify-${group.groupId}`} className="block text-xs font-bold text-amber-900">
                  3. สิ่งที่มนุษย์ต้องตรวจสอบและแก้ไขเอง (ข้อจำกัดของ AI)
                </label>
                <textarea
                  id={`verify-${group.groupId}`}
                  rows={2}
                  value={group.humanVsAi.verificationNeeds}
                  onChange={(e) => onUpdateHumanAi('verificationNeeds', e.target.value)}
                  placeholder="เช่น ความแม่นยำของข้อมูลพิกัด ความเรียบง่ายของปุ่มสำหรับผู้สูงอายุ ข้อมูลทางการแพทย์/สารเคมี..."
                  className="w-full px-3 py-2 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-1.5">
                <label htmlFor={`ethics-${group.groupId}`} className="block text-xs font-bold text-rose-900">
                  4. ความปลอดภัยข้อมูลและจริยธรรมที่ต้องคำนึงถึง
                </label>
                <textarea
                  id={`ethics-${group.groupId}`}
                  rows={2}
                  value={group.humanVsAi.ethicsAndContext}
                  onChange={(e) => onUpdateHumanAi('ethicsAndContext', e.target.value)}
                  placeholder="เช่น การคุ้มครองข้อมูลส่วนบุคคลของผู้แจ้งเหตุ การไม่เผยแพร่ข่าวลือที่สร้างความตื่นตระหนก..."
                  className="w-full px-3 py-2 text-sm bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Peer Comments on V.1 */}
      {activeTab === 'comments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-slate-600">งานย่อย 3A · ข้อมูลผลงาน V.1</div>
              <h3 className="text-base font-bold text-slate-900">สรุปผลงาน V.1 ของ {group.groupName}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-600">Application Idea</div>
                <p className="text-slate-900 mt-0.5 font-medium">
                  {group.canvas.applicationIdea || 'ยังไม่ได้ระบุแนวคิดแอปใน Canvas'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-600">Target User</div>
                <p className="text-slate-800 mt-0.5">
                  {group.canvas.targetUser || 'ยังไม่ได้ระบุกลุ่มเป้าหมาย'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-600">Core Features</div>
                <p className="text-slate-800 mt-0.5 whitespace-pre-wrap">
                  {group.canvas.coreFeatures || 'ยังไม่ได้ระบุฟีเจอร์หลัก'}
                </p>
              </div>
              {group.v1AppUrl.trim() && (
                <div className="pt-1">
                  <a
                    href={group.v1AppUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <span>เปิดดูแอป V.1</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {group.promptV1.trim() && (
                <div className="pt-1">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Prompt V.1</div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs whitespace-pre-wrap font-mono max-h-56 overflow-y-auto">
                    {group.promptV1}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Peer Feedback Board */}
          <div className="lg:col-span-7 bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-rose-700">งานย่อย 3B · กระดานคอมเมนต์ข้ามกลุ่ม</div>
              <h3 className="text-base font-bold text-slate-900">
                กระดานคอมเมนต์ V.1 แลกเปลี่ยนระหว่างกลุ่ม
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                เพื่อนต่างกลุ่มหรือครูผู้สอนร่วมให้ข้อเสนอแนะเชิงสร้างสรรค์เพื่อนำไปพัฒนาเป็น V.2
              </p>
            </div>

            <form onSubmit={handleSubmitComment} className="space-y-3 p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`c-str-${group.groupId}`} className="block text-xs font-semibold text-emerald-900 mb-1">
                    จุดเด่นที่ทำได้ดี
                  </label>
                  <textarea
                    id={`c-str-${group.groupId}`}
                    rows={2}
                    value={commentStrengths}
                    onChange={(e) => {
                      setCommentStrengths(e.target.value);
                      if (commentError) setCommentError('');
                    }}
                    placeholder="เช่น โฟกัสผู้ใช้ชัดเจน ฟีเจอร์แก้ปัญหาได้ตรงจุด..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor={`c-imp-${group.groupId}`} className="block text-xs font-semibold text-amber-900 mb-1">
                    ข้อเสนอแนะเพื่อพัฒนาต่อใน V.2
                  </label>
                  <textarea
                    id={`c-imp-${group.groupId}`}
                    rows={2}
                    value={commentImprovements}
                    onChange={(e) => {
                      setCommentImprovements(e.target.value);
                      if (commentError) setCommentError('');
                    }}
                    placeholder="เช่น ควรเพิ่มโหมดใช้งานออฟไลน์ หรือลดขั้นตอนการรายงานให้สั้นลง..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {commentError && (
                    <span className="text-xs font-semibold text-rose-700">{commentError}</span>
                  )}
                  {commentSent && !commentError && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ส่งข้อคิดเห็นเรียบร้อยแล้ว</span>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งข้อคิดเห็น</span>
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {group.comments.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  ยังไม่มีคอมเมนต์จากกลุ่มอื่น — เชิญเพื่อนร่วมชั้นร่วมให้ข้อเสนอแนะได้เลย
                </div>
              ) : (
                group.comments.map((c) => (
                  <div key={c.id} className="p-4 border border-slate-200 rounded-xl space-y-2 bg-slate-50/40">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-900">
                        {c.fromGroupLabel} · {c.authorName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteComment(c.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        ลบ
                      </button>
                    </div>
                    {c.strengths && (
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold text-emerald-700">จุดเด่น:</span> {c.strengths}
                      </p>
                    )}
                    {c.improvements && (
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold text-amber-700">ข้อเสนอแนะ V.2:</span> {c.improvements}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Refine & Build V.2 */}
      {activeTab === 'prompt-v2' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-amber-700">งานย่อย 4A · สรุปจุดปรับปรุง</div>
              <h3 className="text-base font-bold text-slate-900">
                ความคิดเห็นจาก V.1 ที่ต้องนำมาปรับแก้ ({group.comments.length})
              </h3>
            </div>
            {group.comments.length === 0 ? (
              <p className="text-sm text-slate-600">
                ยังไม่มีคอมเมนต์จาก V.1 สามารถอ้างอิงผลการวิเคราะห์ "มนุษย์ กับ AI" มาปรับแก้ได้เลย
              </p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {group.comments.map((c) => (
                  <div key={c.id} className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-900">
                      {c.fromGroupLabel} ({c.authorName})
                    </div>
                    {c.improvements && <p className="text-slate-800">{c.improvements}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <label htmlFor={`v2-changes-${group.groupId}`} className="block text-xs font-semibold text-slate-800">
                สรุปสิ่งที่กลุ่มปรับปรุงจาก V.1 เป็น V.2
              </label>
              <textarea
                id={`v2-changes-${group.groupId}`}
                rows={4}
                value={group.v2Improvements}
                onChange={(e) => onUpdateMeta('v2Improvements', e.target.value)}
                placeholder="เช่น เพิ่มปุ่ม SOS ฉุกเฉินขนาดใหญ่ ปรับข้อความคำเตือนให้เข้าใจง่ายขึ้นตามคำแนะนำของกลุ่มคู่ขนาน..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="text-xs font-bold text-indigo-700">งานย่อย 4B · อัปเกรด Prompt</div>
                <h3 className="text-base font-bold text-slate-900">พัฒนา Prompt &amp; แอป V.2</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  ปรับปรุง Prompt จาก V.1 โดยผสานคำแนะนำจากเพื่อนและจุดตรวจสอบของมนุษย์
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyV1ToV2}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                ดึง Prompt V.1 + คอมเมนต์มาปรับแก้
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={`prompt-v2-${group.groupId}`} className="text-xs font-semibold text-slate-700">
                  Prompt V.2 (ฉบับสมบูรณ์)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy('v2', group.promptV2)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                >
                  {copiedKey === 'v2' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'v2' ? 'คัดลอกแล้ว' : 'คัดลอก Prompt V.2'}</span>
                </button>
              </div>
              <textarea
                id={`prompt-v2-${group.groupId}`}
                rows={11}
                value={group.promptV2}
                onChange={(e) => onUpdateMeta('promptV2', e.target.value)}
                placeholder="ปรับแก้ Prompt V.2 ที่นี่ แล้วนำไปสร้างแอปเวอร์ชันที่ 2..."
                className="w-full px-3.5 py-2.5 font-mono text-xs sm:text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`v2-url-${group.groupId}`} className="block text-xs font-semibold text-slate-700">
                ลิงก์ทดสอบแอป V.2 (ก่อนนำขึ้น Vercel)
              </label>
              <input
                id={`v2-url-${group.groupId}`}
                type="url"
                value={group.v2AppUrl}
                onChange={(e) => onUpdateMeta('v2AppUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Vercel Upload & Final Reflection */}
      {activeTab === 'vercel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-blue-700">งานย่อย 5A · ส่งมอบระบบจริง</div>
              <h3 className="text-base font-bold text-slate-900">
                นำเข้าสู่ Vercel (โดยการอัปโหลด)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                ตรวจสอบรายการเตรียมอัปโหลด แนบชื่อไฟล์โปรเจกต์/Build และส่งลิงก์ Vercel Production ของกลุ่ม
              </p>
            </div>

            <div className="space-y-2.5">
              {VERCEL_CHECKLIST_LABELS.map((label, idx) => {
                const checked = Boolean(group.vercelUploadChecklist?.[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const next = [...(group.vercelUploadChecklist || [false, false, false, false])];
                      next[idx] = !next[idx];
                      onUpdateMeta('vercelUploadChecklist', next);
                    }}
                    className={`w-full flex items-start gap-3 p-3 text-left text-sm rounded-xl border transition-colors cursor-pointer ${
                      checked
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-800">
                ไฟล์โปรเจกต์ที่เตรียมอัปโหลดขึ้น Vercel (.zip / index.html / build)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกไฟล์เพื่อบันทึกหลักฐาน</span>
                  <input type="file" onChange={handlePackageFileSelect} className="hidden" />
                </label>
                <span className="text-xs text-slate-600 truncate">
                  {group.vercelPackageName || 'ยังไม่ได้เลือกไฟล์แนบยืนยัน'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor={`vercel-url-${group.groupId}`} className="block text-xs font-semibold text-slate-800">
                ลิงก์ Vercel Production ของกลุ่ม (.vercel.app)
              </label>
              <div className="flex gap-2">
                <input
                  id={`vercel-url-${group.groupId}`}
                  type="url"
                  value={group.vercelUrl}
                  onChange={(e) => onUpdateMeta('vercelUrl', e.target.value)}
                  placeholder="https://ecolab-group-x.vercel.app"
                  className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {safeVercelHref && (
                  <a
                    href={safeVercelHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl whitespace-nowrap shrink-0"
                  >
                    <span>เปิดเว็บ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Reflection Form */}
          <form onSubmit={handleSaveReflection} className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-emerald-700">งานย่อย 5B · สะท้อนผล</div>
              <h3 className="text-base font-bold text-slate-900">บันทึกสะท้อนผลการเรียนรู้ (Reflection)</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                สรุปบทเรียนจากการวิเคราะห์ปัญหาสิ่งแวดล้อม การทำงานร่วมกับเพื่อน และการใช้ AI สร้างแอปจริง
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor={`ref-learn-${group.groupId}`} className="block text-xs font-semibold text-slate-800 mb-1">
                  1. สิ่งสำคัญที่สุดที่ได้เรียนรู้จากการวิเคราะห์สถานการณ์และสร้างแอป
                </label>
                <textarea
                  id={`ref-learn-${group.groupId}`}
                  rows={3}
                  value={group.reflection.keyLearning}
                  onChange={(e) => onUpdateReflection('keyLearning', e.target.value)}
                  placeholder="เช่น การเข้าใจ Target User ทำให้ฟีเจอร์แอปแตกต่างจากที่คิดไว้ตอนแรก..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor={`ref-team-${group.groupId}`} className="block text-xs font-semibold text-slate-800 mb-1">
                  2. บทเรียนจากการระดมไอเดียและการคอมเมนต์แลกเปลี่ยนระหว่างกลุ่ม
                </label>
                <textarea
                  id={`ref-team-${group.groupId}`}
                  rows={3}
                  value={group.reflection.teamworkInsight}
                  onChange={(e) => onUpdateReflection('teamworkInsight', e.target.value)}
                  placeholder="เช่น ข้อเสนอแนะจากกลุ่มคู่ขนานช่วยให้เห็นจุดบอดเรื่องการใช้งานในพื้นที่อับสัญญาณ..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor={`ref-next-${group.groupId}`} className="block text-xs font-semibold text-slate-800 mb-1">
                  3. หากมีเวลาพัฒนาต่อยอดสู่การใช้งานจริง กลุ่มอยากเพิ่มอะไร
                </label>
                <textarea
                  id={`ref-next-${group.groupId}`}
                  rows={3}
                  value={group.reflection.nextImprovement}
                  onChange={(e) => onUpdateReflection('nextImprovement', e.target.value)}
                  placeholder="เช่น เชื่อมต่อข้อมูลเซนเซอร์น้ำฝนจริง หรือนำไปทดสอบกับผู้ใช้ในชุมชน..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                {reflectionSaved ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>บันทึกสะท้อนผลเรียบร้อยแล้ว</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">ข้อมูลบันทึกลงกลุ่มอัตโนมัติ</span>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกสะท้อนผล</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
