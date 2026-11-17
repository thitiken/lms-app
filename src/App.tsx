import { useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone } from 'lucide-react';
import { ActivityTimerBar } from './components/ActivityTimerBar';
import { AuthModal } from './components/AuthModal';
import { ClassMatrixPage } from './components/ClassMatrixPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExampleScenarioPage } from './components/ExampleScenarioPage';
import type { GroupSubTab } from './components/GroupWorkspacePanel';
import { OverviewPage } from './components/OverviewPage';
import { ScenarioDetailPage } from './components/ScenarioDetailPage';
import { TeacherDashboardPage } from './components/TeacherDashboardPage';
import { TimelineScoreboardPage } from './components/TimelineScoreboardPage';
import { AppView, TopBar } from './components/TopBar';
import { VercelGuidePage } from './components/VercelGuidePage';
import { getScenarioForGroup } from './data/scenarios';
import { useCollaborativeWorkspace } from './hooks/useCollaborativeWorkspace';
import type { ActivityPhaseId } from './types';

function MainApp() {
  const [view, setView] = useState<AppView>({ type: 'overview' });
  const [groupSubTab, setGroupSubTab] = useState<GroupSubTab>('canvas');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [preselectedGroupId, setPreselectedGroupId] = useState<number | null>(null);

  const currentPageKey = view.type === 'scenario' ? view.scenarioId : view.type;

  const {
    workspace,
    presence,
    connected,
    session,
    displayRemainingSeconds,
    loginStudentByCode,
    loginTeacherWithGoogle,
    logout,
    upsertStudentScore,
    deleteStudentScore,
    seedDefaultRoster,
    upsertGroupScores,
    updateTeacherControls,
    updateExampleCanva,
    updateExampleCanvas,
    addExampleNote,
    voteExampleNote,
    deleteExampleNote,
    addGroupIdeationNote,
    voteGroupIdeationNote,
    deleteGroupIdeationNote,
    updateGroupCanvas,
    updateGroupHumanAi,
    updateGroupReflection,
    updateGroupMeta,
    addGroupComment,
    deleteGroupComment,
    controlTimer,
  } = useCollaborativeWorkspace(currentPageKey);

  const handleJumpToPhase = (phase: ActivityPhaseId) => {
    if (phase === 'step1') {
      setView({ type: 'scenario', scenarioId: 'example' });
      return;
    }

    const targetGroupId = session.groupId || 1;
    const targetScenario = getScenarioForGroup(targetGroupId);
    const tabMap: Record<Exclude<ActivityPhaseId, 'step1'>, GroupSubTab> = {
      step2: 'canvas',
      step3: 'prompt-v1',
      step4: 'comments',
      step5: 'prompt-v2',
      step6: 'vercel',
    };

    setGroupSubTab(tabMap[phase]);
    setView({
      type: 'scenario',
      scenarioId: targetScenario.id,
      initialGroupId: targetGroupId,
    });
  };

  const handleOpenGroup = (scenarioId: string, groupId: number, tab: GroupSubTab = 'canvas') => {
    setGroupSubTab(tab);
    setView({ type: 'scenario', scenarioId, initialGroupId: groupId });
  };

  const openAuthModal = (groupId?: number) => {
    setPreselectedGroupId(groupId ?? null);
    setAuthModalOpen(true);
  };

  const handleStudentLoginAndEnterGroup = async (
    studentCode: string,
    displayName: string,
    groupId: number
  ) => {
    const nextSession = await loginStudentByCode(studentCode, displayName, groupId);
    const targetGroupId = nextSession.groupId || groupId;
    const targetScenario = getScenarioForGroup(targetGroupId);
    setGroupSubTab('canvas');
    setView({
      type: 'scenario',
      scenarioId: targetScenario.id,
      initialGroupId: targetGroupId,
    });
    return nextSession;
  };

  const announcement = workspace?.teacherControls?.announcement?.trim();

  return (
    <div className="min-h-screen flex flex-col bg-[#dce5f2] text-slate-900">
      <TopBar
        currentView={view}
        onNavigate={setView}
        session={session}
        onOpenAuthModal={() => openAuthModal()}
      />

      <ActivityTimerBar
        timer={workspace?.timer}
        remainingSeconds={displayRemainingSeconds}
        connected={connected}
        presence={presence}
        lockedPhases={workspace?.teacherControls?.lockedPhases || []}
        isTeacher={session.role === 'teacher'}
        onJumpToPhase={handleJumpToPhase}
        onControlTimer={controlTimer}
      />

      {announcement && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm text-blue-950 font-medium">
            <Megaphone className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong className="text-blue-800">ประกาศจากครูผู้สอน:</strong> {announcement}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-7">
        {!workspace ? (
          <div className="bg-white border border-slate-300 rounded-2xl p-12 text-center text-sm text-slate-700 shadow-sm">
            กำลังเชื่อมต่อฐานข้อมูลและกระดานเรียนรู้ออนไลน์...
          </div>
        ) : (
          <motion.div
            key={`${view.type}-${view.type === 'scenario' ? view.scenarioId : ''}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {view.type === 'overview' ? (
              <OverviewPage
                workspace={workspace}
                session={session}
                onNavigate={setView}
                onOpenAuthModal={openAuthModal}
              />
            ) : view.type === 'scenario' && view.scenarioId === 'example' ? (
              <ExampleScenarioPage
                example={workspace.example}
                onUpdateCanvaLink={updateExampleCanva}
                onUpdateCanvas={updateExampleCanvas}
                onAddNote={addExampleNote}
                onVoteNote={voteExampleNote}
                onDeleteNote={deleteExampleNote}
                onGoToGlobalScenarios={() => {
                  const targetGroupId = session.groupId || 1;
                  const sc = getScenarioForGroup(targetGroupId);
                  setGroupSubTab('canvas');
                  setView({
                    type: 'scenario',
                    scenarioId: sc.id,
                    initialGroupId: targetGroupId,
                  });
                }}
              />
            ) : view.type === 'scenario' ? (
              <ScenarioDetailPage
                scenarioId={view.scenarioId}
                initialGroupId={view.initialGroupId}
                workspace={workspace}
                presence={presence}
                userGroupId={session.groupId}
                activeTab={groupSubTab}
                onChangeTab={setGroupSubTab}
                onSelectScenario={(scId, gId) =>
                  setView({ type: 'scenario', scenarioId: scId, initialGroupId: gId })
                }
                onUpdateMeta={updateGroupMeta}
                onAddIdeationNote={addGroupIdeationNote}
                onVoteIdeationNote={voteGroupIdeationNote}
                onDeleteIdeationNote={deleteGroupIdeationNote}
                onUpdateCanvas={updateGroupCanvas}
                onUpdateHumanAi={updateGroupHumanAi}
                onAddComment={addGroupComment}
                onDeleteComment={deleteGroupComment}
                onUpdateReflection={updateGroupReflection}
              />
            ) : view.type === 'timeline' ? (
              <TimelineScoreboardPage
                workspace={workspace}
                session={session}
                onOpenLoginModal={() => openAuthModal()}
              />
            ) : view.type === 'teacher' ? (
              <TeacherDashboardPage
                workspace={workspace}
                session={session}
                onTeacherLogin={loginTeacherWithGoogle}
                onOpenPublicScoreboard={() => setView({ type: 'timeline' })}
                onUpsertStudentScore={upsertStudentScore}
                onDeleteStudentScore={deleteStudentScore}
                onSeedDefaultRoster={seedDefaultRoster}
                onUpsertGroupScores={upsertGroupScores}
                onUpdateTeacherControls={updateTeacherControls}
                onControlTimer={controlTimer}
              />
            ) : view.type === 'matrix' ? (
              <ClassMatrixPage
                workspace={workspace}
                presence={presence}
                onOpenGroup={handleOpenGroup}
              />
            ) : (
              <VercelGuidePage workspace={workspace} onOpenGroup={handleOpenGroup} />
            )}
          </motion.div>
        )}
      </main>

      <footer className="border-t border-slate-300 bg-white mt-12">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>EcoLab Studio · แพลตฟอร์มการเรียนรู้การวิเคราะห์สถานการณ์ปัญหาสิ่งแวดล้อม</span>
          <span>1 สถานการณ์ตัวอย่าง · 5 สถานการณ์ระดับโลก · 10 กลุ่มผู้เรียน · ฐานข้อมูล Firestore</span>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        initialGroupId={preselectedGroupId}
        onClose={() => setAuthModalOpen(false)}
        session={session}
        onStudentLogin={handleStudentLoginAndEnterGroup}
        onTeacherLogin={loginTeacherWithGoogle}
        onLogout={logout}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
