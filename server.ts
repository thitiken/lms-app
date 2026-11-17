import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type {
  ActivityPhaseId,
  ActivityTimelineEvent,
  AppWorkspaceState,
  CanvasData,
  GroupWorkspace,
  HumanVsAiData,
  IdeationCategory,
  IdeationNote,
  PeerComment,
  PresenceUser,
  ReflectionData,
  ScenarioId,
  StudentScoreRecord,
  TeacherClassroomControl,
} from './src/types';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'workspace-state.json');

const PHASE_DURATIONS: Record<ActivityPhaseId, number> = {
  step1: 10 * 60,
  step2: 15 * 60,
  step3: 10 * 60,
  step4: 5 * 60,
  step5: 10 * 60,
  step6: 10 * 60,
};

const GROUP_SCENARIO_MAP: Record<number, Exclude<ScenarioId, 'example'>> = {
  1: 'nepal-landslide',
  2: 'nepal-landslide',
  3: 'europe-elnino',
  4: 'europe-elnino',
  5: 'north-chemical',
  6: 'north-chemical',
  7: 'invasive-species',
  8: 'invasive-species',
  9: 'urban-flood',
  10: 'urban-flood',
};

function createEmptyCanvas(): CanvasData {
  return {
    problemStatement: '',
    targetUser: '',
    applicationIdea: '',
    coreFeatures: '',
    expectedImpact: '',
  };
}

function createInitialGroup(groupId: number): GroupWorkspace {
  return {
    groupId,
    groupName: `กลุ่มที่ ${groupId}`,
    members: '',
    scenarioId: GROUP_SCENARIO_MAP[groupId] || 'nepal-landslide',
    ideationNotes: [],
    canvas: createEmptyCanvas(),
    promptV1: '',
    v1AppUrl: '',
    humanVsAi: {
      humanStrengths: '',
      aiStrengths: '',
      verificationNeeds: '',
      ethicsAndContext: '',
    },
    comments: [],
    promptV2: '',
    v2Improvements: '',
    v2AppUrl: '',
    vercelUrl: '',
    vercelPackageName: '',
    vercelUploadChecklist: [false, false, false, false],
    reflection: {
      keyLearning: '',
      teamworkInsight: '',
      nextImprovement: '',
    },
    updatedAt: Date.now(),
    lastEditor: '',
  };
}

function createInitialStudentScores(): Record<string, StudentScoreRecord> {
  const roster: Record<string, StudentScoreRecord> = {};
  // Pre-seed 30 student codes (6701 - 6730), 3 students per group across 10 groups
  for (let i = 1; i <= 30; i++) {
    const code = `67${String(i).padStart(2, '0')}`;
    const groupId = Math.ceil(i / 3);
    roster[code] = {
      studentCode: code,
      studentName: `นักเรียน ${code}`,
      groupId,
      active: true,
      joined: false,
      canvasScore: 0,
      promptV1Score: 0,
      peerReviewScore: 0,
      promptV2Score: 0,
      vercelScore: 0,
      bonusScore: 0,
      totalScore: 0,
      teacherNote: '',
      updatedAt: Date.now(),
    };
  }
  return roster;
}

