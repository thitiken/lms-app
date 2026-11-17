// Security Rules Adversarial Test Specification (Dirty Dozen)
// Verified against DRAFT_firestore.rules and firestore.rules

export const DIRTY_DOZEN_TESTS = [
  { name: '1. Unauthenticated write to studentScores', path: 'studentScores/6701', op: 'write', expected: 'PERMISSION_DENIED' },
  { name: '2. Student escalating self to /admins/{uid}', path: 'admins/student1', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '3. Student setting role=admin in studentProfiles', path: 'studentProfiles/student1', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '4. Student spoofing another UID in studentProfiles', path: 'studentProfiles/otherUser', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '5. Student modifying totalScore in studentScores', path: 'studentScores/6701', op: 'update', expected: 'PERMISSION_DENIED' },
  { name: '6. Student updating teacherControls/classroom', path: 'teacherControls/classroom', op: 'update', expected: 'PERMISSION_DENIED' },
  { name: '7. Shadow field totalScore in classRoster or isVerified in studentProfiles', path: 'classRoster/6701', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '8. Unverified email claiming admin email', path: 'studentScores/6701', op: 'update', expected: 'PERMISSION_DENIED' },
  { name: '9. Invalid document ID poisoning', path: 'classRoster/invalid$id!', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '10. Oversized studentName > 80 chars in classRoster', path: 'classRoster/6701', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '11. Client-forged joinedAt timestamp in classRoster', path: 'classRoster/6701', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '12. Non-admin deleting /classRoster/6701 or reactivating suspended student', path: 'classRoster/6701', op: 'delete', expected: 'PERMISSION_DENIED' },
] as const;
