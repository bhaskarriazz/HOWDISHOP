'use strict';
// =====================================================================================
// HOWDI V8 — Learn taxonomy (P8 decision closure). The single authority for what a course's project, learner goals and
// learner support mean. Discovery filters, course cards, the learner journey and Show My Work all read from here.
//
// Project (smallest authoritative model; there is no standalone Project entity):
//   A course "has a project" when learners make something and share it with the teacher (Show My Work).
//   declared  — the teacher answered the authoring question: v8_project_declared_at IS NOT NULL → project_required decides.
//   legacy    — courses created before the question existed keep the accepted affirmative-evidence rule:
//               project_required IS TRUE, or an active lesson with a practice task. NULL/missing is never positive.
//
// Goals (Discovery `goal=`; every value is a teacher-authored or system fact, never a category name):
//   certificate — certificate_enabled (the certificate is issued on completion unless the course switches it off)
//   project     — the project rule above
//   sell        — v8_sell_goal IS TRUE (teacher declared the course covers pricing/listing what learners make) AND a project
//
// Learner support (cards): factual capabilities only.
//   live_class      — live_class_included IS TRUE
//   certificate     — certificate_enabled IS NOT FALSE
//   teacher_review  — the course has a project and a V8 teacher who reviews shared work (the Show My Work review flow)
// =====================================================================================
const GOALS = Object.freeze([
  Object.freeze({ value: 'certificate', label: 'Get a certificate', source: 'learning_courses.certificate_enabled' }),
  Object.freeze({ value: 'project', label: 'Make a finished project', source: 'teacher-declared project (project_required + v8_project_declared_at); legacy affirmative evidence' }),
  Object.freeze({ value: 'sell', label: 'Start selling', source: 'learning_courses.v8_sell_goal (teacher-declared) and a project' }),
]);
const SUPPORT = Object.freeze([
  Object.freeze({ value: 'live_class', label: 'Live class with teacher', source: 'learning_courses.live_class_included' }),
  Object.freeze({ value: 'certificate', label: 'Certificate', source: 'learning_courses.certificate_enabled' }),
  Object.freeze({ value: 'teacher_review', label: 'Teacher reviews your project', source: 'project + V8 teacher (Show My Work review)' }),
]);
const GOAL_VALUES = GOALS.map((g) => g.value);
const SUPPORT_VALUES = SUPPORT.map((s) => s.value);

// ---------------------------------------------------------------- SQL (alias = the learning_courses alias)
const practiceSql = (a) => `EXISTS(SELECT 1 FROM learning_course_modules pm JOIN learning_course_lessons pl ON pl.module_id=pm.id WHERE pm.course_id=${a}.id AND pm.is_active AND pl.is_active AND COALESCE(TRIM(pl.practice_task),'')<>'')`;
const projectSql = (a = 'c') => `(CASE WHEN ${a}.v8_project_declared_at IS NOT NULL THEN ${a}.project_required IS TRUE ELSE (${a}.project_required IS TRUE OR ${practiceSql(a)}) END)`;
function goalSql(goal, a = 'c') {
  if (goal === 'certificate') return `${a}.certificate_enabled IS NOT FALSE`;
  if (goal === 'project') return projectSql(a);
  if (goal === 'sell') return `(${a}.v8_sell_goal IS TRUE AND ${projectSql(a)})`;
  return null;
}

// ---------------------------------------------------------------- JS (a learning_courses row + whether a practice task exists)
function projectOf(c, hasPractice) {
  const declared = Boolean(c && c.v8_project_declared_at);
  const has = declared ? c.project_required === true : Boolean(c && (c.project_required === true || hasPractice === true));
  return { has, declared };
}
function goalsOf(c, project) {
  return [c.certificate_enabled !== false ? 'certificate' : null, project ? 'project' : null, project && c.v8_sell_goal === true ? 'sell' : null].filter(Boolean);
}
function supportOf(c, project) {
  return [c.live_class_included === true ? 'live_class' : null, c.certificate_enabled !== false ? 'certificate' : null, project && c.v8_teacher_user_id ? 'teacher_review' : null].filter(Boolean);
}

// Teacher authoring: the project question must be answered explicitly; selling needs something learners make.
function authoringChoice(b) {
  const errors = [];
  const project = typeof b?.project_required === 'boolean' ? b.project_required : null;
  if (project === null) errors.push('a project choice (does this course end with a project learners share? yes or no)');
  const sell = b?.sell_goal === true;
  if (b?.sell_goal != null && typeof b.sell_goal !== 'boolean') errors.push('a selling choice (yes or no)');
  if (sell && project === false) errors.push('a project (a selling course needs something learners make)');
  return { project, sell, errors };
}

module.exports = { GOALS, SUPPORT, GOAL_VALUES, SUPPORT_VALUES, practiceSql, projectSql, goalSql, projectOf, goalsOf, supportOf, authoringChoice };
