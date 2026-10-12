/* ==========================================================
   북톡 분야별 도서 페이지 (html/category.html) 스크립트
   - 분야 카드 (권수 · 평균 별점 · 대표 표지)
   - 분야마다 별점 높은 책 5권 + '이 분야 전체 보기'
   (도서 카드 · 미리보기 모달은 common.js 공용)
   ========================================================== */

// 분야별 소개 문구와 대표 색
const CATEGORY_INFO = {
  novel:      { desc: '다른 삶을 살아보는 가장 쉬운 방법', color: '#3b4a6b' },
  essay:      { desc: '작가의 하루에서 내 마음을 발견해요', color: '#8a9a6b' },
  humanities: { desc: '오래된 질문에 새로운 답을 찾아요', color: '#b0703f' },
  business:   { desc: '일과 돈을 읽는 눈을 길러요', color: '#2f4a3a' },
  science:    { desc: '세상이 움직이는 원리가 궁금하다면', color: '#1f2a44' },
  self:       { desc: '작은 습관으로 내일을 바꿔요', color: '#d98b3a' }
};

document.addEventListener('DOMContentLoaded', () => {
  const cats = CATEGORIES.filter(c => c.id !== 'all').map(c => {
    const books = BOOKS.filter(b => b.category === c.id).sort(BOOK_SORTERS.rating);
    const avg = books.length ? books.reduce((s, b) => s + b.rating, 0) / books.length : 0;
    return { ...c, ...CATEGORY_INFO[c.id], books, avg };
  });

  /* ---------- 상단 통계 ---------- */
  const top = [...cats].sort((a, b) => b.avg - a.avg)[0];
  document.getElementById('pageStats').innerHTML = `
    <div><dt>분야</dt><dd>${cats.length}<small>개</small></dd></div>
    <div><dt>전체 도서</dt><dd>${BOOKS.length}<small>권</small></dd></div>
    <div><dt>별점 1위 분야</dt><dd style="font-size:var(--fs-h4)">${top.name}</dd></div>`;

  /* ---------- 분야 카드 ---------- */
  document.getElementById('catCards').innerHTML = cats.map(c => `
    <li>
      <a href="#cat-${c.id}" class="cat-card" style="--cat-color:${c.color}">
        <div class="cat-card__covers" aria-hidden="true">
          ${c.books.slice(0, 3).map(b => coverHTML(b)).join('')}
        </div>
        <div class="cat-card__body">
          <h3 class="cat-card__name">${c.name}</h3>
          <p class="cat-card__desc">${c.desc}</p>
          <p class="cat-card__meta">
            <span>${c.books.length}권</span>
            <span>★ ${c.avg.toFixed(1)}</span>
          </p>
        </div>
        <span class="cat-card__arrow" aria-hidden="true">→</span>
      </a>
    </li>`).join('');

  /* ---------- 분야별 추천 도서 ---------- */
  document.getElementById('catSections').innerHTML = cats.map((c, i) => `
    <section class="section cat-section ${i % 2 ? 'cat-section--alt' : ''}" id="cat-${c.id}" aria-labelledby="cat-title-${c.id}">
      <div class="inner">
        <div class="section__head">
          <div>
            <p class="cat-section__eyebrow" style="color:${c.color}">${String(i + 1).padStart(2, '0')}</p>
            <h2 class="section__title" id="cat-title-${c.id}">${c.name}</h2>
            <p class="section__sub">${c.desc} · ${c.books.length}권 · 평균 ★ ${c.avg.toFixed(1)}</p>
          </div>
          <a href="books.html?cat=${c.id}" class="btn-all">
            ${c.name} 전체 보기
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
        <ul class="book-grid">${c.books.slice(0, 5).map(bookCardHTML).join('')}</ul>
      </div>
    </section>`).join('');
});
