/* ==========================================================
   북톡 로그인 페이지 (html/login.html) 스크립트
   - 이메일 · 비밀번호 입력 검증, 비밀번호 보기
   - 이메일 기억하기 (이 브라우저에만 저장)
   - Supabase Auth 로 이메일 · 비밀번호 로그인
   - 헤더 도서 검색 → 책 목록 페이지로 이동
   ========================================================== */

/* ---------- Supabase 연결 정보 ----------
   js/support.js 와 같은 값을 넣어 주세요. (Project Settings › API)
   - 로그인할 회원은 Supabase 대시보드 › Authentication › Users 에서 만들 수 있어요.
     ※ service_role(secret) 키는 절대 넣지 마세요. */
const SUPABASE_URL = 'https://pnvvtrwmmgjrgfxbwftw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xf9YLSAZCZAHM9E2SRsLOQ_04KNQHi7';
const REMEMBER_KEY = 'booktalk-login-email';

document.addEventListener('DOMContentLoaded', async () => {
  // 공용 Client(js/supabase-client.js)가 있으면 그것을 써서 로그인 상태를 모든 페이지와 공유
  const db = window.supabaseClient || (SUPABASE_URL && SUPABASE_KEY && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null);

  // 로그인 후 돌아갈 페이지 (?next=mypage.html), 다른 사이트 주소는 받지 않음
  const nextParam = new URLSearchParams(location.search).get('next') || '';
  const nextPage = /^[\w-]+\.html$/.test(nextParam) ? nextParam : '../index.html';

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const pwInput = document.getElementById('loginPassword');
  const remember = document.getElementById('loginRemember');
  const submitBtn = document.getElementById('loginSubmit');
  const statusEl = document.getElementById('loginStatus');

  // 기억해 둔 이메일 채우기
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { emailInput.value = saved; remember.checked = true; pwInput.focus(); }
    else emailInput.focus();
  } catch (e) { emailInput.focus(); }

  function setError(input, msg) {
    const field = input.closest('.field');
    field.classList.toggle('is-error', !!msg);
    field.querySelector('.field__error').textContent = msg;
    return !msg;
  }

  function setStatus(type, text) {
    statusEl.hidden = !text;
    statusEl.textContent = text;
    statusEl.classList.toggle('is-success', type === 'success');
    statusEl.classList.toggle('is-error', type === 'error');
  }

  function validate() {
    const email = emailInput.value.trim();
    const pw = pwInput.value;
    const results = [
      setError(emailInput, !email ? '이메일을 입력해 주세요.'
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : '이메일 형식을 확인해 주세요.'),
      setError(pwInput, !pw ? '비밀번호를 입력해 주세요.'
        : pw.length >= 8 ? '' : '비밀번호는 8자 이상이에요.')
    ];
    return results.every(Boolean);
  }

  // 입력하면 해당 칸의 오류 문구는 바로 지움
  form.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('is-error')) setError(e.target, '');
  });

  // 비밀번호 보기 / 숨기기
  const pwToggle = document.getElementById('pwToggle');
  pwToggle.addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    pwToggle.setAttribute('aria-pressed', String(show));
    pwToggle.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
  });

  // 아직 없는 기능 (비밀번호 찾기 · 회원가입 · 카카오 로그인)
  form.addEventListener('click', e => {
    const btn = e.target.closest('[data-soon]');
    if (btn) showToast(`${btn.dataset.soon} 기능은 준비 중이에요.`);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus('', '');
    if (!validate()) {
      form.querySelector('.is-error input')?.focus();
      return;
    }

    const email = emailInput.value.trim();
    try {
      if (remember.checked) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (err) { /* 저장이 막힌 환경에서도 로그인은 계속 */ }

    if (!db) {
      setStatus('error', '로그인 연결 정보가 아직 없어요. js/login.js 의 SUPABASE_URL · SUPABASE_KEY 를 입력해 주세요.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '로그인 중…';
    const { error } = await db.auth.signInWithPassword({ email, password: pwInput.value });
    submitBtn.disabled = false;
    submitBtn.textContent = '로그인';

    if (error) {
      console.error('로그인 실패:', error);
      setStatus('error', /not confirmed/i.test(error.message)
        ? '이메일 인증이 아직 안 됐어요. 메일함의 인증 링크를 먼저 눌러 주세요.'
        : '이메일 또는 비밀번호가 맞지 않아요.');
      pwInput.select();
      return;
    }
    setStatus('success', '로그인됐어요. 잠시 후 이동할게요.');
    showToast('환영해요!');
    setTimeout(() => { location.href = nextPage; }, 900);
  });

  /* ---------- 헤더 검색: 책 목록 페이지에서 결과 보기 ---------- */
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
  });

  // 이미 로그인한 상태면 바로 이동
  if (db) {
    const { data: { session } } = await db.auth.getSession();
    if (session) location.replace(nextParam ? nextPage : 'mypage.html');
  }
});