function createInitialState(): AppWorkspaceState {
  const groups: Record<number, GroupWorkspace> = {};
  for (let i = 1; i <= 10; i++) {
    groups[i] = createInitialGroup(i);
  }

  return {
    example: {
      canvaLink: '',
      sandboxFeedbackNotes: [
        {
          id: 'seed-ex-1',
          author: 'ครูผู้สอน',
          category: 'problem',
          text: 'ขยะพลาสติกสะสมหน้าประตูระบายน้ำ 18.4 ตัน/สัปดาห์ เพราะชาวบ้านไม่รู้จุดทิ้งและเทศบาลไม่เห็นจุดอุดตันแบบเรียลไทม์',
          votes: 3,
          createdAt: Date.now() - 60000,
        },
        {
          id: 'seed-ex-2',
          author: 'ครูผู้สอน',
          category: 'feature',
          text: 'ปุ่มถ่ายภาพปักหมุดจุดขยะใน 15 วินาที พร้อมแผนที่ความหนาแน่นสำหรับเรือเก็บขยะ',
          votes: 4,
          createdAt: Date.now() - 45000,
        },
      ],
      canvas: {
        problemStatement:
          'ชุมชนริมคลองขาดระบบรายงานจุดสะสมขยะพลาสติกแบบเรียลไทม์ ทำให้ขยะค้างสะสมและเกิดไมโครพลาสติกปนเปื้อนในแหล่งน้ำดิบ',
        targetUser: 'ครัวเรือนริมคลอง อาสาสมัครสิ่งแวดล้อม และเจ้าหน้าที่จัดเก็บขยะของเทศบาล',
        applicationIdea: 'แอป "คลองใส" สำหรับปักหมุดจุดขยะอุดตันด้วยภาพถ่ายและจัดเส้นทางเรือเก็บขยะอัจฉริยะ',
        coreFeatures: '1) ถ่ายภาพปักหมุด GPS ใน 15 วินาที 2) แผนที่จุดเสี่ยงขยะสะสม 3) ติดตามสถานะการจัดเก็บและสถิติขยะที่ลดลง',
        expectedImpact: 'ลดปริมาณขยะตกค้างหน้าประตูระบายน้ำและกระตุ้นการคัดแยกพลาสติกต้นทางในชุมชน',
      },
      updatedAt: Date.now(),
      lastEditor: 'ระบบเตรียมบทเรียน',
    },
    groups,
    timer: {
      activePhase: 'step1',
      durationSeconds: PHASE_DURATIONS.step1,
      remainingSeconds: PHASE_DURATIONS.step1,
      isRunning: false,
      lastUpdatedAt: Date.now(),
    },
    studentScores: createInitialStudentScores(),
    timeline: [
      {
        id: 'seed-tl-1',
        studentCode: 'TEACHER',
        actorName: 'ระบบห้องเรียน EcoLab',
        groupId: 0,
        phaseId: 'step1',
        actionType: 'เปิดห้องเรียน',
        summary: 'เตรียมสถานการณ์ตัวอย่างและสถานการณ์ระดับโลก 5 เรื่อง พร้อมรหัสนักเรียน 6701–6730 สำหรับ 10 กลุ่มเรียบร้อยแล้ว',
        createdAt: Date.now() - 30000,
      },
    ],
    teacherControls: {
      controlId: 'classroom',
      announcement: 'ยินดีต้อนรับนักเรียน ม.ปลาย ทุกคน! เข้าสู่ระบบด้วยรหัสนักเรียนของคุณ แล้วเริ่มกิจกรรมที่ 1 ร่วมกันได้เลย',
      lockedPhases: [],
      allowStudentScoreView: true,
      updatedAt: Date.now(),
    },
  };
}

function loadState(): AppWorkspaceState {
  const base = createInitialState();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppWorkspaceState>;
      const mergedGroups: Record<number, GroupWorkspace> = {};
      for (let i = 1; i <= 10; i++) {
        mergedGroups[i] = { ...base.groups[i], ...(parsed.groups?.[i] || {}) };
      }
      const rawScores =
        parsed.studentScores && typeof parsed.studentScores === 'object'
          ? parsed.studentScores
          : base.studentScores;
      const normalizedScores: Record<string, StudentScoreRecord> = {};
      for (const [code, rec] of Object.entries(rawScores)) {
        const typed = rec as StudentScoreRecord;
        normalizedScores[code] = {
          ...typed,
          joined: typed.joined ?? !typed.studentName?.startsWith('นักเรียน 67'),
          bonusScore: Number(typed.bonusScore || 0),
        };
      }
      return {
        example: { ...base.example, ...(parsed.example || {}) },
        groups: mergedGroups,
        timer: { ...base.timer, ...(parsed.timer || {}), isRunning: false },
        studentScores: normalizedScores,
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline : base.timeline,
        teacherControls: { ...base.teacherControls, ...(parsed.teacherControls || {}) },
      };
    }
  } catch (err) {
    console.error('Failed to load workspace state, initializing fresh:', err);
  }
  return base;
}

let state: AppWorkspaceState = loadState();
let saveTimeout: NodeJS.Timeout | null = null;

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist workspace state:', err);
    }
  }, 250);
}

const presenceMap = new Map<WebSocket, PresenceUser>();
const lastTimelineByActorField = new Map<string, number>();

function getPresenceList(): PresenceUser[] {
  return Array.from(presenceMap.values());
}

