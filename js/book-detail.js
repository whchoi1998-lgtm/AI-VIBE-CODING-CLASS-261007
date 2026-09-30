/* ==========================================================
   북톡 도서 상세 페이지 (html/book-detail.html) 스크립트
   ② 책 정보 / ③ 감상평 / ④ 토론 / ⑤ 독서모임 안내
   - 주소의 ?id=번호 로 책을 찾음
   - 내가 남긴 감상평·의견은 이 브라우저(localStorage)에만 저장되는 샘플 기능
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const book = findBook(id);

  if (!book) {
    document.getElementById('notFound').hidden = false;
    return;
  }
  document.getElementById('detailContent').hidden = false;
  document.title = `${book.title} | 북톡`;

  /* ---------- 저장 도우미 (저장이 막힌 환경에서도 페이지는 동작) ---------- */
  const load = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 무시 */ } };
  const REVIEW_KEY = `booktalk-reviews-${book.id}`;
  const OPINION_KEY = `booktalk-opinions-${book.id}`;

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const fmtDate = d => d.replace(/-/g, '.');
  // 샘플 글 날짜: 기준일(2026-09-28)에서 며칠 전
  const sampleDate = daysBefore => {
    const d = new Date('2026-09-28T00:00:00');
    d.setDate(d.getDate() - daysBefore);
    return d.toISOString().slice(0, 10);
  };

  function setError(input, message) {
    const field = input.closest('.field');
    field.classList.toggle('is-error', !!message);
    field.querySelector('.field__error').textContent = message;
    return !message;
  }

  /* ======================================================
     ① 위치 표시 + ② 책 정보
     ====================================================== */
  const catLink = `books.html?cat=${book.category}`;
  document.getElementById('breadcrumb').insertAdjacentHTML('beforeend', `
    <li><a href="${catLink}">${categoryName(book.category)}</a></li>
    <li aria-current="page">${escapeHTML(book.title)}</li>`);

  // 책 목록에서 왔으면 보던 목록(필터 유지)으로, 아니면 같은 분야 목록으로
  const backLink = document.getElementById('backLink');
  backLink.href = /\/books\.html/.test(document.referrer) ? document.referrer : catLink;

  document.getElementById('bookCover').innerHTML = coverHTML(book);
  const catChip = document.getElementById('bookCategory');
  catChip.textContent = categoryName(book.category);
  catChip.href = catLink;
  document.getElementById('bookTitle').textContent = book.title;
  document.getElementById('bookAuthor').textContent = `${book.author} 지음 · ${fmtDate(book.date)} 등록`;
  document.getElementById('bookDesc').textContent = book.desc;
  document.getElementById('previewBtn').addEventListener('click', () => openPreview(book.id));

  // 별점: 기존 평균 + 내가 남긴 별점을 합쳐 다시 계산
  function renderRating() {
    const mine = myReviews;
    const total = book.reviews + mine.length;
    const sum = book.rating * book.reviews + mine.reduce((s, r) => s + r.stars, 0);
    document.getElementById('ratingScore').textContent = (sum / total).toFixed(1);
    document.getElementById('ratingCount').textContent = `(리뷰 ${total.toLocaleString()})`;
    document.getElementById('reviewCount').textContent = total.toLocaleString();
  }

  /* ======================================================
     ③ 감상평
     ====================================================== */
  let myReviews = load(REVIEW_KEY);
  // 샘플 감상평 4개: 책 id에 따라 다른 조합
  const sampleReviews = [0, 1, 2, 3].map(k => ({
    ...SAMPLE_REVIEWS[(book.id + k) % SAMPLE_REVIEWS.length],
    date: sampleDate(k * 3 + (book.id % 3))
  }));
  const REVIEW_PAGE = 3;
  let reviewShown = REVIEW_PAGE;

  const starText = n => '★'.repeat(n) + `<span>${'★'.repeat(5 - n)}</span>`;

  function reviewCardHTML(r, mine) {
    return `
      <li class="talk-card ${mine ? 'is-mine' : ''}">
        <div class="talk-card__top">
          <span class="talk-card__nick">${escapeHTML(r.nick)}${mine ? '<span class="talk-card__mine">내 글</span>' : ''}</span>
          <span class="talk-card__date">${fmtDate(r.date)}</span>
        </div>
        <p class="talk-card__stars" aria-label="별점 ${r.stars}점">${starText(r.stars)}</p>
        <p class="talk-card__short">${escapeHTML(r.short)}</p>
        ${r.long ? `<p class="talk-card__long">${escapeHTML(r.long)}</p>` : ''}
        ${mine ? `<div class="talk-card__actions"><button type="button" data-del-review="${r.id}">삭제</button></div>` : ''}
      </li>`;
  }

  function renderReviews() {
    const all = [
      ...myReviews.map(r => reviewCardHTML(r, true)),
      ...sampleReviews.map(r => reviewCardHTML(r, false))
    ];
    document.getElementById('reviewList').innerHTML = all.slice(0, reviewShown).join('');
    document.getElementById('reviewMore').hidden = all.length <= reviewShown;
    renderRating();
  }

  document.getElementById('reviewMore').addEventListener('click', () => {
    reviewShown += REVIEW_PAGE;
    renderReviews();
  });

  /* --- 별점 선택 --- */
  const STAR_LABELS = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요'];
  const starInput = document.getElementById('starInput');
  let selectedStars = 0;

  starInput.innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" role="radio" aria-checked="false" aria-label="${n}점" data-star="${n}">★</button>`).join('')
    + '<span class="star-input__label" id="starText">별을 눌러 주세요</span>';

  function paintStars(n) {
    starInput.querySelectorAll('[data-star]').forEach(b => b.classList.toggle('is-on', Number(b.dataset.star) <= n));
    document.getElementById('starText').textContent = n ? `${n}점 · ${STAR_LABELS[n]}` : '별을 눌러 주세요';
  }

  starInput.addEventListener('click', e => {
    const btn = e.target.closest('[data-star]');
    if (!btn) return;
    selectedStars = Number(btn.dataset.star);
    starInput.querySelectorAll('[data-star]').forEach(b =>
      b.setAttribute('aria-checked', String(Number(b.dataset.star) === selectedStars)));
    document.getElementById('starError').textContent = '';
    paintStars(selectedStars);
  });
  starInput.addEventListener('mouseover', e => {
    const btn = e.target.closest('[data-star]');
    if (btn) paintStars(Number(btn.dataset.star));
  });
  starInput.addEventListener('mouseleave', () => paintStars(selectedStars));

  /* --- 감상평 작성 --- */
  const reviewForm = document.getElementById('reviewForm');
  const reviewLong = document.getElementById('reviewLong');
  reviewLong.addEventListener('input', () => {
    document.getElementById('longCount').textContent = reviewLong.value.length;
  });

  reviewForm.addEventListener('input', e => {
    if (e.target.closest('.field')?.classList.contains('is-error')) setError(e.target, '');
  });

  reviewForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = reviewForm.elements;
    const shortOk = setError(f.short, f.short.value.trim() ? '' : '한 줄 감상을 입력해 주세요.');
    const starOk = selectedStars > 0;
    document.getElementById('starError').textContent = starOk ? '' : '별점을 선택해 주세요.';
    if (!shortOk || !starOk) {
      (starOk ? f.short : starInput.querySelector('button')).focus();
      return;
    }

    myReviews.unshift({
      id: Date.now(),
      nick: f.nick.value.trim() || '익명 독자',
      stars: selectedStars,
      short: f.short.value.trim(),
      long: f.long.value.trim(),
      date: todayStr()
    });
    save(REVIEW_KEY, myReviews);

    reviewForm.reset();
    selectedStars = 0;
    paintStars(0);
    document.getElementById('longCount').textContent = '0';
    reviewShown = Math.max(reviewShown, REVIEW_PAGE);
    renderReviews();
    showToast('감상평이 등록됐어요. 고마워요!');
  });

  document.getElementById('reviewList').addEventListener('click', e => {
    const btn = e.target.closest('[data-del-review]');
    if (!btn || !confirm('이 감상평을 삭제할까요?')) return;
    myReviews = myReviews.filter(r => r.id !== Number(btn.dataset.delReview));
    save(REVIEW_KEY, myReviews);
    renderReviews();
    showToast('감상평을 삭제했어요.');
  });

  renderReviews();

  /* ======================================================
     ④ 토론
     ====================================================== */
  document.getElementById('discussionQuestion').textContent =
    DISCUSSION_QUESTIONS[book.category] || '이 책에서 가장 기억에 남는 장면은 무엇인가요?';

  let myOpinions = load(OPINION_KEY);
  const sampleOpinions = [0, 1].map(k => ({
    ...SAMPLE_OPINIONS[(book.id + k) % SAMPLE_OPINIONS.length],
    date: sampleDate(k * 2 + 1)
  }));

  function opinionCardHTML(o, mine) {
    return `
      <li class="talk-card ${mine ? 'is-mine' : ''}">
        <div class="talk-card__top">
          <span class="talk-card__nick">${escapeHTML(o.nick)}${mine ? '<span class="talk-card__mine">내 글</span>' : ''}</span>
          <span class="talk-card__date">${fmtDate(o.date)}</span>
        </div>
        <p class="talk-card__text">${escapeHTML(o.text)}</p>
        ${mine ? `<div class="talk-card__actions"><button type="button" data-del-opinion="${o.id}">삭제</button></div>` : ''}
      </li>`;
  }

  function renderOpinions() {
    const total = myOpinions.length + sampleOpinions.length;
    document.getElementById('opinionCount').innerHTML = `의견 <strong>${total}</strong>개`;
    document.getElementById('opinionList').innerHTML =
      myOpinions.map(o => opinionCardHTML(o, true)).join('') +
      sampleOpinions.map(o => opinionCardHTML(o, false)).join('');
  }

  const opinionForm = document.getElementById('opinionForm');
  opinionForm.addEventListener('input', e => {
    if (e.target.closest('.field')?.classList.contains('is-error')) setError(e.target, '');
  });

  opinionForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = opinionForm.elements;
    if (!setError(f.text, f.text.value.trim() ? '' : '의견을 입력해 주세요.')) {
      f.text.focus();
      return;
    }
    myOpinions.unshift({
      id: Date.now(),
      nick: f.nick.value.trim() || '익명 독자',
      text: f.text.value.trim(),
      date: todayStr()
    });
    save(OPINION_KEY, myOpinions);
    opinionForm.reset();
    renderOpinions();
    showToast('의견이 등록됐어요.');
  });

  document.getElementById('opinionList').addEventListener('click', e => {
    const btn = e.target.closest('[data-del-opinion]');
    if (!btn || !confirm('이 의견을 삭제할까요?')) return;
    myOpinions = myOpinions.filter(o => o.id !== Number(btn.dataset.delOpinion));
    save(OPINION_KEY, myOpinions);
    renderOpinions();
    showToast('의견을 삭제했어요.');
  });

  renderOpinions();

  /* ======================================================
     ⑤ 독서모임 안내 (이 책으로 열리는 모임이 있으면 함께 안내)
     ====================================================== */
  const club = CLUBS.find(c => c.bookId === book.id);
  document.getElementById('clubDesc').innerHTML = club
    ? `『${escapeHTML(book.title)}』로 진행하는 <strong>${escapeHTML(club.name)}</strong> 모임이 있어요. `
      + `${club.schedule} · ${club.type === 'online' ? '온라인' : escapeHTML(club.place)}`
    : '같은 책을 읽은 사람들과 격주로 만나 생각을 나눠요. 지금 모집 중인 모임을 확인해 보세요.';
});
