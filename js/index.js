// ============================================================
//  js/index.js  —  Main page logic
//  Replaces: index.php + php/get_random_question.php +
//            php/insert_answer.php + php/get_statistics.php +
//            php/get_user_statistics.php
//  + javascript/q_a_functions.js + javascript/main_functions.js
// ============================================================

import {
  supabase,
  getSession,
  getProfile,
  computeCollectiveAnswer,
  escapeHtml
} from './config.js';

// ── State ──────────────────────────────────────────────────
let currentQuestion  = null;
let allQuestions     = [];
let currentIndex     = 0;
let currentSessionId = null;
let statsTimer       = null;
let userStatsTimer   = null;

// ── Entry point ────────────────────────────────────────────
async function init() {
  const session = await getSession();
  currentSessionId = session?.user?.id ?? null;

  // Update nav & greeting
  updateNavUI(session);
  if (session) {
    const profile = await getProfile(session.user.id);
    if (profile) {
      document.getElementById('greeting').textContent = `Hello, ${profile.user_name}!`;
    }
  }

  // React to auth changes (e.g. logout in another tab)
  supabase.auth.onAuthStateChange(async (event, session) => {
    currentSessionId = session?.user?.id ?? null;
    updateNavUI(session);

    if (event === 'SIGNED_OUT') {
      document.getElementById('greeting').textContent = 'Hello, visitor!';
      document.getElementById('user_stats').innerHTML =
        '<p style="font-size:12px;color:#888">Log in to see your stats</p>';
      clearInterval(userStatsTimer);
    }

    if (event === 'SIGNED_IN' && session) {
      const profile = await getProfile(session.user.id);
      if (profile) {
        document.getElementById('greeting').textContent = `Hello, ${profile.user_name}!`;
      }
      startUserStatsPolling(session.user.id);
    }
  });

  // Wire events
  document.getElementById('logout-link')
    .addEventListener('click', async (e) => { e.preventDefault(); await supabase.auth.signOut(); });

  document.getElementById('answer_form')
    .addEventListener('submit', handleAnswerSubmit);

  document.getElementById('skip_btn')
    .addEventListener('click', () => nextQuestion());

  document.getElementById('next_btn')
    .addEventListener('click', () => {
      document.getElementById('result_section').style.display = 'none';
      document.getElementById('answer_form').style.display    = 'flex';
      nextQuestion();
    });

  // Load questions & start polling
  await loadQuestions();
  await updateCommonStats();
  statsTimer = setInterval(updateCommonStats, 3000);

  if (session) {
    await updateUserStats(session.user.id);
    startUserStatsPolling(session.user.id);
  }
}

// ── Nav UI ─────────────────────────────────────────────────
function updateNavUI(session) {
  document.getElementById('nav-login').style.display    = session ? 'none' : 'list-item';
  document.getElementById('nav-register').style.display = session ? 'none' : 'list-item';
  document.getElementById('nav-logout').style.display   = session ? 'list-item' : 'none';
}

// ── Load all questions ─────────────────────────────────────
async function loadQuestions() {
  const { data, error } = await supabase
    .from('questions_list')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) {
    document.getElementById('question_display').innerHTML =
      `<p>No questions yet. <a href="add-question.html">Be the first to ask one!</a></p>`;
    return;
  }

  allQuestions = data;
  // Start at a random question each page load
  currentIndex = Math.floor(Math.random() * allQuestions.length);
  showQuestion(allQuestions[currentIndex]);
}

// ── Render question ────────────────────────────────────────
function showQuestion(q) {
  currentQuestion = q;

  // Counter
  document.getElementById('question_counter').textContent =
    `Question ${currentIndex + 1} of ${allQuestions.length}`;

  // Question text + type badge
  document.getElementById('question_display').innerHTML = `
    <p class="question-text">${escapeHtml(q.question_text)}</p>
    <span class="question-type">${escapeHtml(q.question_type)}</span>`;

  // Answer input
  document.getElementById('answer_input_area').innerHTML = buildInputHTML(q);
  document.getElementById('answer_form').style.display    = 'flex';
  document.getElementById('result_section').style.display = 'none';
}

function buildInputHTML(q) {
  if (q.question_type === 'multiple choice') {
    const opts = [q.answer_a, q.answer_b, q.answer_c, q.answer_d, q.answer_e].filter(Boolean);
    return opts.map(opt => `
      <label class="mc-option">
        <input type="radio" name="mc_answer" value="${escapeHtml(opt)}">
        ${escapeHtml(opt)}
      </label>`).join('');
  }

  if (q.question_type === 'numeric') {
    return `<input type="number" id="num_answer" placeholder="Enter a number…" step="any" style="max-width:220px">`;
  }

  if (q.question_type === 'free text') {
    return `<textarea id="free_answer" rows="3" placeholder="Type your answer…"></textarea>`;
  }

  return '';
}

// ── Advance to next question ───────────────────────────────
function nextQuestion() {
  if (allQuestions.length === 0) return;
  currentIndex = (currentIndex + 1) % allQuestions.length;
  showQuestion(allQuestions[currentIndex]);
}

