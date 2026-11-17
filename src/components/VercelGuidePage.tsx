import React from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, FolderUp, Globe, Terminal } from 'lucide-react';
import { getScenarioForGroup } from '../data/scenarios';
import type { AppWorkspaceState } from '../types';
import type { GroupSubTab } from './GroupWorkspacePanel';

interface VercelGuidePageProps {
  workspace: AppWorkspaceState;
  onOpenGroup: (scenarioId: string, groupId: number, tab?: GroupSubTab) => void;
}

export const VercelGuidePage: React.FC<VercelGuidePageProps> = ({ workspace, onOpenGroup }) => {
  const groups = Object.values(workspace.groups).sort((a, b) => a.groupId - b.groupId);
  const deployedCount = groups.filter((g) => g.vercelUrl.trim().length > 0).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-300">
              กิจกรรมที่ 6 · เวลา 10 นาที · นำขึ้นใช้งานจริงและสะท้อนผล
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              คู่มือนำเข้าโปรเจกต์สู่ Vercel (โดยการอัปโหลด) & ผลงาน 10 กลุ่ม
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-300 tabular-nums">
            ส่งลิงก์ Vercel แล้ว <span className="text-emerald-400 font-bold">{deployedCount}/10</span> กลุ่ม
          </div>
        </div>
        <p className="text-sm text-slate-300 max-w-[75ch] leading-relaxed">
          เมื่อพัฒนาแอป V.2 เสร็จสมบูรณ์แล้ว ให้นักเรียนส่งออกไฟล์โปรเจกต์จากเครื่องมือที่สร้าง
          (เช่น ไฟล์ HTML/JS หรือโฟลเดอร์โปรเจกต์ React/Vite) แล้วนำเข้า Vercel เพื่อรับลิงก์สาธารณะมาส่งในกระดานของกลุ่มตนเองพร้อมบันทึกสะท้อนผล
        </p>
      </section>

      {/* 3 Clear Deployment Steps */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-700">
            <FolderUp className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">1. ดาวน์โหลด / เตรียมไฟล์โปรเจกต์ V.2</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            ดาวน์โหลดโค้ดแอป V.2 เป็นไฟล์ <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.zip</code> แล้วแตกไฟล์เป็นโฟลเดอร์
            โดยตรวจสอบให้แน่ใจว่ามีไฟล์ <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">index.html</code> หรือ <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">package.json</code> อยู่ในโฟลเดอร์หลัก
          </p>
        </div>

        <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700">
            <Terminal className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">2. อัปโหลดขึ้น Vercel</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            วิธีที่ 1: อัปโหลดโฟลเดอร์ขึ้น GitHub แล้วกด <strong>Add New Project</strong> ใน Vercel<br />
            วิธีที่ 2: เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง{' '}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">npx vercel --prod</code> เพื่ออัปโหลดโฟลเดอร์ขึ้น Vercel ทันที
          </p>
        </div>

        <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-800">
            <Globe className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">3. ส่งลิงก์ & สะท้อนผลการเรียนรู้</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            คัดลอกลิงก์ <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">https://...vercel.app</code> ที่ได้
            ไปวางในแท็บ <strong>5. นำเข้า Vercel + สะท้อนผล</strong> ของกลุ่มคุณ พร้อมกรอกคำตอบสะท้อนผล 3 ข้อ
          </p>
        </div>
      </section>

      {/* Live Gallery of Submitted Vercel Apps & Reflections */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          ทำเนียบผลงาน Vercel และบันทึกสะท้อนผลของทั้ง 10 กลุ่ม
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => {
            const sc = getScenarioForGroup(g.groupId);
            const hasUrl =
              g.vercelUrl.trim().startsWith('http://') || g.vercelUrl.trim().startsWith('https://');
            return (
              <div key={g.groupId} className="bg-white border border-slate-300 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500">{sc.shortTitle}</div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{g.groupName}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenGroup(sc.id, g.groupId, 'vercel')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer shrink-0"
                  >
                    <span>ส่งงาน / แก้ไข</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-sm">
                  {hasUrl ? (
                    <a
                      href={g.vercelUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline break-all"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{g.vercelUrl.trim()}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">ยังไม่ได้ส่งลิงก์ Vercel Production</span>
                  )}
                </div>

                {g.vercelPackageName && (
                  <div className="text-xs text-slate-500">
                    ไฟล์แนบยืนยัน: {g.vercelPackageName}
                  </div>
                )}

                {g.reflection.keyLearning.trim() && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">สะท้อนผล:</span>{' '}
                    {g.reflection.keyLearning}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
