// ============================================================
//  js/add-question.js  —  Add question page
//  Replaces: php/add_question.php
// ============================================================

import { supabase, getSession, showError, showSuccess, escapeHtml } from './config.js';

async function init() {
  const session = await getSession();

  const authGate    = document.getElementById('auth_gate');
  const questionForm = document.getElementById('question_form');

  if (!session) {
    // Not logged in — show auth gate
    authGate.style.display    = 'block';
    questionForm.style.display = 'none';
    return;
  }

  questionForm.style.display = 'block';

  // ── Toggle MC options & hints based on question type ────
  const typeSelect  = document.getElementById('question_type');
  const mcSection   = document.getElementById('mc_section');
  const typeHint    = document.getElementById('type_hint');

  const hints = {
    'multiple choice': '',
    'free text':       'Users will type any free-form text as their answer.',
    'numeric':         'Users will enter a number; the collective answer will be the average.'
  };

  typeSelect.addEventListener('change', () => {
    const t = typeSelect.value;
    mcSection.style.display = (t === 'multiple choice') ? 'block' : 'none';
    typeHint.textContent    = hints[t] ?? '';
    typeHint.style.display  = hints[t] ? 'block' : 'none';
  });

  // ── Form submit ──────────────────────────────────────────
  questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('msg');
    msgEl.style.display = 'none';

    const text  = document.getElementById('question_text').value.trim();
    const type  = typeSelect.value;
    const ansA  = document.getElementById('answer_a').value.trim();
    const ansB  = document.getElementById('answer_b').value.trim();
    const ansC  = document.getElementById('answer_c').value.trim();
    const ansD  = document.getElementById('answer_d').value.trim();
    const ansE  = document.getElementById('answer_e').value.trim();

    // Validate
    if (!text || text.split(' ').length < 2) {
      showError(msgEl, 'Please enter a question with at least 2 words.');
      return;
    }
    if (type === 'multiple choice' && (!ansA || !ansB)) {
      showError(msgEl, 'Multiple choice questions need at least two options (A and B).');
      return;
    }

    const btn = document.getElementById('submit_btn');
    btn.disabled    = true;
    btn.textContent = 'Submitting…';

    const row = {
      user_id:       session.user.id,
      question_text: text,
      question_type: type,
      answer_a: ansA,
      answer_b: ansB,
      answer_c: ansC,
      answer_d: ansD,
      answer_e: ansE
    };

    const { error } = await supabase.from('questions_list').insert(row);

    if (error) {
      showError(msgEl, 'Error saving question: ' + error.message);
    } else {
      showSuccess(msgEl, 'Question submitted! The crowd can now answer it.');
      questionForm.reset();
      mcSection.style.display = 'block'; // reset visibility
    }

    btn.disabled    = false;
    btn.textContent = 'Submit question';
  });
}

init().catch(console.error);
