import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Database, HelpCircle, Lightbulb } from 'lucide-react';
import type { ScenarioDefinition } from '../types';

interface ScenarioBriefProps {
  scenario: ScenarioDefinition;
}

type InspectorTab = 'context' | 'findings' | 'questions';

export const ScenarioBrief: React.FC<ScenarioBriefProps> = ({ scenario }) => {
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<InspectorTab>('context');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="space-y-4" aria-label="ข้อมูลสถานการณ์ปัญหา">
      {/* Main Scenario Header + 16:9 Media Split */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
        {/* Clear Top Zone Banner distinguishing Reading Material */}
        <div className="bg-slate-900 text-white px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-blue-300">ส่วนอ่านข้อมูลโจทย์</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>{scenario.pageNumber}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-200">{scenario.region}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-amber-300">{scenario.severityLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md cursor-pointer shrink-0"
          >
            <span>{collapsed ? 'แสดงข้อมูลสถานการณ์' : 'ย่อข้อมูลโจทย์'}</span>
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
                {scenario.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-[68ch]">
                {scenario.summary}
              </p>
            </div>

            {scenario.assignedGroups.length > 0 ? (
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                <span className="font-semibold text-slate-900">กลุ่มผู้รับผิดชอบในหน้านี้:</span>
                <span className="font-bold text-blue-700">
                  กลุ่มที่ {scenario.assignedGroups[0]} และ กลุ่มที่ {scenario.assignedGroups[1]}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-600 text-xs">
                  สถานการณ์ละ 2 กลุ่ม · ระดมไอเดียและแลกเปลี่ยนคอมเมนต์ V.1
                </span>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-600">
                พื้นที่ทดลองฝึกวิเคราะห์สถานการณ์ร่วมกันทั้งชั้นเรียนก่อนแบ่งกลุ่มย่อย 10 กลุ่ม
              </div>
            )}
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-300">
            {!imgError ? (
              <img
                src={scenario.imageUrl}
                alt={scenario.title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover lg:absolute lg:inset-0"
              />
            ) : (
              <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-200">
                <Compass className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-sm font-medium text-center">{scenario.shortTitle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Evidence Strip & Interactive Tabs */}
        {!collapsed && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-300 bg-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-300">
              {scenario.metrics.map((metric) => (
                <div key={metric.label} className="p-4 sm:px-5">
                  <div className="text-xs font-semibold text-slate-600">{metric.label}</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                    {metric.value}
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">{metric.detail}</div>
                </div>
              ))}
            </div>

            {/* Interactive Tabbed Evidence Inspector */}
            <div className="border-t border-slate-300 p-5 sm:p-6 bg-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 border border-slate-300 rounded-xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('context')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'context'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>ข้อมูลประกอบสถานการณ์ ({scenario.contextData.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('findings')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'findings'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>ข้อค้นพบสำหรับ Ideate ({scenario.ideationFindings.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'questions'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>คำถามชวนคิด ({scenario.guidingQuestions.length})</span>
                  </button>
                </div>
              </div>

              {activeTab === 'context' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenario.contextData.map((fact, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-800 leading-relaxed"
                    >
                      <span className="font-mono text-xs font-bold text-blue-700 mt-0.5 tabular-nums shrink-0">
                        0{idx + 1}
                      </span>
                      <span>{fact}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'findings' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {scenario.ideationFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1.5"
                    >
                      <h3 className="text-sm font-bold text-emerald-950">{finding.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                        {finding.insight}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'questions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenario.guidingQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-sm text-slate-800 leading-relaxed"
                    >
                      <span className="font-mono text-xs font-bold text-amber-800 mt-0.5 shrink-0">
                        Q{idx + 1}
                      </span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
