# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants
1. **Admin Authority**: Only verified teachers (`request.auth.token.email == 'thitiwat@psc.ac.th' && request.auth.token.email_verified == true` or existence of `/admins/{uid}`) may create, update, or delete `/studentScores/{studentCode}` and `/teacherControls/{controlId}`, or delete `/classRoster/{studentCode}`.
2. **Self-Assigned Role Prevention**: A student creating `/studentProfiles/{uid}` may ONLY set `role == 'student'` and `uid == request.auth.uid`, and can never escalate to admin.
3. **Score Integrity**: Students cannot write, modify, or forge any score fields (`canvasScore`, `promptV1Score`, `peerReviewScore`, `promptV2Score`, `vercelScore`, `bonusScore`, `totalScore`) in `/studentScores/{studentCode}` or inject them into `/classRoster/{studentCode}`.
4. **PII & Cross-Student Isolation**: Students may only `get` their own `/studentProfiles/{uid}` and query/read their own `/studentScores/{studentCode}` (where `linkedUid == request.auth.uid`), never scraping another user's private profile. `/classRoster/{studentCode}` contains zero PII (only non-sensitive classroom check-in `studentCode`, `studentName`, `groupId`, `active`, `joinedAt`).
5. **Roster Check-In Integrity**: Any `/classRoster/{studentCode}` create must enforce `active == true`, valid `groupId` (`1..10`), `studentCode == docId`, `joinedAt == request.time`, and strict field allowlist (`hasOnly`); updates by non-admins cannot re-activate a suspended (`active == false`) student or alter `studentCode`.
6. **Timeline Integrity**: An authenticated user creating `/activityTimeline/{eventId}` must set `actorUid == request.auth.uid` and `createdAt == request.time`, and cannot delete or forge another user's timeline event.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)
1. Unauthenticated read/write to `/studentScores/6701` -> DENIED
2. Student trying to write `/admins/{studentUid}` to become teacher -> DENIED
3. Student trying to create `/studentProfiles/{uid}` with `role: "admin"` -> DENIED
4. Student trying to create `/studentProfiles/{otherUid}` (spoofing UID) -> DENIED
5. Student trying to update `/studentScores/6701` with `{ totalScore: 100 }` -> DENIED
6. Student trying to update `/teacherControls/classroom` to unlock locked phases -> DENIED
7. Student trying to add a shadow field `{ isVerified: true }` to `/studentProfiles/{uid}` or `{ totalScore: 100 }` to `/classRoster/6701` -> DENIED
8. Unverified email (`email_verified: false`) claiming admin email `thitiwat@psc.ac.th` -> DENIED
9. Resource poisoning: Document ID longer than 128 chars or containing invalid characters (`../../etc`) -> DENIED
10. String size poisoning: `summary` > 400 chars in `/activityTimeline/{eventId}` or `studentName` > 80 chars in `/classRoster/6701` -> DENIED
11. Timestamp spoofing: Client sending hardcoded `createdAt` or `joinedAt` instead of `request.time` -> DENIED
12. Non-admin trying to delete `/classRoster/6701` or `/activityTimeline/{eventId}`, or re-activate a suspended (`active: false`) `/classRoster/6701` -> DENIED
