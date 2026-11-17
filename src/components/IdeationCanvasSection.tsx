import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Save, Send, ThumbsUp, Trash2 } from 'lucide-react';
import type { CanvasData, IdeationCategory, IdeationNote } from '../types';

interface IdeationCanvasSectionProps {
  title: string;
  subtitle: string;
  notes: IdeationNote[];
  canvas: CanvasData;
  lastEditor?: string;
  onAddNote: (category: IdeationCategory, text: string) => void;
  onVoteNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateCanvas: (field: keyof CanvasData, value: string) => void;
}

const CATEGORY_META: {
  id: IdeationCategory;
  canvasField: keyof CanvasData;
  indexLabel: string;
  label: string;
  shortLabel: string;
  placeholder: string;
  hint: string;
  headerBg: string;
  headerText: string;
  noteStyle: string;
  activeBtn: string;
}[] = [
  {
    id: 'problem',
    canvasField: 'problemStatement',
    indexLabel: '01',
    label: 'Problem Statement (ปัญหาสิ่งแวดล้อมที่ต้องการแก้ไข)',
    shortLabel: '1. Problem',
    placeholder: 'ระบุแก่นปัญหาสิ่งแวดล้อม สาเหตุ และผลกระทบหลักที่กลุ่มต้องการแก้ไขให้ชัดเจน...',
    hint: 'ปัญหาคืออะไร เกิดที่ไหน และทำไมจึงต้องแก้ไขอย่างเร่งด่วน?',
    headerBg: 'bg-rose-100 border-b border-rose-200',
    headerText: 'text-rose-900',
    noteStyle: 'bg-rose-50 border-rose-300 text-rose-950',
    activeBtn: 'bg-rose-600 text-white',
  },
  {
    id: 'user',
    canvasField: 'targetUser',
    indexLabel: '02',
    label: 'Target User (ใครคือผู้ที่ได้รับผลกระทบและผู้ใช้แอป)',
    shortLabel: '2. Target User',
    placeholder: 'ระบุกลุ่มผู้ได้รับผลกระทบหลัก ผู้ใช้งานภาคสนาม หรือหน่วยงานที่เกี่ยวข้อง...',
    hint: 'ใครเดือดร้อนที่สุด และใครจะเป็นผู้เปิดใช้งานแอปนี้จริง?',
    headerBg: 'bg-sky-100 border-b border-sky-200',
    headerText: 'text-sky-900',
    noteStyle: 'bg-sky-50 border-sky-300 text-sky-950',
    activeBtn: 'bg-sky-600 text-white',
  },
  {
    id: 'idea',
    canvasField: 'applicationIdea',
    indexLabel: '03',
    label: 'Application Idea (แนวคิด Application ที่จะสร้าง)',
    shortLabel: '3. App Idea',
    placeholder: 'ตั้งชื่อแนวคิดแอปและอธิบายสั้นๆ ว่าแอปทำงานอย่างไรเพื่อแก้ปัญหานี้...',
    hint: 'สรุปแนวคิดหลักของแอปใน 1–2 ประโยคที่เห็นภาพชัดเจน',
    headerBg: 'bg-amber-100 border-b border-amber-200',
    headerText: 'text-amber-900',
    noteStyle: 'bg-amber-50 border-amber-300 text-amber-950',
    activeBtn: 'bg-amber-600 text-white',
  },
  {
    id: 'feature',
    canvasField: 'coreFeatures',
    indexLabel: '04',
    label: 'Core Features (ฟีเจอร์หลักของแอปพลิเคชัน)',
    shortLabel: '4. Core Features',
    placeholder: 'ระบุ 3–4 ฟีเจอร์สำคัญ เช่น แผนที่แจ้งเตือน ปักหมุดภาพถ่าย ระบบจัดคิวช่วยเหลือ...',
    hint: 'ฟีเจอร์ใดจำเป็นที่สุดในการแก้ปัญหาของ Target User?',
    headerBg: 'bg-emerald-100 border-b border-emerald-200',
    headerText: 'text-emerald-900',
    noteStyle: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    activeBtn: 'bg-emerald-600 text-white',
  },
  {
    id: 'impact',
    canvasField: 'expectedImpact',
    indexLabel: '05',
    label: 'Expected Impact (ผลลัพธ์ที่คาดว่าจะเกิดขึ้น)',
    shortLabel: '5. Expected Impact',
    placeholder: 'ระบุผลลัพธ์ที่วัดผลได้ เช่น ลดเวลาเตือนภัย ลดความเสียหาย หรือฟื้นฟูระบบนิเวศ...',
    hint: 'เมื่อนำแอปไปใช้จริง สภาพแวดล้อมและชุมชนจะดีขึ้นอย่างไร?',
    headerBg: 'bg-indigo-100 border-b border-indigo-200',
    headerText: 'text-indigo-900',
    noteStyle: 'bg-indigo-50 border-indigo-300 text-indigo-950',
    activeBtn: 'bg-indigo-600 text-white',
  },
];

