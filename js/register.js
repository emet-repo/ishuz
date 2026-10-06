// ============================================================
//  js/register.js  —  Registration page
//  Replaces: php/add_user.php
//
//  Flow: validate → supabase.auth.signUp(email, password)
//        → insert full profile row → redirect
// ============================================================

import { supabase, getSession, showError, showSuccess } from './config.js';

async function init() {
  // Already logged in → go home
  const session = await getSession();
  if (session) { window.location.href = 'index.html'; return; }

  document.getElementById('register_form').addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();

  const msgEl = document.getElementById('msg');
  msgEl.style.display = 'none';

  // ── Read fields ──────────────────────────────────────────
  const username   = document.getElementById('user_name').value.trim();
  const email      = document.getElementById('email').value.trim();
  const password   = document.getElementById('password').value;
  const password2  = document.getElementById('password2').value;
  const firstName  = document.getElementById('first_name').value.trim();
  const lastName   = document.getElementById('last_name').value.trim();
  const country    = document.getElementById('country').value.trim();
  const state      = document.getElementById('state_provice').value.trim();
  const city       = document.getElementById('city_town').value.trim();
  const language   = document.getElementById('language').value.trim();
  const infoSource = document.getElementById('info_source').value.trim();
  const honeypot   = document.getElementById('website').value;

  // ── Honeypot check ───────────────────────────────────────
  if (honeypot) return; // bot — silently reject

  // ── Validation (mirrors original PHP checks) ─────────────
  if (!username || !email || !password || !password2 || !firstName || !lastName) {
    showError(msgEl, 'Please fill in all required fields (marked with *).');
    return;
  }
  if (username.length > 12) {
    showError(msgEl, 'Username must be 12 characters or fewer.');
    return;
  }
  if (password !== password2) {
    showError(msgEl, 'Passwords do not match!');
    return;
  }
  if (password.length < 6) {
    showError(msgEl, 'Password must be at least 6 characters.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(msgEl, 'Please enter a valid e-mail address.');
    return;
  }

  const btn = document.getElementById('register_btn');
  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  // ── Check username availability ──────────────────────────
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_name')
    .eq('user_name', username)
    .maybeSingle();

  if (existing) {
    showError(msgEl, `Username "${username}" is already taken. Please choose another.`);
    btn.disabled    = false;
    btn.textContent = 'Create account';
    return;
  }

  // ── Create Supabase Auth user ────────────────────────────
  // Note: disable email confirmation in Supabase Dashboard → Auth → Settings
  //       for immediate access without verification step.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Pass user_name in metadata as a convenience — profile insert below is authoritative
      data: { user_name: username }
    }
  });

  if (authError) {
    showError(msgEl, 'Registration failed: ' + authError.message);
    btn.disabled    = false;
    btn.textContent = 'Create account';
    return;
  }

  const userId = authData.user?.id;
  if (!userId) {
    // Email confirmation is ON — user exists but session not yet active
    showSuccess(msgEl,
      'Almost there! Check your inbox for a confirmation link, then come back to log in.');
    btn.disabled = true;
    return;
  }

  // ── Insert profile row ───────────────────────────────────
  const { error: profileError } = await supabase.from('profiles').insert({
    id:           userId,
    user_name:    username,
    email:        email,
    first_name:   firstName,
    last_name:    lastName,
    country:      country,
    state_provice: state,
    city_town:    city,
    language:     language,
    info_source:  infoSource
  });

  if (profileError) {
    console.error(profileError);
    // Auth user created but profile failed — still usable, log and continue
    showError(msgEl, 'Account created but profile save failed: ' + profileError.message);
    btn.disabled    = false;
    btn.textContent = 'Create account';
    return;
  }

  // ── Success — redirect ────────────────────────────────────
  showSuccess(msgEl, `Welcome to Ishuz, ${username}! Redirecting…`);
  setTimeout(() => { window.location.href = 'index.html'; }, 1500);
}

init().catch(console.error);
