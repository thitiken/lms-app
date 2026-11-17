import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, Layers, MessageSquarePlus, Send } from 'lucide-react';
import { EXAMPLE_SCENARIO } from '../data/scenarios';
import type { CanvasData, ExampleWorkspace, IdeationCategory } from '../types';
import { IdeationCanvasSection } from './IdeationCanvasSection';
import { ScenarioBrief } from './ScenarioBrief';

interface ExampleScenarioPageProps {
  example: ExampleWorkspace;
  onUpdateCanvaLink: (link: string) => void;
  onUpdateCanvas: (field: keyof CanvasData, value: string) => void;
  onAddNote: (category: IdeationCategory, text: string) => void;
  onVoteNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onGoToGlobalScenarios: () => void;
}

const QUICK_FEEDBACK_CATEGORIES: { id: IdeationCategory; label: string }[] = [
  { id: 'idea', label: 'ข้อเสนอแนะ / แนวคิดแอป' },
  { id: 'problem', label: 'ปัญหาที่พบจากการทดลอง' },
  { id: 'feature', label: 'ฟีเจอร์ที่อยากให้เพิ่ม' },
  { id: 'user', label: 'มุมมองกลุ่มผู้ใช้' },
  { id: 'impact', label: 'ผลกระทบที่คาดหวัง' },
];

export const ExampleScenarioPage: React.FC<ExampleScenarioPageProps> = ({
  example,
  onUpdateCanvaLink,
  onUpdateCanvas,
  onAddNote,
  onVoteNote,
  onDeleteNote,
  onGoToGlobalScenarios,
}) => {
  const [linkSaved, setLinkSaved] = useState(false);
  const [feedbackCat, setFeedbackCat] = useState<IdeationCategory>('idea');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const safeHref =
    example.canvaLink.trim().startsWith('http://') ||
    example.canvaLink.trim().startsWith('https://')
      ? example.canvaLink.trim()
      : '';

  const handleSaveCanvaLink = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCanvaLink(example.canvaLink.trim());
    setLinkSaved(true);
    setTimeout(() => setLinkSaved(false), 2200);
  };

  const handleSendQuickFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = feedbackText.trim();
    if (!cleaned) {
      setFeedbackError('กรุณาพิมพ์ข้อคิดเห็นหรือข้อเสนอแนะก่อนกดส่ง');
      return;
    }
    setFeedbackError('');
    onAddNote(feedbackCat, cleaned);
    setFeedbackText('');
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Zone 1: Reading Material */}
      <div className="space-y-3">
        <div className="pb-2 border-b-2 border-slate-300 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            ส่วนที่ 1 · ข้อมูลสถานการณ์ตัวอย่าง (อ่านทำความเข้าใจร่วมกัน)
          </h2>
        </div>
        <ScenarioBrief scenario={EXAMPLE_SCENARIO} />
      </div>

      {/* Zone 2: Activity 1 — Canva Sandbox & Shared Suggestion Hub */}
      <section className="space-y-3" aria-label="กิจกรรมที่ 1: ทดลองใช้งานและให้ข้อเสนอแนะใน Canva">
        <div className="pb-2 border-b-2 border-slate-300 flex items-center justify-between">
          <h2 className="text-sm font-bold text-blue-900">
            ส่วนที่ 2 · ภารกิจที่ 1: ทดลองให้ Application และให้ข้อเสนอแนะใน Canva
          </h2>
        </div>

        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-blue-950 text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                <span>ภารกิจที่ 1</span>
                <span aria-hidden="true">·</span>
                <span>ทดลองร่วมกันทั้งชั้นเรียน</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                ทดลองให้ Application และให้ข้อเสนอแนะสถานการณ์ร่วมกันใน Canva
              </h3>
            </div>

            <button
              type="button"
              onClick={onGoToGlobalScenarios}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>ไปหน้า 5 สถานการณ์กลุ่ม (ขั้นที่ 2)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleSaveCanvaLink} className="space-y-3">
              <label htmlFor="canva-link-input" className="block text-sm font-semibold text-slate-800">
                ลิงก์กระดาน Canva ร่วมกันของห้องเรียน (วาง URL แล้วกดบันทึกลิงก์)
              </label>
              <div className="flex flex-col lg:flex-row gap-3">
                <input
                  id="canva-link-input"
                  type="url"
                  value={example.canvaLink}
                  onChange={(e) => onUpdateCanvaLink(e.target.value)}
                  placeholder="https://www.canva.com/design/..."
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {linkSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : null}
                    <span>{linkSaved ? 'บันทึกลิงก์แล้ว' : 'บันทึกลิงก์ Canva'}</span>
                  </button>
                  {safeHref && (
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap"
                    >
                      <Layers className="w-4 h-4" />
                      <span>เปิดกระดาน Canva</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </form>

            {/* Quick Inline Comment / Feedback Submission Form */}
            <form
              onSubmit={handleSendQuickFeedback}
              className="p-4 sm:p-5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-blue-700" />
                  <span className="text-sm font-bold text-slate-900">
                    ส่งข้อคิดเห็น / ข้อเสนอแนะจากการทดลองใช้งาน (ซิงค์ขึ้นกระดานทันที)
                  </span>
                </div>
                {feedbackSent && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ส่งข้อคิดเห็นเรียบร้อยแล้ว</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  aria-label="หมวดหมู่ข้อคิดเห็น"
                  value={feedbackCat}
                  onChange={(e) => setFeedbackCat(e.target.value as IdeationCategory)}
                  className="sm:w-56 px-3 py-2.5 text-sm font-medium bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {QUICK_FEEDBACK_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    if (feedbackError) setFeedbackError('');
                  }}
                  placeholder="พิมพ์ข้อคิดเห็น ข้อสังเกต หรือข้อเสนอแนะของคุณที่นี่..."
                  maxLength={500}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งข้อคิดเห็น</span>
                </button>
              </div>

              {feedbackError && (
                <p className="text-xs font-semibold text-rose-700">{feedbackError}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Zone 3: Shared Example Ideation + 5-Part Canvas */}
      <section className="space-y-3" aria-label="ส่วนที่ 3: กระดานระดมไอเดียและ Design Canvas">
        <div className="pb-2 border-b-2 border-slate-300">
          <h2 className="text-sm font-bold text-emerald-900">
            ส่วนที่ 3 · พื้นที่ฝึกวิเคราะห์ &amp; Design Canvas 5 องค์ประกอบ (ทำร่วมกันทั้งห้อง)
          </h2>
        </div>

        <IdeationCanvasSection
          title="กระดานตัวอย่างร่วมกัน: วิเคราะห์สถานการณ์ & Canvas 5 องค์ประกอบ"
          subtitle="ฝึกวิเคราะห์ 1. Problem Statement, 2. Target User, 3. Application Idea, 4. Core Features และ 5. Expected Impact ร่วมกันทั้งชั้นเรียน"
          notes={example.sandboxFeedbackNotes}
          canvas={example.canvas}
          lastEditor={example.lastEditor}
          onAddNote={onAddNote}
          onVoteNote={onVoteNote}
          onDeleteNote={onDeleteNote}
          onUpdateCanvas={onUpdateCanvas}
        />
      </section>
    </div>
  );
};