function getEffectiveTimer() {
  if (!state.timer.isRunning) {
    return state.timer;
  }
  const elapsed = Math.floor((Date.now() - state.timer.lastUpdatedAt) / 1000);
  const remaining = Math.max(0, state.timer.remainingSeconds - elapsed);
  return {
    ...state.timer,
    remainingSeconds: remaining,
    isRunning: remaining > 0,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(payload: unknown) {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  function recordTimeline(event: Omit<ActivityTimelineEvent, 'id' | 'createdAt'>, throttleKey?: string) {
    if (throttleKey) {
      const prev = lastTimelineByActorField.get(throttleKey) || 0;
      if (Date.now() - prev < 15000) return;
      lastTimelineByActorField.set(throttleKey, Date.now());
    }
    const item: ActivityTimelineEvent = {
      ...event,
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    state.timeline = [item, ...state.timeline].slice(0, 150);
    scheduleSave();
    broadcast({ type: 'timeline:updated', timeline: state.timeline });
  }

  function isJoinedRecord(rec: StudentScoreRecord): boolean {
    if (rec.joined === true) return true;
    if (rec.joined === false) return false;
    return !rec.studentName.startsWith('นักเรียน 67');
  }

  function syncGroupMembersStrings(groupIds: Iterable<number>) {
    for (const gId of new Set(groupIds)) {
      const gObj = state.groups[gId];
      if (!gObj) continue;
      const joinedList = Object.values(state.studentScores)
        .filter((s) => s.groupId === gId && s.active && isJoinedRecord(s))
        .map((s) => `${s.studentName} (${s.studentCode})`);
      gObj.members = joinedList.join(', ');
      gObj.updatedAt = Date.now();
      broadcast({ type: 'group:updated', group: gObj });
    }
  }

  wss.on('connection', (ws) => {
    const clientId = `user-${Math.random().toString(36).slice(2, 9)}`;
    presenceMap.set(ws, {
      clientId,
      name: 'ผู้เยี่ยมชม',
      groupId: null,
      currentPage: 'overview',
    });

    ws.send(
      JSON.stringify({
        type: 'state:init',
        state: {
          ...state,
          timer: getEffectiveTimer(),
        },
        presence: getPresenceList(),
        clientId,
      })
    );

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        handleWsMessage(ws, msg);
      } catch (err) {
        console.error('Invalid WS message:', err);
      }
    });

    ws.on('close', () => {
      presenceMap.delete(ws);
      broadcast({ type: 'presence:update', presence: getPresenceList() });
    });
  });

  function handleWsMessage(ws: WebSocket, msg: any) {
    switch (msg.type) {
      case 'presence:join': {
        const existing = presenceMap.get(ws);
        if (existing) {
          presenceMap.set(ws, {
            ...existing,
            name: typeof msg.name === 'string' && msg.name.trim() ? msg.name.trim().slice(0, 40) : existing.name,
            groupId: typeof msg.groupId === 'number' ? msg.groupId : null,
            currentPage: typeof msg.currentPage === 'string' ? msg.currentPage : existing.currentPage,
          });
          broadcast({ type: 'presence:update', presence: getPresenceList() });
        }
        break;
      }

      case 'example:canva:update': {
        if (typeof msg.canvaLink === 'string') {
          state.example.canvaLink = msg.canvaLink.slice(0, 500);
          state.example.updatedAt = Date.now();
          state.example.lastEditor = msg.editor || 'สมาชิกชั้นเรียน';
          scheduleSave();
          broadcast({ type: 'example:updated', example: state.example });
        }
        break;
      }

      case 'example:canvas:update': {
        const field = msg.field as keyof CanvasData;
        if (field && field in state.example.canvas && typeof msg.value === 'string') {
          state.example.canvas[field] = msg.value.slice(0, 3000);
          state.example.updatedAt = Date.now();
          state.example.lastEditor = msg.editor || 'สมาชิกชั้นเรียน';
          scheduleSave();
          broadcast({ type: 'example:updated', example: state.example });
        }
        break;
      }

      case 'example:note:create': {
        const note = msg.note as IdeationNote;
        if (!note || !note.id || !note.text?.trim()) return;
        if (state.example.sandboxFeedbackNotes.some((n) => n.id === note.id)) return;
        const cleanNote: IdeationNote = {
          id: note.id,
          author: (note.author || 'ผู้เรียน').slice(0, 40),
          category: (note.category || 'idea') as IdeationCategory,
          text: note.text.trim().slice(0, 600),
          votes: 0,
          createdAt: Date.now(),
        };
        state.example.sandboxFeedbackNotes = [cleanNote, ...state.example.sandboxFeedbackNotes];
        state.example.updatedAt = Date.now();
        scheduleSave();
        broadcast({ type: 'example:updated', example: state.example });
        recordTimeline({
          studentCode: msg.studentCode || 'GUEST',
          actorName: cleanNote.author,
          groupId: Number(msg.groupId) || 0,
          phaseId: 'step1',
          actionType: 'เสนอแนะสถานการณ์ตัวอย่าง',
          summary: `ร่วมแสดงความเห็นในสถานการณ์ตัวอย่าง: "${cleanNote.text.slice(0, 70)}"`,
        });
        break;
      }

      case 'example:note:vote': {
        const note = state.example.sandboxFeedbackNotes.find((n) => n.id === msg.noteId);
        if (note) {
          note.votes += 1;
          scheduleSave();
          broadcast({ type: 'example:updated', example: state.example });
        }
        break;
      }

      case 'example:note:delete': {
        state.example.sandboxFeedbackNotes = state.example.sandboxFeedbackNotes.filter((n) => n.id !== msg.noteId);
        scheduleSave();
        broadcast({ type: 'example:updated', example: state.example });
        break;
      }

      case 'group:ideation:create': {
        const groupId = Number(msg.groupId);
        const group = state.groups[groupId];
        const note = msg.note as IdeationNote;
        if (!group || !note || !note.id || !note.text?.trim()) return;
        if (group.ideationNotes.some((n) => n.id === note.id)) return;
        const cleanNote: IdeationNote = {
          id: note.id,
          author: (note.author || 'สมาชิกกลุ่ม').slice(0, 40),
          category: (note.category || 'idea') as IdeationCategory,
          text: note.text.trim().slice(0, 600),
          votes: 0,
          createdAt: Date.now(),
        };
        group.ideationNotes = [cleanNote, ...group.ideationNotes];
        group.updatedAt = Date.now();
        group.lastEditor = cleanNote.author;
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        recordTimeline({
          studentCode: msg.studentCode || `G${groupId}`,
          actorName: cleanNote.author,
          groupId,
          phaseId: 'step2',
          actionType: 'ระดมไอเดีย Ideation',
          summary: `แปะไอเดียใหม่ใน${group.groupName}: "${cleanNote.text.slice(0, 70)}"`,
        });
        break;
      }

      case 'group:ideation:vote': {
        const group = state.groups[Number(msg.groupId)];
        if (!group) return;
        const note = group.ideationNotes.find((n) => n.id === msg.noteId);
        if (note) {
          note.votes += 1;
          group.updatedAt = Date.now();
          scheduleSave();
          broadcast({ type: 'group:updated', group });
        }
        break;
      }

      case 'group:ideation:delete': {
        const group = state.groups[Number(msg.groupId)];
        if (!group) return;
        group.ideationNotes = group.ideationNotes.filter((n) => n.id !== msg.noteId);
        group.updatedAt = Date.now();
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        break;
      }

      case 'group:canvas:update': {
        const group = state.groups[Number(msg.groupId)];
        const field = msg.field as keyof CanvasData;
        if (!group || !(field in group.canvas) || typeof msg.value !== 'string') return;
        group.canvas[field] = msg.value.slice(0, 3000);
        group.updatedAt = Date.now();
        group.lastEditor = (msg.editor || 'สมาชิกกลุ่ม').slice(0, 40);
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        if (msg.value.trim().length > 10) {
          recordTimeline(
            {
              studentCode: msg.studentCode || `G${group.groupId}`,
              actorName: group.lastEditor,
              groupId: group.groupId,
              phaseId: 'step2',
              actionType: 'อัปเดต Design Canvas',
              summary: `บันทึกข้อมูลช่อง ${field} ของ${group.groupName}`,
            },
            `canvas-${group.groupId}-${field}`
          );
        }
        break;
      }

      case 'group:humanai:update': {
        const group = state.groups[Number(msg.groupId)];
        const field = msg.field as keyof HumanVsAiData;
        if (!group || !(field in group.humanVsAi) || typeof msg.value !== 'string') return;
        group.humanVsAi[field] = msg.value.slice(0, 2000);
        group.updatedAt = Date.now();
        group.lastEditor = (msg.editor || 'สมาชิกกลุ่ม').slice(0, 40);
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        if (msg.value.trim().length > 10) {
          recordTimeline(
            {
              studentCode: msg.studentCode || `G${group.groupId}`,
              actorName: group.lastEditor,
              groupId: group.groupId,
              phaseId: 'step3',
              actionType: 'วิเคราะห์มนุษย์กับ AI',
              summary: `บันทึกมุมมองมนุษย์กับ AI (${field}) ของ${group.groupName}`,
            },
            `humanai-${group.groupId}`
          );
        }
        break;
      }

      case 'group:reflection:update': {
        const group = state.groups[Number(msg.groupId)];
        const field = msg.field as keyof ReflectionData;
        if (!group || !(field in group.reflection) || typeof msg.value !== 'string') return;
        group.reflection[field] = msg.value.slice(0, 2000);
        group.updatedAt = Date.now();
        group.lastEditor = (msg.editor || 'สมาชิกกลุ่ม').slice(0, 40);
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        if (msg.value.trim().length > 10) {
          recordTimeline(
            {
              studentCode: msg.studentCode || `G${group.groupId}`,
              actorName: group.lastEditor,
              groupId: group.groupId,
              phaseId: 'step6',
              actionType: 'บันทึกสะท้อนผล',
              summary: `เขียนบันทึกสะท้อนผลการเรียนรู้ของ${group.groupName}`,
            },
            `reflection-${group.groupId}`
          );
        }
        break;
      }

      case 'group:meta:update': {
        const group = state.groups[Number(msg.groupId)];
        if (!group) return;
        const allowedFields = [
          'groupName',
          'members',
          'promptV1',
          'v1AppUrl',
          'promptV2',
          'v2Improvements',
          'v2AppUrl',
          'vercelUrl',
          'vercelPackageName',
        ] as const;
        const field = msg.field as (typeof allowedFields)[number];
        if (allowedFields.includes(field) && typeof msg.value === 'string') {
          (group as any)[field] = msg.value.slice(0, 5000);
          group.updatedAt = Date.now();
          group.lastEditor = (msg.editor || 'สมาชิกกลุ่ม').slice(0, 40);
          scheduleSave();
          broadcast({ type: 'group:updated', group });

          if (field === 'promptV1' && msg.value.trim().length > 15) {
            recordTimeline(
              {
                studentCode: msg.studentCode || `G${group.groupId}`,
                actorName: group.lastEditor,
                groupId: group.groupId,
                phaseId: 'step3',
                actionType: 'ออกแบบ Prompt V.1',
                summary: `สร้างและบันทึก Prompt V.1 ของ${group.groupName}`,
              },
              `pv1-${group.groupId}`
            );
          } else if (field === 'promptV2' && msg.value.trim().length > 15) {
            recordTimeline(
              {
                studentCode: msg.studentCode || `G${group.groupId}`,
                actorName: group.lastEditor,
                groupId: group.groupId,
                phaseId: 'step5',
                actionType: 'ปรับปรุงเป็น Prompt V.2',
                summary: `อัปเดต Prompt V.2 ของ${group.groupName}`,
              },
              `pv2-${group.groupId}`
            );
          } else if (field === 'vercelUrl' && msg.value.trim().startsWith('http')) {
            recordTimeline(
              {
                studentCode: msg.studentCode || `G${group.groupId}`,
                actorName: group.lastEditor,
                groupId: group.groupId,
                phaseId: 'step6',
                actionType: 'นำเข้า Vercel สำเร็จ',
                summary: `ส่งลิงก์ Vercel ของ${group.groupName}: ${msg.value.trim()}`,
              },
              `vercel-${group.groupId}`
            );
          }
        } else if (msg.field === 'vercelUploadChecklist' && Array.isArray(msg.value)) {
          group.vercelUploadChecklist = msg.value.slice(0, 4).map(Boolean);
          group.updatedAt = Date.now();
          group.lastEditor = (msg.editor || 'สมาชิกกลุ่ม').slice(0, 40);
          scheduleSave();
          broadcast({ type: 'group:updated', group });
        }
        break;
      }

      case 'group:comment:create': {
        const group = state.groups[Number(msg.groupId)];
        const comment = msg.comment as PeerComment;
        if (!group || !comment || !comment.id) return;
        if (!comment.strengths?.trim() && !comment.improvements?.trim()) return;
        if (group.comments.some((c) => c.id === comment.id)) return;
        const cleanComment: PeerComment = {
          id: comment.id,
          fromGroupLabel: (comment.fromGroupLabel || 'เพื่อนร่วมชั้น').slice(0, 40),
          authorName: (comment.authorName || 'ผู้เรียน').slice(0, 40),
          strengths: (comment.strengths || '').trim().slice(0, 800),
          improvements: (comment.improvements || '').trim().slice(0, 800),
          createdAt: Date.now(),
        };
        group.comments = [cleanComment, ...group.comments];
        group.updatedAt = Date.now();
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        recordTimeline({
          studentCode: msg.studentCode || 'PEER',
          actorName: cleanComment.authorName,
          groupId: group.groupId,
          phaseId: 'step4',
          actionType: 'คอมเมนต์ V.1 ข้ามกลุ่ม',
          summary: `${cleanComment.fromGroupLabel} ร่วมคอมเมนต์ผลงาน V.1 ของ${group.groupName}`,
        });
        break;
      }

      case 'group:comment:delete': {
        const group = state.groups[Number(msg.groupId)];
        if (!group) return;
        group.comments = group.comments.filter((c) => c.id !== msg.commentId);
        group.updatedAt = Date.now();
        scheduleSave();
        broadcast({ type: 'group:updated', group });
        break;
      }

      case 'timer:control': {
        const current = getEffectiveTimer();
        if (msg.action === 'setPhase' && msg.phase in PHASE_DURATIONS) {
          const phase = msg.phase as ActivityPhaseId;
          state.timer = {
            activePhase: phase,
            durationSeconds: PHASE_DURATIONS[phase],
            remainingSeconds: PHASE_DURATIONS[phase],
            isRunning: false,
            lastUpdatedAt: Date.now(),
          };
        } else if (msg.action === 'startPhase' && msg.phase in PHASE_DURATIONS) {
          const phase = msg.phase as ActivityPhaseId;
          state.timer = {
            activePhase: phase,
            durationSeconds: PHASE_DURATIONS[phase],
            remainingSeconds: PHASE_DURATIONS[phase],
            isRunning: true,
            lastUpdatedAt: Date.now(),
          };
          const stepNum = Number(phase.replace('step', '')) || 1;
          recordTimeline(
            {
              studentCode: 'TEACHER',
              actorName: 'ครูผู้สอน',
              groupId: 0,
              phaseId: phase,
              actionType: `เริ่มภารกิจขั้นที่ ${stepNum}`,
              summary: `ครูผู้สอนกดเริ่มกิจกรรมขั้นที่ ${stepNum} บน Timeline ส่วนบนของห้องเรียน`,
            },
            `teacher-phase-${phase}`
          );
        } else if (msg.action === 'start') {
          state.timer = {
            ...current,
            remainingSeconds: current.remainingSeconds > 0 ? current.remainingSeconds : current.durationSeconds,
            isRunning: true,
            lastUpdatedAt: Date.now(),
          };
        } else if (msg.action === 'pause') {
          state.timer = {
            ...current,
            isRunning: false,
            lastUpdatedAt: Date.now(),
          };
        } else if (msg.action === 'reset') {
          state.timer = {
            ...current,
            remainingSeconds: current.durationSeconds,
            isRunning: false,
            lastUpdatedAt: Date.now(),
          };
        }
        scheduleSave();
        broadcast({ type: 'timer:updated', timer: getEffectiveTimer() });
        break;
      }

      case 'teacher:score:upsert': {
        const rec = msg.record as StudentScoreRecord;
        if (!rec || !rec.studentCode) return;
        const code = rec.studentCode.trim().replace(/\s+/g, '').toUpperCase().slice(0, 32);
        const existingRec = state.studentScores[code];
        const prevGroupId = existingRec?.groupId;
        const canvas = Math.min(20, Math.max(0, Number(rec.canvasScore) || 0));
        const pv1 = Math.min(20, Math.max(0, Number(rec.promptV1Score) || 0));
        const peer = Math.min(15, Math.max(0, Number(rec.peerReviewScore) || 0));
        const pv2 = Math.min(25, Math.max(0, Number(rec.promptV2Score) || 0));
        const vercel = Math.min(20, Math.max(0, Number(rec.vercelScore) || 0));
        const bonus = Math.min(20, Math.max(0, Number(rec.bonusScore) || 0));
        const total = canvas + pv1 + peer + pv2 + vercel + bonus;

        const isNewStudent = !existingRec;
        const nextName = (rec.studentName || `นักเรียน ${code}`).slice(0, 80);
        const updated: StudentScoreRecord = {
          studentCode: code,
          studentName: nextName,
          groupId: Math.min(10, Math.max(1, Number(rec.groupId) || 1)),
          active: Boolean(rec.active ?? true),
          joined: rec.joined ?? existingRec?.joined ?? (isNewStudent || !nextName.startsWith('นักเรียน 67')),
          canvasScore: canvas,
          promptV1Score: pv1,
          peerReviewScore: peer,
          promptV2Score: pv2,
          vercelScore: vercel,
          bonusScore: bonus,
          totalScore: Math.min(120, Math.max(0, total)),
          teacherNote: (rec.teacherNote || '').slice(0, 500),
          updatedAt: Date.now(),
        };
        state.studentScores[code] = updated;

        const affectedGroups = [updated.groupId];
        if (prevGroupId && prevGroupId !== updated.groupId) affectedGroups.push(prevGroupId);
        syncGroupMembersStrings(affectedGroups);

        scheduleSave();
        broadcast({ type: 'scores:updated', studentScores: state.studentScores });
        recordTimeline({
          studentCode: code,
          actorName: 'ครูผู้สอน',
          groupId: updated.groupId,
          phaseId: 'step6',
          actionType: isNewStudent
            ? 'เพิ่มนักเรียนเข้ากลุ่ม'
            : bonus > 0
            ? 'บันทึกคะแนน & พิเศษ'
            : 'บันทึกคะแนนรายบุคคล',
          summary: isNewStudent
            ? `ครูผู้สอนเพิ่ม ${updated.studentName} (รหัส ${code}) เข้ากลุ่มที่ ${updated.groupId}`
            : `ครูผู้สอนบันทึกคะแนนให้ ${updated.studentName} (${code}) รวม ${updated.totalScore} คะแนน${bonus > 0 ? ` (รวมพิเศษ +${bonus})` : ''}`,
        });
        break;
      }

      case 'teacher:score:delete': {
        const rawCode = String(msg.studentCode || '').trim().replace(/\s+/g, '').toUpperCase();
        if (!rawCode || !state.studentScores[rawCode]) return;
        const removed = state.studentScores[rawCode];
        delete state.studentScores[rawCode];

        syncGroupMembersStrings([removed.groupId]);

        scheduleSave();
        broadcast({ type: 'scores:updated', studentScores: state.studentScores });
        recordTimeline({
          studentCode: rawCode,
          actorName: 'ครูผู้สอน',
          groupId: removed.groupId,
          phaseId: 'step6',
          actionType: 'ลบรายชื่อนักเรียน',
          summary: `ครูผู้สอนลบ ${removed.studentName} (รหัส ${rawCode}) ออกจากกลุ่มที่ ${removed.groupId}`,
        });
        break;
      }

      case 'teacher:roster:seed-defaults': {
        const defaults = createInitialStudentScores();
        let added = 0;
        for (const [code, rec] of Object.entries(defaults)) {
          if (!state.studentScores[code]) {
            state.studentScores[code] = rec;
            added += 1;
          }
        }
        if (added > 0) {
          scheduleSave();
          broadcast({ type: 'scores:updated', studentScores: state.studentScores });
        }
        break;
      }

      case 'teacher:group:scores': {
        const groupId = Math.min(10, Math.max(1, Number(msg.groupId) || 1));
        const records = Array.isArray(msg.records) ? (msg.records as StudentScoreRecord[]) : [];
        if (records.length === 0) return;

        for (const rec of records) {
          if (!rec || !rec.studentCode) continue;
          const code = rec.studentCode.trim().toUpperCase().slice(0, 32);
          const canvas = Math.min(20, Math.max(0, Number(rec.canvasScore) || 0));
          const pv1 = Math.min(20, Math.max(0, Number(rec.promptV1Score) || 0));
          const peer = Math.min(15, Math.max(0, Number(rec.peerReviewScore) || 0));
          const pv2 = Math.min(25, Math.max(0, Number(rec.promptV2Score) || 0));
          const vercel = Math.min(20, Math.max(0, Number(rec.vercelScore) || 0));
          const bonus = Math.min(20, Math.max(0, Number(rec.bonusScore) || 0));
          const total = canvas + pv1 + peer + pv2 + vercel + bonus;

          state.studentScores[code] = {
            studentCode: code,
            studentName: (rec.studentName || `นักเรียน ${code}`).slice(0, 80),
            groupId: Math.min(10, Math.max(1, Number(rec.groupId) || groupId)),
            active: Boolean(rec.active ?? true),
            joined: rec.joined ?? state.studentScores[code]?.joined ?? false,
            canvasScore: canvas,
            promptV1Score: pv1,
            peerReviewScore: peer,
            promptV2Score: pv2,
            vercelScore: vercel,
            bonusScore: bonus,
            totalScore: Math.min(120, Math.max(0, total)),
            teacherNote: (rec.teacherNote || '').slice(0, 500),
            updatedAt: Date.now(),
          };
        }
        scheduleSave();
        broadcast({ type: 'scores:updated', studentScores: state.studentScores });
        recordTimeline({
          studentCode: `G${groupId}`,
          actorName: 'ครูผู้สอน',
          groupId,
          phaseId: 'step6',
          actionType: 'บันทึกคะแนนกลุ่ม',
          summary:
            typeof msg.summaryLabel === 'string' && msg.summaryLabel.trim()
              ? msg.summaryLabel.trim().slice(0, 200)
              : `ครูผู้สอนบันทึกคะแนนทั้งกลุ่มที่ ${groupId} (${records.length} คน)`,
        });
        break;
      }

      case 'teacher:controls:update': {
        const ctrl = msg.controls as Partial<TeacherClassroomControl>;
        if (!ctrl) return;
        state.teacherControls = {
          controlId: 'classroom',
          announcement:
            typeof ctrl.announcement === 'string'
              ? ctrl.announcement.slice(0, 500)
              : state.teacherControls.announcement,
          lockedPhases: Array.isArray(ctrl.lockedPhases)
            ? (ctrl.lockedPhases.slice(0, 6) as ActivityPhaseId[])
            : state.teacherControls.lockedPhases,
          allowStudentScoreView:
            typeof ctrl.allowStudentScoreView === 'boolean'
              ? ctrl.allowStudentScoreView
              : state.teacherControls.allowStudentScoreView,
          updatedAt: Date.now(),
        };
        scheduleSave();
        broadcast({ type: 'controls:updated', teacherControls: state.teacherControls });
        break;
      }
    }
  }

  // Student Group + Name + Code Login Endpoint
  app.post('/api/auth/student-login', (req, res) => {
    const rawCode = String(req.body?.studentCode || '').trim().replace(/\s+/g, '').toUpperCase();
    const customName = String(req.body?.displayName || '').trim().slice(0, 80);
    const requestedGroup = Number(req.body?.groupId);

    if (!rawCode) {
      return res.status(400).json({ error: 'กรุณากรอกรหัสนักเรียน' });
    }
    if (!/^[A-Z0-9_-]{1,32}$/.test(rawCode)) {
      return res.status(400).json({
        error: 'รหัสนักเรียนต้องเป็นตัวเลขหรือตัวอักษรภาษาอังกฤษ 1–32 ตัว (เช่น 15, 6701 หรือ S101)',
      });
    }
    if (!customName) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อ-สกุล หรือชื่อเล่นของคุณ' });
    }

    const existing = state.studentScores[rawCode];
    if (existing && !existing.active) {
      return res.status(403).json({ error: 'รหัสนักเรียนนี้ถูกระงับการใช้งานชั่วคราวโดยครูผู้สอน' });
    }

    const prevGroupId = existing?.groupId;
    const finalGroupId =
      Number.isInteger(requestedGroup) && requestedGroup >= 1 && requestedGroup <= 10
        ? requestedGroup
        : existing?.groupId || 1;

    const record: StudentScoreRecord = existing
      ? {
          ...existing,
          studentName: customName,
          groupId: finalGroupId,
          joined: true,
          bonusScore: Number(existing.bonusScore || 0),
          updatedAt: Date.now(),
        }
      : {
          studentCode: rawCode,
          studentName: customName,
          groupId: finalGroupId,
          active: true,
          joined: true,
          canvasScore: 0,
          promptV1Score: 0,
          peerReviewScore: 0,
          promptV2Score: 0,
          vercelScore: 0,
          bonusScore: 0,
          totalScore: 0,
          teacherNote: '',
          updatedAt: Date.now(),
        };

    state.studentScores[rawCode] = record;

    // Sync group members display string for both previous group (if moved) and current group
    const affectedGroups = prevGroupId && prevGroupId !== finalGroupId ? [prevGroupId, finalGroupId] : [finalGroupId];
    syncGroupMembersStrings(affectedGroups);

    scheduleSave();
    broadcast({ type: 'scores:updated', studentScores: state.studentScores });

    recordTimeline({
      studentCode: record.studentCode,
      actorName: record.studentName,
      groupId: record.groupId,
      phaseId: state.timer.activePhase,
      actionType: 'เข้ากลุ่มเรียน',
      summary: `${record.studentName} (รหัส ${record.studentCode}) เข้าร่วมกลุ่มที่ ${record.groupId}`,
    });

    return res.json({
      ok: true,
      session: {
        role: 'student',
        studentCode: record.studentCode,
        displayName: record.studentName,
        groupId: record.groupId,
        email: null,
        uid: null,
      },
      record,
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, onlineUsers: presenceMap.size });
  });

  app.get('/api/state', (_req, res) => {
    res.json({
      ...state,
      timer: getEffectiveTimer(),
      presence: getPresenceList(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoLab Studio server listening on http://localhost:${PORT}`);
  });
}

startServer();
