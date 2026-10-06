# Ishuz — GitHub Pages + Supabase Port

> Original PHP/MySQL application (2010) ported to a fully static site using **GitHub Pages** (hosting) and **Supabase** (Postgres DB + Auth).

---

## Live stack

```
Browser (HTML/CSS/JS)
    │
    ├── GitHub Pages  → static file hosting (free)
    └── Supabase      → Postgres DB + Auth + REST API (free tier)
```

No PHP. No server. No monthly cost for small traffic.

---

## Project structure

```
ishuz-gh-pages/
├── index.html          ← Main page (question + answer + stats)
├── login.html          ← Login
├── register.html       ← Registration
├── add-question.html   ← Ask a question (requires login)
├── forget.html         ← Password reset
├── css/
│   └── style.css       ← Faithful modern port of original CSS
├── js/
│   ├── config.js       ← Supabase client + shared utilities
│   ├── index.js        ← Main page logic
│   ├── login.js        ← Login flow
│   ├── register.js     ← Registration flow
│   └── add-question.js ← Question submission
└── supabase-schema.sql ← Run once in Supabase SQL Editor
```

---

## Setup (step by step)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your **Project URL** and **anon public key**  
   (Settings → API → Project URL / anon key)

### 2. Run the database schema

1. In Supabase Dashboard → **SQL Editor** → **New query**
2. Paste the contents of [`supabase-schema.sql`](supabase-schema.sql)
3. Click **Run**

This creates 3 tables (`profiles`, `questions_list`, `answers_list`), enables Row Level Security, and seeds the 3 original sample questions.

### 3. Disable email confirmation *(recommended for dev/demo)*

Dashboard → **Authentication** → **Settings** → uncheck **"Enable email confirmations"**

> Without this, users must confirm their email before the profile row can be created client-side.

### 4. Configure your credentials

Open [`js/config.js`](js/config.js) and replace the two placeholder values:

```js
export const SUPABASE_URL      = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

### 5. Deploy to GitHub Pages

```bash
# Create a new GitHub repo (e.g. "ishuz")
git init
git add .
git commit -m "Initial port of Ishuz to GitHub Pages + Supabase"
git remote add origin https://github.com/YOUR_USERNAME/ishuz.git
git push -u origin main
```

Then in the GitHub repo: **Settings → Pages → Source → main branch → / (root)** → Save.

Your site will be live at `https://YOUR_USERNAME.github.io/ishuz/`

### 6. Update Supabase redirect URL *(for password reset)*

Dashboard → **Authentication** → **URL Configuration** → add:

```
https://YOUR_USERNAME.github.io/ishuz/
```

---

## What was ported / changed

| Original PHP | New JS equivalent |
|---|---|
| `index.php` | `index.html` + `js/index.js` |
| `php/user_login.php` | `js/login.js` → `supabase.auth.signInWithPassword()` |
| `php/add_user.php` | `js/register.js` → `supabase.auth.signUp()` + profile insert |
| `php/insert_answer.php` | `js/index.js → handleAnswerSubmit()` |
| `php/get_random_question.php` | `supabase.from('questions_list').select(*)` |
| `php/get_statistics.php` | `supabase.from(...).select(..., { count: 'exact' })` |
| `php/get_user_statistics.php` | same, filtered by `user_id` |
| `php/add_question.php` | `js/add-question.js` |
| `php/logout.php` | `supabase.auth.signOut()` |
| `php/forget.php` | `forget.html` inline script → `supabase.auth.resetPasswordForEmail()` |
| MySQL `MD5(SALT.$pass)` | Supabase Auth (bcrypt, server-side) |
| `session_register()` | `supabase.auth.getSession()` |

### Bugs fixed from original

| Bug | Fix |
|---|---|
| SQL injection in all queries | Supabase SDK uses parameterized queries |
| MD5 passwords (broken hash) | bcrypt via Supabase Auth |
| Deprecated `mysql_*` API | No PHP at all |
| Inverted honeypot in `add_user.php` (`!= ''` should be `== ''`) | Fixed — honeypot field correctly rejects on non-empty |
| `session_register()` (removed PHP 5.4) | Replaced with Supabase session |

---

## Local testing

Because the JS uses ES modules (`type="module"`), you need a local HTTP server:

```bash
# Python (built-in)
python -m http.server 8080
# then open http://localhost:8080

# Node (npx)
npx serve .

# VS Code: use the Live Server extension
```

> Opening `index.html` directly as a `file://` URL won't work with ES modules.

---

## Free tier limits (Supabase)

| Resource | Free tier |
|---|---|
| Database | 500 MB |
| Monthly active users | 50,000 |
| API requests | Unlimited |
| Bandwidth | 5 GB |

More than enough for a demo / portfolio project.
