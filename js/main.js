/* ==========================================================
   북톡 메인 페이지 (index.html) 스크립트
   - 추천 도서 슬라이더 / 분야 탭 + 도서 목록 / 베스트
   - 독서모임 / 검색 / 뉴스레터
   (도서 카드·미리보기 모달은 common.js 공용)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ======================================================
     1. 추천 도서 슬라이더
     ====================================================== */
  const heroBooks = [5, 1, 3, 11].map(findBook);
  const hero = document.querySelector('.hero');
  const heroTitle = document.getElementById('heroTitle');
  const heroAuthor = document.getElementById('heroAuthor');
  const heroDesc = document.getElementById('heroDesc');
  const heroVisual = document.getElementById('heroVisual');
  const heroDots = document.getElementById('heroDots');
  let heroIndex = 0;
  let heroTimer;

  heroDots.innerHTML = heroBooks.map((b, i) =>
    `<button type="button" aria-label="${i + 1}번째 추천 도서"></button>`).join('');

  function renderHero(index) {
    heroIndex = (index + heroBooks.length) % heroBooks.length;
    const book = heroBooks[heroIndex];
    const next = heroBooks[(heroIndex + 1) % heroBooks.length];

    hero.classList.add('is-changing');
    setTimeout(() => {
      heroTitle.textContent = book.title;
      heroAuthor.textContent = `${book.author} 지음 · ★ ${book.rating.toFixed(1)}`;
      heroDesc.textContent = book.desc;
      hero.classList.remove('is-changing');
    }, 200);

    heroVisual.innerHTML = coverHTML(next, 'cover--back') + coverHTML(book, 'cover--front');
    document.getElementById('heroDetail').href = `html/book-detail.html?id=${book.id}`;
    heroDots.querySelectorAll('button').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === heroIndex);
      dot.setAttribute('aria-current', i === heroIndex ? 'true' : 'false');
    });
  }

  function startHeroAuto() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => renderHero(heroIndex + 1), 6000);
  }

  document.getElementById('heroPrev').addEventListener('click', () => { renderHero(heroIndex - 1); startHeroAuto(); });
  document.getElementById('heroNext').addEventListener('click', () => { renderHero(heroIndex + 1); startHeroAuto(); });
  heroDots.addEventListener('click', e => {
    const dots = [...heroDots.children];
    const i = dots.indexOf(e.target);
    if (i > -1) { renderHero(i); startHeroAuto(); }
  });
  document.getElementById('heroPreview').addEventListener('click', () => openPreview(heroBooks[heroIndex].id));

  renderHero(0);
  startHeroAuto();

  /* ======================================================
     2. 분야 탭 + 도서 목록 (별점)
     ====================================================== */
  const tabsEl = document.getElementById('categoryTabs');
  const gridEl = document.getElementById('bookGrid');
  const resultEl = document.getElementById('bookResult');
  const sortEl = document.getElementById('sortSelect');
  const moreBtn = document.getElementById('moreBtn');
  const allBooksLink = document.getElementById('allBooksLink');
  // 처음에 보여줄 권수: 현재 화면 기준 두 줄 (5열이면 10권, 2열이면 4권)
  const firstPageSize = () => getGridColumns() * 2;

  const state = { category: 'all', sort: 'rating', keyword: '', initial: '', visible: firstPageSize() };

  /* --- 제목 첫 글자 필터 (한글 초성 / 알파벳) --- */
  const initialSelect = document.getElementById('initialSelect');
  fillInitialOptions(document.getElementById('initialKo'), document.getElementById('initialEn'));

  initialSelect.addEventListener('change', () => {
    state.initial = initialSelect.value;
    state.visible = firstPageSize();
    initialSelect.classList.toggle('is-active', !!state.initial);
    renderBooks();
  });

  tabsEl.innerHTML = CATEGORIES.map(c => `
    <button type="button" class="tab" role="tab" data-cat="${c.id}"
      aria-selected="${c.id === 'all'}">${c.name}</button>`).join('');

  function getFilteredBooks() {
    const kw = state.keyword.trim().toLowerCase();
    const list = BOOKS.filter(b =>
      (state.category === 'all' || b.category === state.category) &&
      (!state.initial || getInitial(b.title) === state.initial) &&
      (!kw || b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw))
    );
    return list.sort(BOOK_SORTERS[state.sort]);
  }

  // 현재 화면에서 한 줄에 보이는 카드 수 (반응형 4 / 3 / 2열)
  function getGridColumns() {
    return getComputedStyle(gridEl).gridTemplateColumns.split(' ').length || 4;
  }

  // 목록 전체를 새로 그리기 (탭·정렬·검색이 바뀔 때)
  function renderBooks() {
    const list = getFilteredBooks();

    const label = state.keyword
      ? `'<strong>${escapeHTML(state.keyword)}</strong>' 검색 결과`
      : `<strong>${categoryName(state.category)}</strong>`;
    const initialLabel = state.initial ? ` · '<strong>${state.initial}</strong>'로 시작하는 책` : '';
    resultEl.innerHTML = `${label}${initialLabel} · 총 ${list.length}권`;

    if (!list.length) {
      gridEl.innerHTML = `<li class="books__empty">조건에 맞는 도서가 없어요. 다른 분야나 검색어로 찾아보세요.</li>`;
    } else {
      gridEl.innerHTML = list.slice(0, state.visible).map(bookCardHTML).join('');
    }
    moreBtn.hidden = list.length <= state.visible;
  }

  // 더 보기: 기존 카드는 그대로 두고 아래에 한 줄만 이어 붙이기
  function appendBooks() {
    const list = getFilteredBooks();
    const from = state.visible;
    state.visible += getGridColumns();
    gridEl.insertAdjacentHTML('beforeend',
      list.slice(from, state.visible).map(bookCardHTML).join(''));
    moreBtn.hidden = list.length <= state.visible;
    revealBest(gridEl.children[from]);
  }

  // 새 줄이 추가된 뒤, 화면 아래쪽에 '이번 주 베스트' 제목까지 보이도록 스크롤
  // (단, 새로 나온 줄의 윗부분이 헤더 뒤로 가려지지 않는 선까지만)
  function revealBest(firstNewCard) {
    const title = document.querySelector('#best .section__head');
    const headerH = document.getElementById('header').offsetHeight;
    const titleBottom = title.getBoundingClientRect().bottom + window.scrollY;
    let target = titleBottom + 24 - window.innerHeight;
    if (firstNewCard) {
      const rowTop = firstNewCard.getBoundingClientRect().top + window.scrollY;
      target = Math.min(target, rowTop - headerH - 16);
    }
    if (target > window.scrollY) window.scrollTo({ top: target, behavior: 'smooth' });
  }

  tabsEl.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    selectTab(tab.dataset.cat);
    state.keyword = '';
    searchInput.value = '';
    renderBooks();
  });

  // 탭 키보드 이동 (←, →)
  tabsEl.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...tabsEl.querySelectorAll('.tab')];
    const cur = tabs.indexOf(document.activeElement);
    const next = tabs[(cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });

  function selectTab(cat) {
    state.category = cat;
    state.visible = firstPageSize();
    tabsEl.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.cat === cat;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    // '전체 책 보기'는 지금 고른 분야를 그대로 들고 책 목록 페이지로 이동
    allBooksLink.href = cat === 'all' ? 'html/books.html' : `html/books.html?cat=${cat}`;
  }

  sortEl.addEventListener('change', () => {
    state.sort = sortEl.value;
    renderBooks();
  });

  moreBtn.addEventListener('click', appendBooks);

  selectTab('all');
  renderBooks();

  /* ======================================================
     3. 헤더 검색
     ====================================================== */
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    state.keyword = searchInput.value.trim();
    selectTab('all');
    renderBooks();
    document.getElementById('books').scrollIntoView({ behavior: 'smooth' });
  });

  /* ======================================================
     4. 이번 주 베스트 (리뷰 수 × 별점 기준)
     ====================================================== */
  const bestList = document.getElementById('bestList');
  const bestPrev = document.getElementById('bestPrev');
  const bestNext = document.getElementById('bestNext');
  const best = [...BOOKS].sort((a, b) => b.reviews * b.rating - a.reviews * a.rating).slice(0, 10);

  bestList.innerHTML = best.map((b, i) => `
    <li class="best-item" data-preview="${b.id}" tabindex="0" role="button" aria-label="${escapeHTML(b.title)} 미리보기">
      <span class="best-item__rank">${i + 1}</span>
      ${coverHTML(b)}
      <div>
        <p class="best-item__title">${escapeHTML(b.title)}</p>
        <p class="best-item__author">${escapeHTML(b.author)}</p>
      </div>
      ${starsHTML(b.rating)}
    </li>`).join('');

  // (클릭 시 미리보기는 common.js 에서 처리 — 여기서는 키보드 Enter/Space만)
  bestList.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-preview]')) {
      e.preventDefault();
      openPreview(Number(e.target.dataset.preview));
    }
  });

  // 좌우 버튼: 보이는 너비만큼 넘기기, 끝에 닿으면 버튼 숨김
  function updateBestButtons() {
    const max = bestList.scrollWidth - bestList.clientWidth;
    bestPrev.disabled = bestList.scrollLeft <= 1;
    bestNext.disabled = bestList.scrollLeft >= max - 1;
  }
  bestPrev.addEventListener('click', () => bestList.scrollBy({ left: -bestList.clientWidth }));
  bestNext.addEventListener('click', () => bestList.scrollBy({ left: bestList.clientWidth }));
  bestList.addEventListener('scroll', updateBestButtons, { passive: true });
  window.addEventListener('resize', updateBestButtons);
  updateBestButtons();

  /* ======================================================
     5. 독서모임 안내
     ====================================================== */
  // 메인에는 3개만 소개 (전체는 독서모임 페이지)
  const clubGrid = document.getElementById('clubGrid');
  const renderClubs = () => { clubGrid.innerHTML = CLUBS.slice(0, 3).map(clubCardHTML).join(''); };

  clubGrid.addEventListener('click', e => {
    const btn = e.target.closest('[data-club]');
    if (!btn || btn.disabled) return;
    showToast(toggleClubJoin(Number(btn.dataset.club)));
    renderClubs();
  });

  renderClubs();

  /* ======================================================
     6. 뉴스레터 구독
     ====================================================== */
  document.getElementById('newsletterForm').addEventListener('submit', e => {
    e.preventDefault();
    e.target.reset();
    showToast('구독 신청이 완료됐어요. 금요일에 만나요!');
  });
});
