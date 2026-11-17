export type ScenarioId =
  | 'example'
  | 'nepal-landslide'
  | 'europe-elnino'
  | 'north-chemical'
  | 'invasive-species'
  | 'urban-flood';

export type ActivityPhaseId = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6';

export type IdeationCategory = 'problem' | 'user' | 'idea' | 'feature' | 'impact';

export interface CanvasData {
  problemStatement: string;
  targetUser: string;
  applicationIdea: string;
  coreFeatures: string;
  expectedImpact: string;
}

export interface IdeationNote {
  id: string;
  author: string;
  category: IdeationCategory;
  text: string;
  votes: number;
  createdAt: number;
}

export interface HumanVsAiData {
  humanStrengths: string;
  aiStrengths: string;
  verificationNeeds: string;
  ethicsAndContext: string;
}

export interface PeerComment {
  id: string;
  fromGroupLabel: string;
  authorName: string;
  strengths: string;
  improvements: string;
  createdAt: number;
}

export interface ReflectionData {
  keyLearning: string;
  teamworkInsight: string;
  nextImprovement: string;
}

export interface GroupWorkspace {
  groupId: number;
  groupName: string;
  members: string;
  scenarioId: Exclude<ScenarioId, 'example'>;
  ideationNotes: IdeationNote[];
  canvas: CanvasData;
  promptV1: string;
  v1AppUrl: string;
  humanVsAi: HumanVsAiData;
  comments: PeerComment[];
  promptV2: string;
  v2Improvements: string;
  v2AppUrl: string;
  vercelUrl: string;
  vercelPackageName: string;
  vercelUploadChecklist: boolean[];
  reflection: ReflectionData;
  updatedAt: number;
  lastEditor: string;
}

export interface ExampleWorkspace {
  canvaLink: string;
  sandboxFeedbackNotes: IdeationNote[];
  canvas: CanvasData;
  updatedAt: number;
  lastEditor: string;
}

export interface TimerState {
  activePhase: ActivityPhaseId;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  lastUpdatedAt: number;
}

export interface PresenceUser {
  clientId: string;
  name: string;
  groupId: number | null;
  currentPage: string;
}

export interface StudentScoreRecord {
  studentCode: string;
  studentName: string;
  groupId: number;
  linkedUid?: string;
  active: boolean;
  joined?: boolean;
  canvasScore: number;      // max 20
  promptV1Score: number;    // max 20
  peerReviewScore: number;  // max 15
  promptV2Score: number;    // max 25
  vercelScore: number;      // max 20
  bonusScore: number;       // max 20 (special bonus score by teacher)
  totalScore: number;       // max 120 (100 core + up to 20 bonus)
  teacherNote: string;
  updatedAt: number;
}

export interface ActivityTimelineEvent {
  id: string;
  actorUid?: string;
  studentCode: string;
  actorName: string;
  groupId: number;
  phaseId: ActivityPhaseId;
  actionType: string;
  summary: string;
  createdAt: number;
}

export interface TeacherClassroomControl {
  controlId: string;
  announcement: string;
  lockedPhases: ActivityPhaseId[];
  allowStudentScoreView: boolean;
  updatedAt: number;
}

export interface AuthSession {
  role: 'guest' | 'student' | 'teacher';
  studentCode: string | null;
  displayName: string;
  groupId: number | null;
  email: string | null;
  uid: string | null;
}

export interface AppWorkspaceState {
  example: ExampleWorkspace;
  groups: Record<number, GroupWorkspace>;
  timer: TimerState;
  studentScores: Record<string, StudentScoreRecord>;
  timeline: ActivityTimelineEvent[];
  teacherControls: TeacherClassroomControl;
}

export interface ScenarioMetric {
  label: string;
  value: string;
  detail: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  pageNumber: string;
  isExample: boolean;
  title: string;
  shortTitle: string;
  region: string;
  severityLabel: string;
  imageUrl: string;
  summary: string;
  contextData: string[];
  metrics: ScenarioMetric[];
  ideationFindings: {
    title: string;
    insight: string;
  }[];
  assignedGroups: number[];
  guidingQuestions: string[];
}

export interface ActivityPhaseDefinition {
  id: ActivityPhaseId;
  stepNumber: number;
  title: string;
  shortTitle: string;
  durationMinutes: number;
  description: string;
  targetScope: string;
}