export const IdeationCanvasSection: React.FC<IdeationCanvasSectionProps> = ({
  title,
  subtitle,
  notes,
  canvas,
  lastEditor,
  onAddNote,
  onVoteNote,
  onDeleteNote,
  onUpdateCanvas,
}) => {
  const [selectedCat, setSelectedCat] = useState<IdeationCategory>('problem');
  const [noteInput, setNoteInput] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteSent, setNoteSent] = useState(false);
  const [canvasSaved, setCanvasSaved] = useState(false);
  const [filterCat, setFilterCat] = useState<IdeationCategory | 'all'>('all');

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) {
      setNoteError('กรุณาพิมพ์ข้อคิดเห็นหรือไอเดียก่อนกดส่ง');
      return;
    }
    setNoteError('');
    onAddNote(selectedCat, noteInput.trim());
    setNoteInput('');
    setNoteSent(true);
    setTimeout(() => setNoteSent(false), 2200);
  };

  const handleConfirmCanvasSave = () => {
    setCanvasSaved(true);
    setTimeout(() => setCanvasSaved(false), 2400);
  };

  const handleSendNoteToCanvas = (note: IdeationNote) => {
    const meta = CATEGORY_META.find((c) => c.id === note.category);
    if (!meta) return;
    const current = canvas[meta.canvasField] || '';
    const nextVal = current.trim() ? `${current.trim()}\n• ${note.text}` : note.text;
    onUpdateCanvas(meta.canvasField, nextVal);
  };

  const visibleNotes =
    filterCat === 'all' ? notes : notes.filter((n) => n.category === filterCat);

  const completedCount = CATEGORY_META.filter((m) => canvas[m.canvasField].trim().length > 0).length;
  const progressPercent = Math.round((completedCount / 5) * 100);

  return (
    <div className="space-y-8">
      {/* Studio Section Header + Live Progress Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="w-44 space-y-1">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="font-semibold text-slate-700">ความสมบูรณ์ Canvas</span>
              <span className="font-bold text-blue-700">{completedCount}/5 ช่อง</span>
            </div>
            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {lastEditor && (
            <div className="hidden sm:block text-xs text-slate-600 border-l border-slate-300 pl-4">
              อัปเดตโดย <span className="font-semibold text-slate-900">{lastEditor}</span>
            </div>
          )}
        </div>
      </div>

      {/* Part A: Tactile Studio Ideation Board (Dot-grid Canvas) */}
      <div className="bg-studio-grid border-2 border-slate-300 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-blue-800">งานย่อย 1A · ระดมสมองแปะโน้ตไอเดีย</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              กระดานระดมไอเดียแบบ Interactive (Ideation Sticky Board)
            </h3>
            <p className="text-xs text-slate-700 mt-0.5">
              เลือกหมวดหมู่ที่ต้องการแปะโพสต์อิท พิมพ์ไอเดีย โหวตข้อที่ชอบ แล้วกด "ส่งเข้า Canvas" ได้ทันที
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
            <button
              type="button"
              onClick={() => setFilterCat('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                filterCat === 'all' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({notes.length})
            </button>
            {CATEGORY_META.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCat(cat.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                  filterCat === cat.id ? cat.activeBtn : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Post-It Composer */}
        <form
          onSubmit={handlePostNote}
          className="bg-white border border-slate-300 rounded-xl p-4 space-y-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">หมวดหมู่ไอเดีย:</span>
            {CATEGORY_META.map((c) => {
              const isSelected = selectedCat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? `${c.activeBtn} border-transparent`
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {c.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => {
                setNoteInput(e.target.value);
                if (noteError) setNoteError('');
              }}
              placeholder="พิมพ์ไอเดีย ข้อคิดเห็น หรือฟีเจอร์ที่อยากเสนอให้กลุ่ม..."
              maxLength={500}
              className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>ส่งข้อคิดเห็น / แปะไอเดีย</span>
            </button>
          </div>
          {noteError && (
            <p className="text-xs font-semibold text-rose-700">{noteError}</p>
          )}
          {noteSent && (
            <p className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ส่งข้อคิดเห็นขึ้นกระดานเรียบร้อยแล้ว</span>
            </p>
          )}
        </form>

        {/* Sticky Notes Grid */}
        {visibleNotes.length === 0 ? (
          <div className="py-10 text-center bg-white/70 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500">
            ยังไม่มีโน้ตไอเดียในหมวดนี้ — เลือกหมวดหมู่ด้านบนแล้วแปะไอเดียแรกของทีมได้เลย
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleNotes.map((note) => {
              const catMeta = CATEGORY_META.find((c) => c.id === note.category) || CATEGORY_META[0];
              return (
                <div
                  key={note.id}
                  className={`border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs ${catMeta.noteStyle}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs opacity-80">
                      <span className="font-bold">{catMeta.shortLabel}</span>
                      <span>โดย {note.author}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {note.text}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-black/10">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onVoteNote(note.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white/90 hover:bg-white rounded-md border border-black/10 cursor-pointer tabular-nums"
                        title="โหวตไอเดียนี้"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{note.votes}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendNoteToCanvas(note)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white/90 hover:bg-white rounded-md border border-black/10 cursor-pointer"
                        title="ส่งข้อความนี้เข้าสู่ช่อง Canvas"
                      >
                        <span>ส่งเข้า Canvas</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1 opacity-60 hover:opacity-100 rounded cursor-pointer"
                      aria-label="ลบไอเดีย"
                      title="ลบไอเดีย"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Part B: 2D Visual Problem Analysis Canvas Grid */}
      <div className="space-y-4">
        <div className="pb-2 border-b-2 border-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-emerald-800">
              งานย่อย 1B · สรุปคำตอบลง Canvas 5 ช่อง
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              กระดานสรุป Design Canvas · 5 องค์ประกอบหลัก
            </h3>
            <p className="text-xs text-slate-700 mt-0.5">
              พิมพ์สรุปคำตอบของกลุ่มลงในแต่ละช่อง ทุกข้อความจะบันทึกอัตโนมัติ หรือกดปุ่มยืนยันการบันทึกด้านขวา
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirmCanvasSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {canvasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{canvasSaved ? `บันทึกแล้ว (${completedCount}/5 ช่อง)` : 'บันทึกคำตอบ Canvas'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {CATEGORY_META.map((item, idx) => {
            // Layout: 01 & 02 top (6 cols each), 03 center focal bridge (12 cols), 04 & 05 bottom (6 cols each)
            const spanClass = idx === 2 ? 'lg:col-span-12' : 'lg:col-span-6';
            const isFilled = canvas[item.canvasField].trim().length > 0;

            return (
              <div
                key={item.id}
                className={`${spanClass} bg-white border border-slate-300 rounded-2xl overflow-hidden flex flex-col shadow-sm`}
              >
                <div
                  className={`px-5 py-3 flex items-center justify-between gap-2 ${item.headerBg}`}
                >
                  <label
                    htmlFor={`canvas-${item.canvasField}`}
                    className={`text-sm font-bold flex items-center gap-2 ${item.headerText}`}
                  >
                    <span className="font-mono text-xs tabular-nums">{item.indexLabel}.</span>
                    <span>{item.label}</span>
                  </label>

                  {isFilled && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>กรอกแล้ว</span>
                    </span>
                  )}
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col gap-2 bg-white">
                  <p className="text-xs font-medium text-slate-600">{item.hint}</p>
                  <textarea
                    id={`canvas-${item.canvasField}`}
                    rows={idx === 2 ? 3 : 4}
                    value={canvas[item.canvasField]}
                    onChange={(e) => onUpdateCanvas(item.canvasField, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 leading-relaxed"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
