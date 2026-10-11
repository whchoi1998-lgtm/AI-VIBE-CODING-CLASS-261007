/* ==========================================================
   북톡 문의하기 페이지 (html/support.html) 스크립트
   - 문의 양식 검증
   - 문의 내용을 Supabase Database(inquiries 테이블)에 저장
   - 헤더 도서 검색 → 책 목록 페이지로 이동
   (테이블 만드는 방법은 md/supabase.md 참고)
   ========================================================== */

/* ---------- Supabase 연결 정보 ----------
   Supabase 대시보드 › Project Settings › API 에서 복사해 넣어 주세요.
   - SUPABASE_URL : Project URL (예: https://abcdefgh.supabase.co)
   - SUPABASE_KEY : anon public 키 (또는 publishable 키) — 화면에 공개돼도 되는 키만 넣기
     ※ service_role(secret) 키는 절대 넣지 마세요. */
const SUPABASE_URL = '';
const SUPABASE_KEY = '';
const INQUIRY_TABLE = 'inquiries';

document.addEventListener('DOMContentLoaded', () => {
  // 연결 정보가 있고 라이브러리가 불러와졌을 때만 Supabase 사용
  const db = SUPABASE_URL && SUPABASE_KEY && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  const form = document.getElementById('inquiryForm');
  const message = document.getElementById('inqMessage');
  const submitBtn = document.getElementById('inquirySubmit');
  const statusEl = document.getElementById('inquiryStatus');

  message.addEventListener('input', () => {
    document.getElementById('messageCount').textContent = message.value.length;
  });

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
    const f = form.elements;
    const email = f.email.value.trim();
    const results = [
      setError(f.name, f.name.value.trim() ? '' : '이름을 입력해 주세요.'),
      setError(f.category, f.category.value ? '' : '문의 종류를 선택해 주세요.'),
      setError(f.email, !email ? '답변 받을 이메일을 입력해 주세요.'
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : '이메일 형식을 확인해 주세요.'),
      setError(f.title, f.title.value.trim() ? '' : '제목을 입력해 주세요.'),
      setError(f.message, f.message.value.trim().length >= 10 ? '' : '문의 내용을 10자 이상 입력해 주세요.')
    ];
    const agreeOk = f.agree.checked;
    document.getElementById('agreeError').textContent = agreeOk ? '' : '개인정보 수집에 동의해 주세요.';
    return results.every(Boolean) && agreeOk;
  }

  // 입력하면 해당 칸의 오류 문구는 바로 지움
  form.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('is-error')) setError(e.target, '');
    if (e.target.name === 'agree' && e.target.checked) document.getElementById('agreeError').textContent = '';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus('', '');
    if (!validate()) {
      form.querySelector('.is-error input, .is-error select, .is-error textarea, #inqAgree:not(:checked)')?.focus();
      return;
    }
    if (!db) {
      setStatus('error', 'Database 연결 정보가 아직 없어요. js/support.js 의 SUPABASE_URL · SUPABASE_KEY 를 입력해 주세요.');
      return;
    }

    const f = form.elements;
    submitBtn.disabled = true;
    submitBtn.textContent = '보내는 중…';

    const { error } = await db.from(INQUIRY_TABLE).insert({
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      category: f.category.value,
      title: f.title.value.trim(),
      message: f.message.value.trim(),
      agreed: true
    });

    submitBtn.disabled = false;
    submitBtn.textContent = '문의 보내기';

    if (error) {
      console.error('문의 저장 실패:', error);
      setStatus('error', '문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    form.reset();
    document.getElementById('messageCount').textContent = '0';
    setStatus('success', '문의가 접수됐어요. 영업일 기준 2일 안에 이메일로 답변드릴게요.');
    showToast('문의가 접수됐어요!');
  });

  /* ---------- 헤더 검색: 책 목록 페이지에서 결과 보기 ---------- */
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
  });
});
