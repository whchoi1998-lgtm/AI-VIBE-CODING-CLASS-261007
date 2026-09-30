/* ==========================================================
   북톡 공통 스크립트 (모든 페이지에서 사용)
   - 헤더 / 모바일 메뉴 / 맨 위로 / 토스트 / 공통 렌더 함수
   ========================================================== */

/* ---------- 경로 / 데이터 도우미 ---------- */

// html 폴더 안의 페이지면 '../', 최상위(index.html)면 '' → 링크 경로를 페이지 위치와 무관하게 만듦
const ROOT = /\/html\/[^/]*$/.test(location.pathname) ? '../' : '';
const pagePath = file => `${ROOT}html/${file}`;

const findBook = id => BOOKS.find(b => b.id === id);
const categoryName = id => CATEGORIES.find(c => c.id === id)?.name || '';

// 제목 첫 글자 (한글은 초성, 쌍자음은 기본 자음으로: ㄲ→ㄱ, ㄸ→ㄷ ...)
const KO_INITIALS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const EN_INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CHO = ['ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function getInitial(title) {
  const ch = title.trim().charAt(0);
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code >= 0 && code < 11172) return CHO[Math.floor(code / 588)];
  return ch.toUpperCase();
}

// 첫 글자 필터 select 에 옵션 채우기
function fillInitialOptions(koGroup, enGroup) {
  koGroup.innerHTML = KO_INITIALS.map(c => `<option value="${c}">${c}</option>`).join('');
  enGroup.innerHTML = EN_INITIALS.map(c => `<option value="${c}">${c}</option>`).join('');
}

const BOOK_SORTERS = {
  rating: (a, b) => b.rating - a.rating,
  reviews: (a, b) => b.reviews - a.reviews,
  newest: (a, b) => b.date.localeCompare(a.date),
  title: (a, b) => a.title.localeCompare(b.title, 'ko')
};

/* ---------- 공통 렌더 함수 ---------- */

// HTML 특수문자 이스케이프
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// 별점 (0~5, 소수점 반영)
function starsHTML(rating, reviews) {
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  const count = typeof reviews === 'number'
    ? `<span class="stars__count">(${reviews.toLocaleString()})</span>` : '';
  return `
    <span class="stars" aria-label="별점 5점 만점에 ${rating}점">
      <span class="stars__bar" aria-hidden="true"><span class="stars__fill" style="width:${percent}%"></span></span>
      <span class="stars__score">${rating.toFixed(1)}</span>
      ${count}
    </span>`;
}

// 책 표지 (이미지가 준비되기 전까지 CSS 표지로 대체)
function coverHTML(book, extraClass = '') {
  const [c1, c2] = book.color;
  return `
    <div class="cover ${extraClass}" style="background:linear-gradient(160deg, ${c1}, ${c2})" aria-hidden="true">
      <span class="cover__deco"></span>
      <strong class="cover__title">${escapeHTML(book.title)}</strong>
      <span class="cover__author">${escapeHTML(book.author)}</span>
    </div>`;
}

// 도서 카드 (메인 · 책 목록 페이지 공용)
function bookCardHTML(b, i = 0) {
  return `
    <li class="book-card" style="animation-delay:${i * 40}ms">
      <div class="book-card__thumb">
        ${b.badge ? `<span class="book-card__badge">${b.badge}</span>` : ''}
        ${coverHTML(b)}
        <button type="button" class="book-card__preview" data-preview="${b.id}">미리보기</button>
      </div>
      <div class="book-card__body">
        <p class="book-card__cat">${categoryName(b.category)}</p>
        <h3 class="book-card__title"><a href="${pagePath('book-detail.html')}?id=${b.id}">${escapeHTML(b.title)}</a></h3>
        <p class="book-card__author">${escapeHTML(b.author)}</p>
        ${starsHTML(b.rating, b.reviews)}
      </div>
    </li>`;
}

// 토스트 알림
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-show'), 2400);
}

/* ---------- 미리보기 모달 (#previewModal 이 있는 페이지에서 사용) ---------- */
const preview = { book: null, page: 0, lastFocus: null };

function renderPreviewPage() {
  const { book, page } = preview;
  const pageEl = document.getElementById('previewPage');
  const total = book.pages.length;
  pageEl.innerHTML = book.pages[page].map(p => `<p>${escapeHTML(p)}</p>`).join('');
  pageEl.classList.remove('is-flip');
  void pageEl.offsetWidth; // 애니메이션 재시작
  pageEl.classList.add('is-flip');
  document.getElementById('pageNum').textContent = `${page + 1} / ${total}`;
  document.getElementById('pagePrev').disabled = page === 0;
  document.getElementById('pageNext').disabled = page === total - 1;
}

function openPreview(id) {
  const modal = document.getElementById('previewModal');
  const book = findBook(id);
  if (!modal || !book) return;
  Object.assign(preview, { book, page: 0, lastFocus: document.activeElement });

  document.getElementById('previewCover').innerHTML = coverHTML(book);
  document.getElementById('previewTitle').textContent = book.title;
  document.getElementById('previewAuthor').textContent = `${book.author} · ${categoryName(book.category)}`;
  document.getElementById('previewRating').innerHTML = starsHTML(book.rating, book.reviews);
  document.getElementById('previewChapter').textContent = book.chapter;
  modal.querySelector('.preview__side .btn').href = `${pagePath('book-detail.html')}?id=${book.id}`;
  renderPreviewPage();

  modal.hidden = false;
  document.body.classList.add('is-locked');
  modal.querySelector('.modal__close').focus();
}

function closePreview() {
  document.getElementById('previewModal').hidden = true;
  document.body.classList.remove('is-locked');
  preview.lastFocus?.focus();
}

function initPreviewModal() {
  const modal = document.getElementById('previewModal');
  if (!modal) return;
  const prev = document.getElementById('pagePrev');
  const next = document.getElementById('pageNext');

  prev.addEventListener('click', () => { if (preview.page > 0) { preview.page--; renderPreviewPage(); } });
  next.addEventListener('click', () => {
    if (preview.page < preview.book.pages.length - 1) { preview.page++; renderPreviewPage(); }
  });
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closePreview(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closePreview();
    if (e.key === 'ArrowLeft') prev.click();
    if (e.key === 'ArrowRight') next.click();
  });

  // 페이지 어디서든 data-preview 버튼을 누르면 미리보기 열기
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-preview]');
    if (btn) openPreview(Number(btn.dataset.preview));
  });
}

/* ---------- 헤더 / 메뉴 / 맨 위로 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initPreviewModal();

  const header = document.getElementById('header');
  const topBtn = document.getElementById('topBtn');
  const menuToggle = document.getElementById('menuToggle');
  const gnb = document.getElementById('gnb');

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 10);
    topBtn?.classList.toggle('is-show', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  topBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // 모바일 메뉴
  const closeMenu = () => {
    gnb?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', '메뉴 열기');
  };
  menuToggle?.addEventListener('click', () => {
    const open = !gnb.classList.contains('is-open');
    gnb.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  gnb?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 860) closeMenu(); });
});
