import React from 'react';
import { Award, Sparkles, Zap } from 'lucide-react';
import type { StudentScoreRecord } from '../types';

interface ScorePowerBarsProps {
  record: StudentScoreRecord;
  compact?: boolean;
}

const SCORE_METRICS: {
  key: keyof Pick<
    StudentScoreRecord,
    | 'canvasScore'
    | 'promptV1Score'
    | 'peerReviewScore'
    | 'promptV2Score'
    | 'vercelScore'
    | 'bonusScore'
  >;
  label: string;
  max: number;
  barClass: string;
  trackClass: string;
  textClass: string;
}[] = [
  {
    key: 'canvasScore',
    label: '1. วิเคราะห์ & Canvas',
    max: 20,
    barClass: 'bg-rose-500',
    trackClass: 'bg-rose-100',
    textClass: 'text-rose-800',
  },
  {
    key: 'promptV1Score',
    label: '2. Prompt V.1 & AI',
    max: 20,
    barClass: 'bg-sky-500',
    trackClass: 'bg-sky-100',
    textClass: 'text-sky-800',
  },
  {
    key: 'peerReviewScore',
    label: '3. คอมเมนต์ V.1',
    max: 15,
    barClass: 'bg-indigo-500',
    trackClass: 'bg-indigo-100',
    textClass: 'text-indigo-800',
  },
  {
    key: 'promptV2Score',
    label: '4. พัฒนาแอป V.2',
    max: 25,
    barClass: 'bg-emerald-500',
    trackClass: 'bg-emerald-100',
    textClass: 'text-emerald-800',
  },
  {
    key: 'vercelScore',
    label: '5. Vercel + สะท้อนผล',
    max: 20,
    barClass: 'bg-blue-600',
    trackClass: 'bg-blue-100',
    textClass: 'text-blue-800',
  },
  {
    key: 'bonusScore',
    label: '6. คะแนนพิเศษ (ผู้สอนให้เพิ่ม)',
    max: 20,
    barClass: 'bg-amber-500',
    trackClass: 'bg-amber-100',
    textClass: 'text-amber-800',
  },
];

function getPowerTierLabel(total: number): string {
  if (total >= 100) return 'พลังทะลุขีดจำกัด · พิเศษยอดเยี่ยม';
  if (total >= 85) return 'พลังเต็มพิกัด · ยอดเยี่ยม';
  if (total >= 70) return 'พลังระดับสูง · ดีมาก';
  if (total >= 50) return 'กำลังสะสมพลัง · ผ่านเกณฑ์';
  if (total > 0) return 'เริ่มต้นสะสมพลัง';
  return 'รอการประเมินคะแนนจากครู';
}

export const ScorePowerBars: React.FC<ScorePowerBarsProps> = ({ record, compact = false }) => {
  const coreScore =
    Number(record.canvasScore || 0) +
    Number(record.promptV1Score || 0) +
    Number(record.peerReviewScore || 0) +
    Number(record.promptV2Score || 0) +
    Number(record.vercelScore || 0);
  const bonus = Number(record.bonusScore || 0);
  const corePct = Math.min(100, Math.max(0, coreScore));
  const bonusPct = Math.min(100, Math.round((bonus / 20) * 100));

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header + Master Total Power Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-700">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>หลอดค่าพลังคะแนนสะสม</span>
            <span aria-hidden="true">·</span>
            <span>รหัส {record.studentCode}</span>
            <span aria-hidden="true">·</span>
            <span>กลุ่มที่ {record.groupId}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{record.studentName}</h2>
          <p className="text-xs font-semibold text-slate-600">
            สถานะพลัง: <span className="text-blue-700">{getPowerTierLabel(record.totalScore)}</span>
          </p>
        </div>

        {/* Master Total Power Gauge */}
        <div className="lg:w-96 bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
              <Award className="w-4 h-4 text-amber-400" />
              <span>พลังรวมทั้งหมด</span>
            </span>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="font-mono text-lg font-bold text-emerald-400">
                {record.totalScore}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
              {bonus > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  +{bonus} พิเศษ
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${corePct}%` }}
              />
            </div>

            {bonus > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                  พลังพิเศษ (+{bonus})
                </span>
                <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden border border-amber-500/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                    style={{ width: `${bonusPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Individual Skill + Bonus Power Bars */}
      <div
        className={`grid grid-cols-1 ${
          compact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'
        } gap-4`}
      >
        {SCORE_METRICS.map((metric) => {
          const val = Number(record[metric.key] || 0);
          const pct = Math.min(100, Math.round((val / metric.max) * 100));
          return (
            <div key={metric.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-slate-800 truncate">{metric.label}</span>
                <span className={`font-mono font-bold tabular-nums shrink-0 ${metric.textClass}`}>
                  {metric.key === 'bonusScore' ? `+${val}/${metric.max}` : `${val}/${metric.max}`}
                </span>
              </div>
              <div className={`h-3 w-full rounded-full overflow-hidden ${metric.trackClass}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${metric.barClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {record.teacherNote && (
        <div className="pt-3 border-t border-slate-100 text-sm text-slate-700">
          <span className="font-bold text-slate-900">ข้อเสนอแนะจากครูผู้สอน:</span>{' '}
          {record.teacherNote}
        </div>
      )}
    </div>
  );
};
