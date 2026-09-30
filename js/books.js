/* ==========================================================
   북톡 책 목록 페이지 (html/books.html) 스크립트
   1. 책 목록 : 분야 탭 / 첫 글자 · 별점 필터 / 검색 / 정렬 / 보기 방식 / 페이지 번호
   2. 새 책 등록 안내 : 최근 등록 도서 / 등록 신청 양식 / 내 신청 현황
   (도서 카드 · 미리보기 모달은 common.js 공용)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ======================================================
     0. 페이지 상단 통계
     ====================================================== */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysAgo = dateStr => Math.floor((today - new Date(dateStr + 'T00:00:00')) / 86400000);
  const isNew = b => daysAgo(b.date) <= 30;

  const avg = BOOKS.reduce((sum, b) => sum + b.rating, 0) / BOOKS.length;
  document.getElementById('pageStats').innerHTML = `
    <div><dt>전체 도서</dt><dd>${BOOKS.length}<small>권</small></dd></div>
    <div><dt>최근 30일 새 책</dt><dd>${BOOKS.filter(isNew).length}<small>권</small></dd></div>
    <div><dt>평균 별점</dt><dd>${avg.toFixed(1)}<small>점</small></dd></div>`;

  /* ======================================================
     1. 책 목록
     ====================================================== */
  const tabsEl = document.getElementById('categoryTabs');
  const gridEl = document.getElementById('bookGrid');
  const resultEl = document.getElementById('bookResult');
  const pagerEl = document.getElementById('pagination');
  const sortEl = document.getElementById('sortSelect');
  const initialSelect = document.getElementById('initialSelect');
  const ratingSelect = document.getElementById('ratingSelect');
  const resetBtn = document.getElementById('resetBtn');
  const searchInput = document.getElementById('searchInput');
  const listSection = document.getElementById('list');

  // 주소의 ?cat=novel&q=검색어 를 읽어 처음 상태로 사용 (메인의 '전체 책 보기'에서 넘어올 때)
  const params = new URLSearchParams(location.search);
  const validCat = CATEGORIES.some(c => c.id === params.get('cat')) ? params.get('cat') : 'all';

  const state = {
    category: validCat,
    keyword: params.get('q') || '',
    initial: '',
    minRating: 0,
    sort: 'rating',
    view: 'grid',
    page: 1
  };

  tabsEl.innerHTML = CATEGORIES.map(c => `
    <button type="button" class="tab" role="tab" data-cat="${c.id}">${c.name}</button>`).join('');
  fillInitialOptions(document.getElementById('initialKo'), document.getElementById('initialEn'));
  searchInput.value = state.keyword;

  // 한 페이지 권수: 바둑판은 두 줄(화면 열 수 × 2), 목록 보기는 8권
  const perPage = () => {
    if (state.view === 'list') return 8;
    const cols = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length || 5;
    return cols * 2;
  };

  function getFilteredBooks() {
    const kw = state.keyword.trim().toLowerCase();
    return BOOKS.filter(b =>
      (state.category === 'all' || b.category === state.category) &&
      (!state.initial || getInitial(b.title) === state.initial) &&
      b.rating >= state.minRating &&
      (!kw || b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw))
    ).sort(BOOK_SORTERS[state.sort]);
  }

  function bookRowHTML(b, i) {
    return `
      <li class="book-row" style="animation-delay:${i * 40}ms">
        ${coverHTML(b)}
        <div>
          <p class="book-row__cat">${categoryName(b.category)}</p>
          <h3 class="book-row__title"><a href="book-detail.html?id=${b.id}">${escapeHTML(b.title)}</a></h3>
          <p class="book-row__meta">${escapeHTML(b.author)} · ${b.date.replace(/-/g, '.')} 등록</p>
          <p class="book-row__desc">${escapeHTML(b.desc)}</p>
        </div>
        <div class="book-row__side">
          ${isNew(b) ? '<span class="book-row__new">NEW</span>' : ''}
          ${starsHTML(b.rating, b.reviews)}
          <button type="button" class="btn btn--line btn--sm" data-preview="${b.id}">미리보기</button>
        </div>
      </li>`;
  }

  function render() {
    // 탭 표시
    tabsEl.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.cat === state.category;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    initialSelect.classList.toggle('is-active', !!state.initial);
    ratingSelect.classList.toggle('is-active', state.minRating > 0);

    const list = getFilteredBooks();
    const size = perPage();
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    state.page = Math.min(state.page, totalPages);
    const shown = list.slice((state.page - 1) * size, state.page * size);

    // 결과 문구
    const parts = [state.keyword
      ? `'<strong>${escapeHTML(state.keyword)}</strong>' 검색 결과`
      : `<strong>${categoryName(state.category)}</strong>`];
    if (state.initial) parts.push(`'<strong>${state.initial}</strong>'로 시작`);
    if (state.minRating) parts.push(`별점 <strong>${state.minRating.toFixed(1)}</strong> 이상`);
    resultEl.innerHTML = `${parts.join(' · ')} · 총 ${list.length}권`;

    const filtered = state.category !== 'all' || state.keyword || state.initial || state.minRating;
    resetBtn.hidden = !filtered;

    // 목록
    gridEl.classList.toggle('is-list', state.view === 'list');
    if (!list.length) {
      gridEl.innerHTML = `
        <li class="books__empty">
          조건에 맞는 도서가 없어요.<br>
          찾는 책이 북톡에 없다면 <a href="#register" style="color:var(--color-primary);text-decoration:underline">새 책 등록을 신청</a>해 주세요.
        </li>`;
    } else {
      gridEl.innerHTML = shown.map(state.view === 'list' ? bookRowHTML : bookCardHTML).join('');
    }

    renderPager(totalPages);
    syncURL();
  }

  function renderPager(totalPages) {
    if (totalPages <= 1) { pagerEl.innerHTML = ''; return; }
    let html = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="이전 페이지">&lsaquo;</button>`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button type="button" data-page="${p}" ${p === state.page ? 'aria-current="page"' : ''}>${p}</button>`;
    }
    html += `<button type="button" data-page="${state.page + 1}" ${state.page === totalPages ? 'disabled' : ''} aria-label="다음 페이지">&rsaquo;</button>`;
    pagerEl.innerHTML = html;
  }

  // 현재 분야·검색어를 주소에 반영 (새로고침·공유해도 같은 목록)
  function syncURL() {
    const p = new URLSearchParams();
    if (state.category !== 'all') p.set('cat', state.category);
    if (state.keyword) p.set('q', state.keyword);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
  }

  function scrollToList() {
    const headerH = document.getElementById('header').offsetHeight;
    const top = listSection.getBoundingClientRect().top + window.scrollY - headerH;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }

  // 조건 변경 → 1페이지부터 다시
  function update(changes) {
    Object.assign(state, changes, { page: 1 });
    render();
  }

  tabsEl.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) update({ category: tab.dataset.cat });
  });
  tabsEl.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...tabsEl.querySelectorAll('.tab')];
    const cur = tabs.indexOf(document.activeElement);
    const next = tabs[(cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });

  initialSelect.addEventListener('change', () => update({ initial: initialSelect.value }));
  ratingSelect.addEventListener('change', () => update({ minRating: Number(ratingSelect.value) }));
  sortEl.addEventListener('change', () => update({ sort: sortEl.value }));

  resetBtn.addEventListener('click', () => {
    initialSelect.value = '';
    ratingSelect.value = '0';
    searchInput.value = '';
    update({ category: 'all', keyword: '', initial: '', minRating: 0 });
  });

  document.querySelector('.view-toggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    document.querySelectorAll('.view-toggle [data-view]').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));
    update({ view: btn.dataset.view });
  });

  pagerEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.page);
    render();
    scrollToList();
  });

  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    update({ keyword: searchInput.value.trim(), category: 'all' });
    scrollToList();
  });

  // 화면 폭이 바뀌어 열 수가 달라지면 페이지 크기 다시 계산
  let lastSize = perPage();
  window.addEventListener('resize', () => {
    const size = perPage();
    if (size !== lastSize) { lastSize = size; render(); }
  });

  render();

  /* ======================================================
     2. 새 책 등록 안내
     ====================================================== */

  /* --- 최근 등록된 새 책 --- */
  const newest = [...BOOKS].sort(BOOK_SORTERS.newest).slice(0, 5);
  document.getElementById('newBooks').innerHTML = newest.map(b => `
    <li data-preview="${b.id}" tabindex="0" role="button" aria-label="${escapeHTML(b.title)} 미리보기">
      ${coverHTML(b)}
      <div>
        <p class="new-books__title">${escapeHTML(b.title)}</p>
        <p class="new-books__author">${escapeHTML(b.author)} · ${categoryName(b.category)}</p>
      </div>
      <span class="new-books__date">${b.date.slice(5).replace('-', '.')} 등록</span>
    </li>`).join('');

  document.getElementById('newBooks').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-preview]')) {
      e.preventDefault();
      openPreview(Number(e.target.dataset.preview));
    }
  });

  document.getElementById('showNewest').addEventListener('click', () => {
    sortEl.value = 'newest';
    update({ sort: 'newest' });
    listSection.scrollIntoView({ behavior: 'smooth' });
  });

  /* --- 등록 신청 양식 --- */
  const form = document.getElementById('regForm');
  const regCategory = document.getElementById('regCategory');
  const reason = document.getElementById('regReason');

  regCategory.insertAdjacentHTML('beforeend', CATEGORIES
    .filter(c => c.id !== 'all')
    .map(c => `<option value="${c.id}">${c.name}</option>`).join(''));

  reason.addEventListener('input', () => {
    document.getElementById('reasonCount').textContent = reason.value.length;
  });

  function setError(input, message) {
    const field = input.closest('.field');
    field.classList.toggle('is-error', !!message);
    field.querySelector('.field__error').textContent = message;
    return !message;
  }

  // 이미 북톡에 있는 책인지 (제목 공백 무시 비교)
  const normalize = s => s.replace(/\s+/g, '').toLowerCase();
  const alreadyListed = title => BOOKS.some(b => normalize(b.title) === normalize(title));

  function validate() {
    const f = form.elements;
    const title = f.title.value.trim();
    const isbn = f.isbn.value.replace(/-/g, '').trim();
    const email = f.email.value.trim();

    const results = [
      setError(f.title, !title ? '도서명을 입력해 주세요.'
        : alreadyListed(title) ? '이미 북톡에 등록된 책이에요. 목록에서 검색해 보세요.' : ''),
      setError(f.author, f.author.value.trim() ? '' : '저자를 입력해 주세요.'),
      setError(f.isbn, !isbn || /^\d{13}$/.test(isbn) ? '' : 'ISBN은 숫자 13자리로 입력해 주세요.'),
      setError(f.category, f.category.value ? '' : '분야를 선택해 주세요.'),
      setError(f.email, !email ? '알림 받을 이메일을 입력해 주세요.'
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : '이메일 형식을 확인해 주세요.')
    ];
    const agreeOk = f.agree.checked;
    document.getElementById('agreeError').textContent = agreeOk ? '' : '이메일 수집에 동의해 주세요.';
    return results.every(Boolean) && agreeOk;
  }

  // 입력하면 해당 칸의 오류 문구는 바로 지움
  form.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('is-error')) setError(e.target, '');
    if (e.target.name === 'agree' && e.target.checked) document.getElementById('agreeError').textContent = '';
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) {
      form.querySelector('.is-error input, .is-error select, #regAgree:not(:checked)')?.focus();
      return;
    }
    const f = form.elements;
    requests.unshift({
      id: Date.now(),
      title: f.title.value.trim(),
      author: f.author.value.trim(),
      category: f.category.value,
      date: new Date().toISOString().slice(0, 10)
    });
    saveRequests();
    renderRequests();
    form.reset();
    document.getElementById('reasonCount').textContent = '0';
    showToast('등록 신청이 접수됐어요. 검토 후 이메일로 알려드릴게요!');
    document.getElementById('myRequests').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* --- 내 신청 현황 (이 브라우저에만 저장되는 샘플 기능) --- */
  const STORAGE_KEY = 'booktalk-book-requests';
  let requests = [];
  try { requests = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { requests = []; }

  function saveRequests() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(requests)); } catch { /* 저장 불가 환경은 무시 */ }
  }

  function renderRequests() {
    const box = document.getElementById('myRequests');
    box.hidden = !requests.length;
    document.getElementById('requestList').innerHTML = requests.map(r => `
      <li>
        <div>
          <strong>${escapeHTML(r.title)}</strong>
          <span class="request-list__meta"> · ${escapeHTML(r.author)} · ${categoryName(r.category)} · ${r.date.replace(/-/g, '.')} 신청</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="request-list__status">검토 중</span>
          <button type="button" class="request-list__cancel" data-cancel="${r.id}">신청 취소</button>
        </div>
      </li>`).join('');
  }

  document.getElementById('requestList').addEventListener('click', e => {
    const btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    requests = requests.filter(r => r.id !== Number(btn.dataset.cancel));
    saveRequests();
    renderRequests();
    showToast('신청을 취소했어요.');
  });

  renderRequests();
});
