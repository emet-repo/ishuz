// ============================================================
//  js/config.js  —  Shared Supabase client + utilities
//  ❗ Replace the two placeholder values below before deploying
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── YOUR SUPABASE CREDENTIALS ───────────────────────────────
export const SUPABASE_URL      = 'https://drxwscbybvmqkmbburub.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_1kRIFbzRFfdmkXGyoVDE5w_3WjILqNA';
// ────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ════════════════════════════════════════════════════════════
//  COLLECTIVE INTELLIGENCE COMPUTATION
//  Replaces the PHP logic in insert_answer.php
// ════════════════════════════════════════════════════════════

/**
 * Compute the collective intelligence answer from raw answer rows.
 * @param {Array}  answers      - rows from answers_list for one question
 * @param {string} questionType - 'multiple choice' | 'numeric' | 'free text'
 * @returns {{ collective, total, breakdown } | null}
 */
export function computeCollectiveAnswer(answers, questionType) {
  if (!answers || answers.length === 0) return null;

  // ── Multiple choice: majority vote ─────────────────────────
  if (questionType === 'multiple choice') {
    const counts = {};
    let total = 0;
    for (const row of answers) {
      const val = (row.answer_text_mc ?? '').toLowerCase().trim();
      if (val) { counts[val] = (counts[val] ?? 0) + 1; total++; }
    }
    if (total === 0) return null;

    let maxCount = 0, collective = '';
    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; collective = key; }
    }

    const breakdown = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([answer, count]) => ({
        answer,
        count,
        percent: ((count / total) * 100).toFixed(1)
      }));

    return { collective, total, breakdown };
  }

  // ── Numeric: arithmetic mean ────────────────────────────────
  if (questionType === 'numeric') {
    const nums = answers
      .map(a => parseFloat(a.answer_text_num))
      .filter(n => !isNaN(n));
    if (nums.length === 0) return null;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return { collective: avg.toFixed(2), total: nums.length, breakdown: null };
  }

  // ── Free text: collect all responses ───────────────────────
  if (questionType === 'free text') {
    const texts = answers.map(a => a.answer_text_free).filter(Boolean);
    return { collective: null, total: texts.length, breakdown: texts };
  }

  return null;
}


// ════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ════════════════════════════════════════════════════════════

/** Returns the current Supabase session or null. */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Fetches the profiles row for a given user UUID. */
export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data ?? null;
}


// ════════════════════════════════════════════════════════════
//  DOM HELPERS
// ════════════════════════════════════════════════════════════

export function showError(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
  el.className     = 'msg error';
}

export function showSuccess(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
  el.className     = 'msg success';
}

/** Minimal XSS guard for text inserted via innerHTML. */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