// ── Handle answer submission ───────────────────────────────
async function handleAnswerSubmit(e) {
  e.preventDefault();

  // Must be logged in
  const session = await getSession();
  if (!session) {
    if (confirm('You need to log in to submit an answer. Go to login page?')) {
      window.location.href = 'login.html';
    }
    return;
  }

  const q = currentQuestion;
  const row = {
    question_id:      q.question_id,
    user_id:          session.user.id,
    answer_text_mc:   '',
    answer_text_num:  null,
    answer_text_free: ''
  };

  // Collect the answer
  if (q.question_type === 'multiple choice') {
    const sel = document.querySelector('input[name="mc_answer"]:checked');
    if (!sel) { alert('Please select an answer.'); return; }
    row.answer_text_mc = sel.value;

  } else if (q.question_type === 'numeric') {
    const val = document.getElementById('num_answer')?.value;
    if (!val || isNaN(Number(val))) { alert('Please enter a valid number.'); return; }
    row.answer_text_num = parseFloat(val);

  } else if (q.question_type === 'free text') {
    const val = document.getElementById('free_answer')?.value?.trim();
    if (!val) { alert('Please enter your answer.'); return; }
    row.answer_text_free = val;
  }

  // Disable during flight
  const btn = document.getElementById('submit_btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  // Insert answer
  const { error: insertError } = await supabase.from('answers_list').insert(row);
  if (insertError) {
    console.error(insertError);
    alert('Error submitting answer: ' + insertError.message);
    btn.disabled = false;
    btn.textContent = 'Submit answer';
    return;
  }

  // Fetch all answers for this question to compute collective intelligence
  const { data: allAnswers } = await supabase
    .from('answers_list')
    .select('*')
    .eq('question_id', q.question_id);

  const result = computeCollectiveAnswer(allAnswers, q.question_type);
  renderResult(result, q.question_type);

  btn.disabled = false;
  btn.textContent = 'Submit answer';
  document.getElementById('answer_form').style.display    = 'none';
  document.getElementById('result_section').style.display = 'block';

  // Refresh user stats immediately
  if (currentSessionId) updateUserStats(currentSessionId);
}

// ── Render collective intelligence result ──────────────────
function renderResult(result, questionType) {
  const colEl = document.getElementById('collective_answer');
  const brkEl = document.getElementById('vote_breakdown');

  if (!result) {
    colEl.innerHTML = '<p>Not enough data yet — be the first!</p>';
    brkEl.innerHTML = '';
    return;
  }

  if (questionType === 'multiple choice') {
    colEl.innerHTML = `
      <p class="collective-label">The crowd says:</p>
      <p class="collective-answer-text">${escapeHtml(result.collective)}</p>
      <p class="vote-total">${result.total} vote${result.total !== 1 ? 's' : ''} total</p>`;

    brkEl.innerHTML = result.breakdown.map(item => `
      <div class="vote-bar">
        <span class="vote-label">${escapeHtml(item.answer)}</span>
        <div class="bar-container">
          <div class="bar-track">
            <div class="bar-fill" style="width:${item.percent}%"></div>
          </div>
          <span class="bar-percent">${item.percent}%</span>
        </div>
      </div>`).join('');

  } else if (questionType === 'numeric') {
    colEl.innerHTML = `
      <p class="collective-label">The crowd's average:</p>
      <p class="collective-answer-text">${escapeHtml(result.collective)}</p>
      <p class="vote-total">Based on ${result.total} response${result.total !== 1 ? 's' : ''}</p>`;
    brkEl.innerHTML = '';

  } else if (questionType === 'free text') {
    const recent = (result.breakdown ?? []).slice(-5);
    colEl.innerHTML = `<p class="vote-total">${result.total} response${result.total !== 1 ? 's' : ''} submitted</p>`;
    brkEl.innerHTML = recent.length
      ? `<ul class="free-text-answers">${recent.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      : '';
  }
}

// ── Common statistics (replaces get_statistics.php) ───────
async function updateCommonStats() {
  const [u, q, a] = await Promise.all([
    supabase.from('profiles')      .select('id',          { count: 'exact', head: true }),
    supabase.from('questions_list').select('question_id', { count: 'exact', head: true }),
    supabase.from('answers_list')  .select('answer_id',   { count: 'exact', head: true })
  ]);

  document.getElementById('common_stats').innerHTML = `
    <ul class="stats-list">
      <li><span>👥 Registered Users</span> <strong>${u.count ?? 0}</strong></li>
      <li><span>❓ Active Questions</span> <strong>${q.count ?? 0}</strong></li>
      <li><span>💬 Crowd Votes</span> <strong>${a.count ?? 0}</strong></li>
    </ul>`;
}

// ── User statistics (replaces get_user_statistics.php) ────
async function updateUserStats(userId) {
  const [ans, qs] = await Promise.all([
    supabase.from('answers_list')  .select('answer_id',   { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('questions_list').select('question_id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  document.getElementById('user_stats').innerHTML = `
    <ul class="stats-list">
      <li><span>💬 Your Votes</span> <strong>${ans.count ?? 0}</strong></li>
      <li><span>❓ Your Questions</span> <strong>${qs.count ?? 0}</strong></li>
    </ul>`;
}

function startUserStatsPolling(userId) {
  clearInterval(userStatsTimer);
  userStatsTimer = setInterval(() => updateUserStats(userId), 3000);
}

// ── Go ─────────────────────────────────────────────────────
init().catch(console.error);
