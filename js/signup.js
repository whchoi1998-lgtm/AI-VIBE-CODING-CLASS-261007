/* ==========================================================
   북톡 회원가입 페이지 (html/signup.html) 스크립트
   - 이메일 · 비밀번호 · 닉네임 · 약관 동의 검증
   - Supabase Auth 로 회원가입 (js/supabase-client.js 의 공용 Client 사용)
   - 닉네임 · 관심 분야 · 소식 받기는 가입 정보(user_metadata)로 함께 보냄
     → Supabase 의 트리거가 profiles 테이블에 자동으로 저장 (md/supabase-auth.md 참고)
   - 헤더 도서 검색 → 책 목록 페이지로 이동
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const db = window.supabaseClient;
  const form = document.getElementById('signupForm');
  const f = form.elements;
  const submitBtn = document.getElementById('signupSubmit');
  const statusEl = document.getElementById('signupStatus');
  const agreeAll = document.getElementById('suAgreeAll');
  const agrees = [...form.querySelectorAll('[data-agree]')];

  document.getElementById('suCategories').innerHTML = categoryChipsHTML('categories');
  f.email.focus();

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
    const email = f.email.value.trim();
    const nick = f.nickname.value.trim();
    const results = [
      setError(f.email, !email ? '이메일을 입력해 주세요.' : EMAIL_RE.test(email) ? '' : '이메일 형식을 확인해 주세요.'),
      setError(f.password, passwordProblem(f.password.value)),
      setError(f.password2, !f.password2.value ? '비밀번호를 한 번 더 입력해 주세요.'
        : f.password2.value === f.password.value ? '' : '비밀번호가 서로 달라요.'),
      setError(f.nickname, !nick ? '닉네임을 입력해 주세요.'
        : nick.length >= 2 && nick.length <= 12 ? '' : '닉네임은 2~12자로 정해 주세요.')
    ];
    const agreeOk = f.agreeTerms.checked && f.agreePrivacy.checked;
    document.getElementById('agreeError').textContent = agreeOk ? '' : '필수 약관에 동의해 주세요.';
    return results.every(Boolean) && agreeOk;
  }

  // 입력하면 해당 칸의 오류 문구는 바로 지움
  form.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('is-error')) setError(e.target, '');
  });

  // 약관 전체 동의 ↔ 개별 동의
  agreeAll.addEventListener('change', () => {
    agrees.forEach(cb => { cb.checked = agreeAll.checked; });
    if (agreeAll.checked) document.getElementById('agreeError').textContent = '';
  });
  form.addEventListener('change', e => {
    if (!e.target.matches('[data-agree]')) return;
    agreeAll.checked = agrees.every(cb => cb.checked);
    if (f.agreeTerms.checked && f.agreePrivacy.checked) document.getElementById('agreeError').textContent = '';
  });

  // 비밀번호 보기 / 숨기기
  form.addEventListener('click', e => {
    const btn = e.target.closest('[data-pw-toggle]');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.pwToggle);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus('', '');
    if (!validate()) {
      form.querySelector('.is-error input')?.focus();
      return;
    }
    if (!db) {
      setStatus('error', 'Supabase 연결 정보가 아직 없어요. js/supabase-client.js 를 확인해 주세요.');
      return;
    }

    const email = f.email.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = '가입하는 중…';

    const { data, error } = await db.auth.signUp({
      email,
      password: f.password.value,
      options: {
        // profiles 테이블로 옮겨 저장될 정보
        data: {
          nickname: f.nickname.value.trim(),
          favorite_categories: [...form.querySelectorAll('input[name="categories"]:checked')].map(cb => cb.value),
          marketing_agreed: f.agreeMarketing.checked
        },
        // 인증 메일 링크를 누르면 돌아올 주소 (웹 서버로 열었을 때만)
        ...(location.protocol.startsWith('http') && { emailRedirectTo: new URL('login.html', location.href).href })
      }
    });

    submitBtn.disabled = false;
    submitBtn.textContent = '가입하기';

    if (error) {
      console.error('회원가입 실패:', error);
      setStatus('error', signupErrorMessage(error));
      return;
    }
    // 이미 가입된 이메일 (이메일 인증을 켜 두면 오류 대신 빈 identities 로 옴)
    if (data.user && data.user.identities?.length === 0) {
      setError(f.email, '이미 가입된 이메일이에요. 로그인해 주세요.');
      f.email.focus();
      return;
    }

    if (data.session) {
      // 이메일 인증을 끈 프로젝트: 바로 로그인된 상태
      showToast('가입을 환영해요!');
      setTimeout(() => { location.href = 'mypage.html'; }, 800);
    } else {
      // 이메일 인증이 필요한 경우: 안내 화면으로 전환
      document.getElementById('doneEmail').textContent = email;
      form.hidden = true;
      document.getElementById('signupDone').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  function signupErrorMessage(error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.';
    if (msg.includes('password')) return '비밀번호가 Supabase 보안 기준에 맞지 않아요. 더 길고 복잡하게 정해 주세요.';
    if (error.status === 429 || msg.includes('rate limit')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    if (msg.includes('database error')) return '회원 정보를 저장하지 못했어요. profiles 테이블 설정(md/supabase-auth.md)을 확인해 주세요.';
    return '가입하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }

  /* ---------- 헤더 검색: 책 목록 페이지에서 결과 보기 ---------- */
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
  });

  // 이미 로그인한 상태면 마이페이지로
  if (db) {
    const { data: { session } } = await db.auth.getSession();
    if (session) location.replace('mypage.html');
  }
});
