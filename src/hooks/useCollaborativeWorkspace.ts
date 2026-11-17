import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  OperationType,
  TEACHER_ADMIN_EMAIL,
  auth,
  db,
  handleFirestoreError,
  signInWithGooglePopup,
  signOutFirebase,
} from '../firebase';
import { isJoinedStudent } from '../data/scenarios';
import type {
  ActivityPhaseId,
  AppWorkspaceState,
  AuthSession,
  CanvasData,
  GroupWorkspace,
  HumanVsAiData,
  IdeationCategory,
  PresenceUser,
  ReflectionData,
  StudentScoreRecord,
  TeacherClassroomControl,
} from '../types';

const SESSION_STORAGE_KEY = 'ecolab_auth_session_v2';

interface RosterSnapshotEntry {
  studentCode: string;
  studentName: string;
  groupId: number;
  active: boolean;
  joinedAtMs: number;
}

function toMillisSafe(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return Date.now();
}

function loadSavedSession(): AuthSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed && parsed.role) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return {
    role: 'guest',
    studentCode: null,
    displayName: 'ผู้เยี่ยมชม',
    groupId: null,
    email: null,
    uid: null,
  };
}

export function useCollaborativeWorkspace(currentPage: string) {
  const [workspace, setWorkspace] = useState<AppWorkspaceState | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [session, setSessionState] = useState<AuthSession>(loadSavedSession);
  const [displayRemainingSeconds, setDisplayRemainingSeconds] = useState<number>(600);
  const [firebaseReady, setFirebaseReady] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<string[]>([]);
  const reconnectTimerRef = useRef<number | null>(null);

  // Separate source refs so Firestore classRoster, Firestore studentScores, and WS state merge deterministically
  const serverScoresRef = useRef<Record<string, StudentScoreRecord>>({});
  const rosterRef = useRef<Record<string, RosterSnapshotEntry>>({});
  const teacherScoresRef = useRef<Record<string, StudentScoreRecord>>({});
  const deletedCodesRef = useRef<Set<string>>(new Set());
  const selfHealKeyRef = useRef<string>('');

  const applyMergedToWorkspace = useCallback(
    (prev: AppWorkspaceState | null): AppWorkspaceState | null => {
      if (!prev) return prev;

      const merged: Record<string, StudentScoreRecord> = {};

      for (const [code, rec] of Object.entries(serverScoresRef.current)) {
        if (deletedCodesRef.current.has(code)) continue;
        merged[code] = { ...rec };
      }

      for (const [code, rec] of Object.entries(teacherScoresRef.current)) {
        if (deletedCodesRef.current.has(code)) continue;
        const existing = merged[code];
        merged[code] = {
          ...rec,
          joined: rec.joined ?? existing?.joined ?? !rec.studentName.startsWith('นักเรียน 67'),
        };
      }

      for (const [code, entry] of Object.entries(rosterRef.current)) {
        if (deletedCodesRef.current.has(code)) continue;
        const existing = merged[code];
        if (!existing) {
          merged[code] = {
            studentCode: entry.studentCode,
            studentName: entry.studentName,
            groupId: entry.groupId,
            active: entry.active,
            joined: true,
            canvasScore: 0,
            promptV1Score: 0,
            peerReviewScore: 0,
            promptV2Score: 0,
            vercelScore: 0,
            bonusScore: 0,
            totalScore: 0,
            teacherNote: '',
            updatedAt: entry.joinedAtMs,
          };
        } else {
          const existingIsPlaceholder =
            !isJoinedStudent(existing) || existing.studentName.startsWith('นักเรียน 67');
          const rosterIsNewer = entry.joinedAtMs >= (existing.updatedAt || 0);
          merged[code] = {
            ...existing,
            joined: true,
            studentName:
              existingIsPlaceholder || rosterIsNewer
                ? entry.studentName
                : existing.studentName,
            groupId:
              existingIsPlaceholder || rosterIsNewer ? entry.groupId : existing.groupId,
            active: rosterIsNewer ? entry.active : existing.active,
            updatedAt: Math.max(existing.updatedAt || 0, entry.joinedAtMs),
          };
        }
      }

      // Keep group members display synced with active joined students
      const nextGroups: Record<number, GroupWorkspace> = { ...prev.groups };
      const membersByGroup: Record<number, string[]> = {};
      for (let g = 1; g <= 10; g++) membersByGroup[g] = [];
      for (const rec of Object.values(merged)) {
        if (rec.active && isJoinedStudent(rec) && rec.groupId >= 1 && rec.groupId <= 10) {
          membersByGroup[rec.groupId].push(`${rec.studentName} (${rec.studentCode})`);
        }
      }
      for (let g = 1; g <= 10; g++) {
        if (nextGroups[g]) {
          const syncedStr = membersByGroup[g].join(', ');
          if (syncedStr && syncedStr !== nextGroups[g].members) {
            nextGroups[g] = {
              ...nextGroups[g],
              members: syncedStr,
            };
          }
        }
      }

      return {
        ...prev,
        studentScores: merged,
        groups: nextGroups,
      };
    },
    []
  );

  const saveSession = useCallback((next: AuthSession) => {
    setSessionState(next);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const sendRaw = useCallback((payload: unknown) => {
    const encoded = JSON.stringify(payload);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(encoded);
    } else {
      queueRef.current.push(encoded);
    }
  }, []);

  // Listen to Firebase Auth state (for Teacher Admin)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseReady(true);
      if (user && user.emailVerified) {
        const isTeacher = user.email?.toLowerCase() === TEACHER_ADMIN_EMAIL.toLowerCase();
        if (isTeacher) {
          saveSession({
            role: 'teacher',
            studentCode: 'TEACHER',
            displayName: user.displayName || 'ครูผู้สอน',
            groupId: null,
            email: user.email,
            uid: user.uid,
          });
          // Ensure admin registry document exists for Firestore rule checks
          try {
            await setDoc(
              doc(db, 'admins', user.uid),
              {
                uid: user.uid,
                email: user.email || TEACHER_ADMIN_EMAIL,
                displayName: user.displayName || 'ครูผู้สอน',
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // already exists or handled
          }
        }
      }
    });
    return () => unsub();
  }, [saveSession]);

  // Subscribe to shared Firestore classRoster across all instances (dev & shared preview)
  useEffect(() => {
    if (!firebaseReady) return;

    const isTeacherAuthed = session.role === 'teacher' && Boolean(auth.currentUser);
    const rosterQuery = isTeacherAuthed
      ? collection(db, 'classRoster')
      : query(
          collection(db, 'classRoster'),
          where('active', '==', true),
          where('groupId', '>=', 1),
          where('groupId', '<=', 10)
        );

    const unsubRoster = onSnapshot(
      rosterQuery,
      (snapshot) => {
        const nextRoster: Record<string, RosterSnapshotEntry> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const code = String(data.studentCode || docSnap.id).trim().toUpperCase();
          nextRoster[code] = {
            studentCode: code,
            studentName: String(data.studentName || `นักเรียน ${code}`),
            groupId: Math.min(10, Math.max(1, Number(data.groupId) || 1)),
            active: Boolean(data.active ?? true),
            joinedAtMs: toMillisSafe(data.joinedAt),
          };
        });
        rosterRef.current = nextRoster;
        setWorkspace((prev) => applyMergedToWorkspace(prev));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'classRoster');
      }
    );

    return () => unsubRoster();
  }, [firebaseReady, session.role, applyMergedToWorkspace]);

  // When Teacher is logged in to Firebase, subscribe directly to Firestore studentScores & teacherControls
  useEffect(() => {
    if (!firebaseReady || session.role !== 'teacher' || !auth.currentUser) {
      teacherScoresRef.current = {};
      return;
    }

    const unsubScores = onSnapshot(
      collection(db, 'studentScores'),
      (snapshot) => {
        const nextScores: Record<string, StudentScoreRecord> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const studentName = String(data.studentName || '');
          nextScores[docSnap.id] = {
            studentCode: String(data.studentCode || docSnap.id),
            studentName,
            groupId: Number(data.groupId || 1),
            linkedUid: typeof data.linkedUid === 'string' ? data.linkedUid : undefined,
            active: Boolean(data.active),
            joined: !studentName.startsWith('นักเรียน 67'),
            canvasScore: Number(data.canvasScore || 0),
            promptV1Score: Number(data.promptV1Score || 0),
            peerReviewScore: Number(data.peerReviewScore || 0),
            promptV2Score: Number(data.promptV2Score || 0),
            vercelScore: Number(data.vercelScore || 0),
            bonusScore: Number(data.bonusScore || 0),
            totalScore: Number(data.totalScore || 0),
            teacherNote: String(data.teacherNote || ''),
            updatedAt: toMillisSafe(data.updatedAt),
          };
        });
        teacherScoresRef.current = nextScores;
        setWorkspace((prev) => applyMergedToWorkspace(prev));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'studentScores');
      }
    );

    const unsubControl = onSnapshot(
      doc(db, 'teacherControls', 'classroom'),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data() as Record<string, unknown>;
        setWorkspace((prev) =>
          prev
            ? {
                ...prev,
                teacherControls: {
                  controlId: 'classroom',
                  announcement: String(data.announcement || ''),
                  lockedPhases: Array.isArray(data.lockedPhases)
                    ? (data.lockedPhases as ActivityPhaseId[])
                    : [],
                  allowStudentScoreView: Boolean(data.allowStudentScoreView),
                  updatedAt: Date.now(),
                },
              }
            : prev
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'teacherControls/classroom');
      }
    );

    return () => {
      unsubScores();
      unsubControl();
    };
  }, [firebaseReady, session.role, applyMergedToWorkspace]);

  // Self-heal: if a student already has a saved session in localStorage, ensure they appear in Firestore classRoster and current server
  useEffect(() => {
    if (!firebaseReady || !workspace) return;
    if (session.role !== 'student' || !session.studentCode || !session.groupId) return;

    const cleanCode = session.studentCode.trim().replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9_-]{1,32}$/.test(cleanCode) || !session.displayName.trim()) return;
    if (workspace.studentScores?.[cleanCode]?.active === false) return;

    const key = `${cleanCode}:${session.displayName}:${session.groupId}`;
    if (selfHealKeyRef.current === key) return;
    selfHealKeyRef.current = key;

    const syncExistingSession = async () => {
      if (!serverScoresRef.current[cleanCode]) {
        try {
          const res = await fetch('/api/auth/student-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentCode: cleanCode,
              displayName: session.displayName.trim(),
              groupId: session.groupId,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.record) {
              serverScoresRef.current[cleanCode] = { ...data.record, joined: true };
              setWorkspace((prev) => applyMergedToWorkspace(prev));
            }
          }
        } catch {
          // ignore transient fetch errors
        }
      }

      if (!rosterRef.current[cleanCode]) {
        try {
          await setDoc(doc(db, 'classRoster', cleanCode), {
            studentCode: cleanCode,
            studentName: session.displayName.trim().slice(0, 80),
            groupId: Math.min(10, Math.max(1, session.groupId || 1)),
            active: true,
            joinedAt: serverTimestamp(),
          });
        } catch {
          // ignore if suspended or already handled
        }
      }
    };

    syncExistingSession();
  }, [firebaseReady, workspace, session.role, session.studentCode, session.displayName, session.groupId, applyMergedToWorkspace]);

  // Initial HTTP fetch fallback
  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          serverScoresRef.current = data.studentScores || {};
          setWorkspace((prev) => prev || applyMergedToWorkspace(data));
          if (Array.isArray(data.presence)) {
            setPresence(data.presence);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [applyMergedToWorkspace]);

  // WebSocket connection + auto-reconnect
  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        const saved = loadSavedSession();
        ws.send(
          JSON.stringify({
            type: 'presence:join',
            name: saved.displayName,
            groupId: saved.groupId,
            currentPage,
          })
        );
        while (queueRef.current.length > 0) {
          const item = queueRef.current.shift();
          if (item) ws.send(item);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state:init') {
            serverScoresRef.current = msg.state?.studentScores || {};
            setWorkspace(applyMergedToWorkspace(msg.state));
            setPresence(msg.presence || []);
            if (msg.clientId) setClientId(msg.clientId);
          } else if (msg.type === 'presence:update') {
            setPresence(msg.presence || []);
          } else if (msg.type === 'example:updated') {
            setWorkspace((prev) => (prev ? { ...prev, example: msg.example } : prev));
          } else if (msg.type === 'group:updated') {
            const updatedGroup = msg.group as GroupWorkspace;
            setWorkspace((prev) =>
              prev
                ? applyMergedToWorkspace({
                    ...prev,
                    groups: {
                      ...prev.groups,
                      [updatedGroup.groupId]: updatedGroup,
                    },
                  })
                : prev
            );
          } else if (msg.type === 'timer:updated') {
            setWorkspace((prev) => (prev ? { ...prev, timer: msg.timer } : prev));
          } else if (msg.type === 'scores:updated') {
            serverScoresRef.current = msg.studentScores || {};
            setWorkspace((prev) => applyMergedToWorkspace(prev));
          } else if (msg.type === 'timeline:updated') {
            setWorkspace((prev) => (prev ? { ...prev, timeline: msg.timeline } : prev));
          } else if (msg.type === 'controls:updated') {
            setWorkspace((prev) => (prev ? { ...prev, teacherControls: msg.teacherControls } : prev));
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!disposed) {
          reconnectTimerRef.current = window.setTimeout(connect, 1800);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [applyMergedToWorkspace]);

  // Broadcast page or session changes
  useEffect(() => {
    if (connected) {
      sendRaw({
        type: 'presence:join',
        name: session.displayName,
        groupId: session.groupId,
        currentPage,
      });
    }
  }, [connected, session.displayName, session.groupId, currentPage, sendRaw]);

  // Live countdown tick
  useEffect(() => {
    if (!workspace?.timer) return;
    const syncTimer = () => {
      const t = workspace.timer;
      if (!t.isRunning) {
        setDisplayRemainingSeconds(t.remainingSeconds);
        return;
      }
      const elapsed = Math.floor((Date.now() - t.lastUpdatedAt) / 1000);
      setDisplayRemainingSeconds(Math.max(0, t.remainingSeconds - elapsed));
    };
    syncTimer();
    const id = window.setInterval(syncTimer, 1000);
    return () => clearInterval(id);
  }, [workspace?.timer]);

  // Student Group + Name + Code Login (persists to both Server + shared Firestore classRoster)
  const loginStudentByCode = useCallback(
    async (studentCode: string, displayName: string, groupId: number) => {
      const normalizedCode = studentCode.trim().replace(/\s+/g, '').toUpperCase();
      const cleanName = displayName.trim().slice(0, 80);

      if (workspace?.studentScores?.[normalizedCode]?.active === false) {
        throw new Error('รหัสนักเรียนนี้ถูกระงับการใช้งานชั่วคราวโดยครูผู้สอน');
      }

      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: normalizedCode,
          displayName: cleanName,
          groupId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถเข้าสู่ระบบด้วยรหัสนี้ได้');
      }

      const nextSession: AuthSession = data.session;
      const joinedRecord: StudentScoreRecord = {
        ...data.record,
        joined: true,
      };

      deletedCodesRef.current.delete(joinedRecord.studentCode);
      serverScoresRef.current[joinedRecord.studentCode] = joinedRecord;
      rosterRef.current[joinedRecord.studentCode] = {
        studentCode: joinedRecord.studentCode,
        studentName: joinedRecord.studentName,
        groupId: joinedRecord.groupId,
        active: true,
        joinedAtMs: Date.now(),
      };
      selfHealKeyRef.current = `${joinedRecord.studentCode}:${joinedRecord.studentName}:${joinedRecord.groupId}`;

      setWorkspace((prev) => applyMergedToWorkspace(prev));
      saveSession(nextSession);

      // Sync to shared Firestore classRoster so Teacher Dashboard & all sessions see the student immediately
      const rosterPath = `classRoster/${joinedRecord.studentCode}`;
      try {
        await setDoc(doc(db, 'classRoster', joinedRecord.studentCode), {
          studentCode: joinedRecord.studentCode,
          studentName: joinedRecord.studentName,
          groupId: joinedRecord.groupId,
          active: true,
          joinedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, rosterPath);
      }

      sendRaw({
        type: 'presence:join',
        name: nextSession.displayName,
        groupId: nextSession.groupId,
        currentPage,
      });
      return nextSession;
    },
    [applyMergedToWorkspace, currentPage, saveSession, sendRaw, workspace?.studentScores]
  );

  // Teacher Google Login
  const loginTeacherWithGoogle = useCallback(async () => {
    const result = await signInWithGooglePopup();
    const user = result.user;
    if (!user.emailVerified || user.email?.toLowerCase() !== TEACHER_ADMIN_EMAIL.toLowerCase()) {
      await signOutFirebase();
      throw new Error(
        `บัญชี ${user.email || ''} ไม่มีสิทธิ์เข้าถึงแผงควบคุมครูผู้สอน (เฉพาะครูผู้สอนที่ลงทะเบียนไว้เท่านั้น)`
      );
    }
    const nextSession: AuthSession = {
      role: 'teacher',
      studentCode: 'TEACHER',
      displayName: user.displayName || 'ครูผู้สอน',
      groupId: null,
      email: user.email,
      uid: user.uid,
    };
    saveSession(nextSession);
    return nextSession;
  }, [saveSession]);

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOutFirebase();
      }
    } catch {
      // ignore
    }
    saveSession({
      role: 'guest',
      studentCode: null,
      displayName: 'ผู้เยี่ยมชม',
      groupId: null,
      email: null,
      uid: null,
    });
  }, [saveSession]);

  const quickSwitchGroup = useCallback(
    (groupId: number) => {
      saveSession({
        ...session,
        groupId,
      });
    },
    [saveSession, session]
  );

  // Teacher Actions (Write to Firestore + sync live to classroom server)
  const upsertStudentScore = useCallback(
    async (record: StudentScoreRecord) => {
      if (session.role !== 'teacher') {
        throw new Error('จำกัดสิทธิ์เฉพาะครูผู้สอนเท่านั้น');
      }
      const code = record.studentCode.trim().replace(/\s+/g, '').toUpperCase().slice(0, 32);
      const canvas = Math.min(20, Math.max(0, Number(record.canvasScore) || 0));
      const pv1 = Math.min(20, Math.max(0, Number(record.promptV1Score) || 0));
      const peer = Math.min(15, Math.max(0, Number(record.peerReviewScore) || 0));
      const pv2 = Math.min(25, Math.max(0, Number(record.promptV2Score) || 0));
      const vercel = Math.min(20, Math.max(0, Number(record.vercelScore) || 0));
      const bonus = Math.min(20, Math.max(0, Number(record.bonusScore) || 0));
      const total = canvas + pv1 + peer + pv2 + vercel + bonus;
      const cleanName = record.studentName.trim().slice(0, 80) || `นักเรียน ${code}`;
      const isJoined =
        record.joined ?? (!cleanName.startsWith('นักเรียน 67') || Boolean(rosterRef.current[code]));

      const normalized: StudentScoreRecord = {
        ...record,
        studentCode: code,
        studentName: cleanName,
        groupId: Math.min(10, Math.max(1, Number(record.groupId) || 1)),
        joined: isJoined,
        canvasScore: canvas,
        promptV1Score: pv1,
        peerReviewScore: peer,
        promptV2Score: pv2,
        vercelScore: vercel,
        bonusScore: bonus,
        totalScore: Math.min(120, Math.max(0, total)),
        updatedAt: Date.now(),
      };

      deletedCodesRef.current.delete(code);
      serverScoresRef.current[code] = normalized;
      if (auth.currentUser) {
        teacherScoresRef.current[code] = normalized;
      }
      if (isJoined) {
        rosterRef.current[code] = {
          studentCode: code,
          studentName: normalized.studentName,
          groupId: normalized.groupId,
          active: normalized.active,
          joinedAtMs: normalized.updatedAt,
        };
      }

      setWorkspace((prev) => applyMergedToWorkspace(prev));

      // Update live WebSocket server
      sendRaw({ type: 'teacher:score:upsert', record: normalized });

      // Persist directly to Firestore if Teacher Firebase Auth is active
      if (auth.currentUser) {
        const path = `studentScores/${code}`;
        try {
          await setDoc(doc(db, 'studentScores', code), {
            studentCode: code,
            studentName: normalized.studentName,
            groupId: normalized.groupId,
            active: normalized.active,
            canvasScore: normalized.canvasScore,
            promptV1Score: normalized.promptV1Score,
            peerReviewScore: normalized.peerReviewScore,
            promptV2Score: normalized.promptV2Score,
            vercelScore: normalized.vercelScore,
            bonusScore: normalized.bonusScore,
            totalScore: normalized.totalScore,
            teacherNote: normalized.teacherNote || '',
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }

        if (isJoined) {
          const rosterPath = `classRoster/${code}`;
          try {
            await setDoc(doc(db, 'classRoster', code), {
              studentCode: code,
              studentName: normalized.studentName,
              groupId: normalized.groupId,
              active: normalized.active,
              joinedAt: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, rosterPath);
          }
        }
      }
    },
    [applyMergedToWorkspace, sendRaw, session.role]
  );

  const deleteStudentScore = useCallback(
    async (studentCode: string) => {
      if (session.role !== 'teacher') {
        throw new Error('จำกัดสิทธิ์เฉพาะครูผู้สอนเท่านั้น');
      }
      const code = studentCode.trim().replace(/\s+/g, '').toUpperCase();
      if (!code) return;

      deletedCodesRef.current.add(code);
      delete serverScoresRef.current[code];
      delete teacherScoresRef.current[code];
      delete rosterRef.current[code];

      setWorkspace((prev) => applyMergedToWorkspace(prev));

      sendRaw({ type: 'teacher:score:delete', studentCode: code });

      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'studentScores', code));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `studentScores/${code}`);
        }
        try {
          await deleteDoc(doc(db, 'classRoster', code));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `classRoster/${code}`);
        }
      }
    },
    [applyMergedToWorkspace, sendRaw, session.role]
  );

  const seedDefaultRoster = useCallback(() => {
    if (session.role !== 'teacher') return;
    deletedCodesRef.current.clear();
    sendRaw({ type: 'teacher:roster:seed-defaults' });
  }, [sendRaw, session.role]);

  const upsertGroupScores = useCallback(
    async (groupId: number, records: StudentScoreRecord[], summaryLabel?: string) => {
      if (session.role !== 'teacher') {
        throw new Error('จำกัดสิทธิ์เฉพาะครูผู้สอนเท่านั้น');
      }
      const normalizedList: StudentScoreRecord[] = records.map((record) => {
        const code = record.studentCode.trim().replace(/\s+/g, '').toUpperCase();
        const canvas = Math.min(20, Math.max(0, Number(record.canvasScore) || 0));
        const pv1 = Math.min(20, Math.max(0, Number(record.promptV1Score) || 0));
        const peer = Math.min(15, Math.max(0, Number(record.peerReviewScore) || 0));
        const pv2 = Math.min(25, Math.max(0, Number(record.promptV2Score) || 0));
        const vercel = Math.min(20, Math.max(0, Number(record.vercelScore) || 0));
        const bonus = Math.min(20, Math.max(0, Number(record.bonusScore) || 0));
        const nextRec: StudentScoreRecord = {
          ...record,
          studentCode: code,
          canvasScore: canvas,
          promptV1Score: pv1,
          peerReviewScore: peer,
          promptV2Score: pv2,
          vercelScore: vercel,
          bonusScore: bonus,
          totalScore: Math.min(120, Math.max(0, canvas + pv1 + peer + pv2 + vercel + bonus)),
          updatedAt: Date.now(),
        };
        serverScoresRef.current[code] = nextRec;
        if (auth.currentUser) teacherScoresRef.current[code] = nextRec;
        return nextRec;
      });

      setWorkspace((prev) => applyMergedToWorkspace(prev));

      sendRaw({
        type: 'teacher:group:scores',
        groupId,
        records: normalizedList,
        summaryLabel,
      });

      if (auth.currentUser) {
        for (const normalized of normalizedList) {
          const path = `studentScores/${normalized.studentCode}`;
          try {
            await setDoc(doc(db, 'studentScores', normalized.studentCode), {
              studentCode: normalized.studentCode,
              studentName: normalized.studentName,
              groupId: normalized.groupId,
              active: normalized.active,
              canvasScore: normalized.canvasScore,
              promptV1Score: normalized.promptV1Score,
              peerReviewScore: normalized.peerReviewScore,
              promptV2Score: normalized.promptV2Score,
              vercelScore: normalized.vercelScore,
              bonusScore: normalized.bonusScore,
              totalScore: normalized.totalScore,
              teacherNote: normalized.teacherNote || '',
              updatedAt: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
          }
        }
      }
    },
    [applyMergedToWorkspace, sendRaw, session.role]
  );

  const updateTeacherControls = useCallback(
    async (controls: Partial<TeacherClassroomControl>) => {
      if (session.role !== 'teacher') {
        throw new Error('จำกัดสิทธิ์เฉพาะครูผู้สอนเท่านั้น');
      }
      sendRaw({ type: 'teacher:controls:update', controls });

      if (auth.currentUser && workspace?.teacherControls) {
        const merged = { ...workspace.teacherControls, ...controls };
        try {
          await setDoc(doc(db, 'teacherControls', 'classroom'), {
            controlId: 'classroom',
            announcement: merged.announcement || '',
            lockedPhases: merged.lockedPhases || [],
            allowStudentScoreView: Boolean(merged.allowStudentScoreView),
            updatedByUid: auth.currentUser.uid,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'teacherControls/classroom');
        }
      }
    },
    [sendRaw, session.role, workspace?.teacherControls]
  );

  // Example scenario actions
  const updateExampleCanva = useCallback(
    (canvaLink: string) => {
      setWorkspace((prev) =>
        prev ? { ...prev, example: { ...prev.example, canvaLink } } : prev
      );
      sendRaw({ type: 'example:canva:update', canvaLink, editor: session.displayName });
    },
    [session.displayName, sendRaw]
  );

  const updateExampleCanvas = useCallback(
    (field: keyof CanvasData, value: string) => {
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              example: {
                ...prev.example,
                canvas: { ...prev.example.canvas, [field]: value },
              },
            }
          : prev
      );
      sendRaw({ type: 'example:canvas:update', field, value, editor: session.displayName });
    },
    [session.displayName, sendRaw]
  );

  const addExampleNote = useCallback(
    (category: IdeationCategory, text: string) => {
      const id = crypto.randomUUID();
      sendRaw({
        type: 'example:note:create',
        studentCode: session.studentCode,
        groupId: session.groupId,
        note: { id, author: session.displayName, category, text },
      });
    },
    [session.displayName, session.groupId, session.studentCode, sendRaw]
  );

  const voteExampleNote = useCallback(
    (noteId: string) => {
      sendRaw({ type: 'example:note:vote', noteId });
    },
    [sendRaw]
  );

  const deleteExampleNote = useCallback(
    (noteId: string) => {
      sendRaw({ type: 'example:note:delete', noteId });
    },
    [sendRaw]
  );

  // Group actions
  const addGroupIdeationNote = useCallback(
    (groupId: number, category: IdeationCategory, text: string) => {
      const id = crypto.randomUUID();
      sendRaw({
        type: 'group:ideation:create',
        groupId,
        studentCode: session.studentCode,
        note: { id, author: session.displayName, category, text },
      });
    },
    [session.displayName, session.studentCode, sendRaw]
  );

  const voteGroupIdeationNote = useCallback(
    (groupId: number, noteId: string) => {
      sendRaw({ type: 'group:ideation:vote', groupId, noteId });
    },
    [sendRaw]
  );

  const deleteGroupIdeationNote = useCallback(
    (groupId: number, noteId: string) => {
      sendRaw({ type: 'group:ideation:delete', groupId, noteId });
    },
    [sendRaw]
  );

  const updateGroupCanvas = useCallback(
    (groupId: number, field: keyof CanvasData, value: string) => {
      setWorkspace((prev) => {
        if (!prev || !prev.groups[groupId]) return prev;
        return {
          ...prev,
          groups: {
            ...prev.groups,
            [groupId]: {
              ...prev.groups[groupId],
              canvas: { ...prev.groups[groupId].canvas, [field]: value },
            },
          },
        };
      });
      sendRaw({
        type: 'group:canvas:update',
        groupId,
        field,
        value,
        editor: session.displayName,
        studentCode: session.studentCode,
      });
    },
    [session.displayName, session.studentCode, sendRaw]
  );

  const updateGroupHumanAi = useCallback(
    (groupId: number, field: keyof HumanVsAiData, value: string) => {
      setWorkspace((prev) => {
        if (!prev || !prev.groups[groupId]) return prev;
        return {
          ...prev,
          groups: {
            ...prev.groups,
            [groupId]: {
              ...prev.groups[groupId],
              humanVsAi: { ...prev.groups[groupId].humanVsAi, [field]: value },
            },
          },
        };
      });
      sendRaw({
        type: 'group:humanai:update',
        groupId,
        field,
        value,
        editor: session.displayName,
        studentCode: session.studentCode,
      });
    },
    [session.displayName, session.studentCode, sendRaw]
  );

  const updateGroupReflection = useCallback(
    (groupId: number, field: keyof ReflectionData, value: string) => {
      setWorkspace((prev) => {
        if (!prev || !prev.groups[groupId]) return prev;
        return {
          ...prev,
          groups: {
            ...prev.groups,
            [groupId]: {
              ...prev.groups[groupId],
              reflection: { ...prev.groups[groupId].reflection, [field]: value },
            },
          },
        };
      });
      sendRaw({
        type: 'group:reflection:update',
        groupId,
        field,
        value,
        editor: session.displayName,
        studentCode: session.studentCode,
      });
    },
    [session.displayName, session.studentCode, sendRaw]
  );

  const updateGroupMeta = useCallback(
    (groupId: number, field: string, value: string | boolean[]) => {
      setWorkspace((prev) => {
        if (!prev || !prev.groups[groupId]) return prev;
        return {
          ...prev,
          groups: {
            ...prev.groups,
            [groupId]: {
              ...prev.groups[groupId],
              [field]: value,
            },
          },
        };
      });
      sendRaw({
        type: 'group:meta:update',
        groupId,
        field,
        value,
        editor: session.displayName,
        studentCode: session.studentCode,
      });
    },
    [session.displayName, session.studentCode, sendRaw]
  );

  const addGroupComment = useCallback(
    (groupId: number, strengths: string, improvements: string) => {
      const id = crypto.randomUUID();
      const fromGroupLabel = session.groupId ? `กลุ่มที่ ${session.groupId}` : 'เพื่อนร่วมชั้น';
      sendRaw({
        type: 'group:comment:create',
        groupId,
        studentCode: session.studentCode,
        comment: {
          id,
          fromGroupLabel,
          authorName: session.displayName,
          strengths,
          improvements,
        },
      });
    },
    [session.displayName, session.groupId, session.studentCode, sendRaw]
  );

  const deleteGroupComment = useCallback(
    (groupId: number, commentId: string) => {
      sendRaw({ type: 'group:comment:delete', groupId, commentId });
    },
    [sendRaw]
  );

  const controlTimer = useCallback(
    (action: 'start' | 'pause' | 'reset' | 'setPhase' | 'startPhase', phase?: ActivityPhaseId) => {
      sendRaw({ type: 'timer:control', action, phase });
    },
    [sendRaw]
  );

  return {
    workspace,
    presence,
    clientId,
    connected,
    session,
    displayRemainingSeconds,
    loginStudentByCode,
    loginTeacherWithGoogle,
    logout,
    quickSwitchGroup,
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
  };
}
