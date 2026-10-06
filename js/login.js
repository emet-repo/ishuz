// ============================================================
//  js/login.js  —  Login page
//  Replaces: php/user_login.php
//
//  Flow: username → look up email in profiles → signInWithPassword
//  (Supabase Auth uses email as identity; we store email in
//   profiles so we can resolve username → email client-side)
// ============================================================

import { supabase, getSession, showError } from './config.js';

async function init() {
  // Already logged in → go home
  const session = await getSession();
  if (session) { window.location.href = 'index.html'; return; }

  document.getElementById('login_form').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  const msgEl    = document.getElementById('msg');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('login_btn');

  msgEl.style.display = 'none';

  if (!username || !password) {
    showError(msgEl, 'Please enter your username and password.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Logging in…';

  // ① Resolve username → email via the public profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_name', username)
    .maybeSingle();

  if (profileError || !profile) {
    showError(msgEl, 'Username not found. Check spelling or register first.');
    btn.disabled    = false;
    btn.textContent = 'Login';
    return;
  }

  // ② Sign in with email + password
  const { error: authError } = await supabase.auth.signInWithPassword({
    email:    profile.email,
    password: password
  });

  if (authError) {
    showError(msgEl, 'Incorrect password. Please try again.');
    btn.disabled    = false;
    btn.textContent = 'Login';
    return;
  }

  // ③ Success — redirect to home
  window.location.href = 'index.html';
}

init().catch(console.error);
