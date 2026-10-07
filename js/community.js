/* ==========================================================
   북톡 커뮤니티 페이지 (html/community.html) 스크립트
   - 왼쪽   : 내 프로필(닉네임 바꾸기 · 내 글/받은 공감/저장) · 게시판 메뉴 · 내 활동(내가 쓴 글/북마크/공감한 글)
   - 게시판 : 검색 · 정렬 · 더 보기 · 글 펼쳐보기 · 공감 · 저장
   - 글쓰기 / 내 글 삭제
   - 오른쪽 : 인기 글 · 지금 토론 중인 책 · 이용 안내 · 활동 TOP 5
   - 내가 쓴 글·공감·저장은 이 브라우저(localStorage)에만 저장되는 샘플 기능
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const POST_KEY = 'booktalk-posts';
  const LIKE_KEY = 'booktalk-post-likes';
  const MARK_KEY = 'booktalk-post-marks';
  const NICK_KEY = 'booktalk-nick';
  const load = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
  const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 무시 */ } };

  let myPosts = load(POST_KEY);
  const liked = new Set(load(LIKE_KEY));
  const marked = new Set(load(MARK_KEY));
  let myNick = (() => { try { return JSON.parse(localStorage.getItem(NICK_KEY)); } catch { return null; } })();
  if (!myNick) { myNick = `독자${Math.floor(1000 + Math.random() * 9000)}`; save(NICK_KEY, myNick); }

  const allPosts = () => [...myPosts, ...COMMUNITY_POSTS];
  const typeName = id => POST_TYPES.find(t => t.id === id)?.name || '';
  const fmtDate = d => d.replace(/-/g, '.');
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const likeCount = p => p.likes + (liked.has(p.id) ? 1 : 0);
  const isMine = p => myPosts.some(m => m.id === p.id);

  const PAGE = 6;
  // view: 'feed'(게시판) | 'mine' | 'marks' | 'liked'
  const state = { view: 'feed', type: 'all', keyword: '', sort: 'newest', shown: PAGE, open: null };
  const SORTS = {
    newest: (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    likes: (a, b) => likeCount(b) - likeCount(a),
    views: (a, b) => b.views - a.views
  };

  /* ---------- 왼쪽 메뉴 ---------- */
  const svg = d => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICONS = {
    all: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    free: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
    recommend: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
    question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01',
    review: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    mine: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    marks: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    liked: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z'
  };
  const BOARD_NAMES = { all: '홈 피드' };
  const MY_VIEWS = [
    { id: 'mine', name: '내가 쓴 글', test: isMine },
    { id: 'marks', name: '북마크', test: p => marked.has(p.id) },
    { id: 'liked', name: '공감한 글', test: p => liked.has(p.id) }
  ];
  const boardName = id => BOARD_NAMES[id] || typeName(id);

  function renderNav() {
    const posts = allPosts().filter(p => !p.pinned);
    document.getElementById('boardMenu').innerHTML = POST_TYPES.map(t => `
      <li><button type="button" data-nav-type="${t.id}" aria-current="${state.view === 'feed' && state.type === t.id}">
        ${svg(ICONS[t.id])}<span>${boardName(t.id)}</span>
        <span class="side-menu__count">${t.id === 'all' ? posts.length : posts.filter(p => p.type === t.id).length}</span>
      </button></li>`).join('');
    document.getElementById('myMenu').innerHTML = MY_VIEWS.map(v => `
      <li><button type="button" data-nav-view="${v.id}" aria-current="${state.view === v.id}">
        ${svg(ICONS[v.id])}<span>${v.name}</span>
        <span class="side-menu__count">${allPosts().filter(v.test).length}</span>
      </button></li>`).join('');
  }

  /* ---------- 왼쪽 프로필 ---------- */
  function renderProfile() {
    const received = myPosts.reduce((n, p) => n + likeCount(p), 0);
    const score = myPosts.length * 10 + received;
    document.getElementById('myAvatar').textContent = myNick.charAt(0);
    document.getElementById('myAvatar').style.background = avatarColor(myNick);
    document.getElementById('myNick').textContent = myNick;
    document.getElementById('myLevel').textContent = LEVELS.find(l => score >= l.min).name;
    document.getElementById('myStats').innerHTML = `
      <div><dt>내 글</dt><dd>${myPosts.length}</dd></div>
      <div><dt>받은 공감</dt><dd>${received}</dd></div>
      <div><dt>저장</dt><dd>${allPosts().filter(p => marked.has(p.id)).length}</dd></div>`;
  }

  const listEl = document.getElementById('postList');
  document.getElementById('postType').innerHTML = POST_TYPES.filter(t => t.id !== 'all')
    .map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  /* ---------- 상단 통계 ---------- */
  function renderStats() {
    const posts = allPosts();
    const today = posts.filter(p => p.date === todayStr()).length;
    document.getElementById('pageStats').innerHTML = `
      <div><dt>전체 글</dt><dd>${posts.length}<small>개</small></dd></div>
      <div><dt>오늘 새 글</dt><dd>${today}<small>개</small></dd></div>
      <div><dt>내가 쓴 글</dt><dd>${myPosts.length}<small>개</small></dd></div>`;
  }

  /* ---------- 게시판 ---------- */
  function postHTML(p) {
    const mine = myPosts.some(m => m.id === p.id);
    const isOpen = state.open === p.id;
    return `
      <li class="post ${p.pinned ? 'post--pinned' : ''} ${isOpen ? 'is-open' : ''}">
        <button type="button" class="post__head" data-open="${p.id}" aria-expanded="${isOpen}">
          <span class="post__type post__type--${p.type}">${p.pinned ? '공지' : typeName(p.type)}</span>
          <span class="post__title">${escapeHTML(p.title)}${mine ? '<span class="post__mine">내 글</span>' : ''}</span>
          <span class="post__meta">
            <span>${escapeHTML(p.nick)}</span><span>${fmtDate(p.date)}</span><span>조회 ${p.views.toLocaleString()}</span>
          </span>
          <span class="post__counts" aria-label="공감 ${likeCount(p)}, 댓글 ${p.comments}">
            <span>♥ ${likeCount(p)}</span><span>💬 ${p.comments}</span>
          </span>
        </button>
        ${isOpen ? `
          <div class="post__body">
            <p>${escapeHTML(p.body)}</p>
            <div class="post__actions">
              <button type="button" class="like-btn ${liked.has(p.id) ? 'is-on' : ''}" data-like="${p.id}" aria-pressed="${liked.has(p.id)}">
                ♥ 공감 ${likeCount(p)}
              </button>
              <button type="button" class="like-btn ${marked.has(p.id) ? 'is-on' : ''}" data-mark="${p.id}" aria-pressed="${marked.has(p.id)}">
                ${marked.has(p.id) ? '🔖 저장됨' : '🔖 저장'}
              </button>
              ${mine ? `<button type="button" class="post__del" data-del="${p.id}">삭제</button>` : ''}
            </div>
          </div>` : ''}
      </li>`;
  }

  function render() {
    const kw = state.keyword.toLowerCase();
    const posts = allPosts();
    const isFeed = state.view === 'feed';
    const myView = MY_VIEWS.find(v => v.id === state.view);
    // 공지는 '홈 피드'에서 검색어가 없을 때만 맨 위에 고정
    const pinned = isFeed && state.type === 'all' && !kw ? posts.filter(p => p.pinned) : [];
    const list = posts.filter(p => !p.pinned &&
      (isFeed ? (state.type === 'all' || p.type === state.type) : myView.test(p)) &&
      (!kw || p.title.toLowerCase().includes(kw) || p.body.toLowerCase().includes(kw))
    ).sort(SORTS[state.sort]);

    const title = isFeed ? boardName(state.type) : myView.name;
    document.getElementById('boardHeading').textContent = title;
    const label = kw ? `'<strong>${escapeHTML(state.keyword)}</strong>' 검색 결과` : `<strong>${title}</strong>`;
    document.getElementById('postResult').innerHTML = `${label} · ${list.length}개`;

    const emptyMsg = {
      mine: '아직 쓴 글이 없어요. 왼쪽 \'글쓰기\'로 첫 글을 남겨보세요!',
      marks: '저장한 글이 없어요. 글을 펼쳐 \'저장\'을 눌러보세요.',
      liked: '공감한 글이 없어요.'
    }[state.view] || '글이 없어요. 첫 글을 남겨보세요!';
    listEl.innerHTML = [...pinned, ...list.slice(0, state.shown)].map(postHTML).join('')
      || `<li class="books__empty">${emptyMsg}</li>`;
    document.getElementById('postMore').hidden = list.length <= state.shown;
    renderStats();
    renderHot();
    renderNav();
    renderProfile();
  }

  const update = changes => { Object.assign(state, changes, { shown: PAGE, open: null }); render(); };

  document.querySelector('.board__nav').addEventListener('click', e => {
    const t = e.target.closest('[data-nav-type]');
    const v = e.target.closest('[data-nav-view]');
    if (t) update({ view: 'feed', type: t.dataset.navType });
    if (v) update({ view: v.dataset.navView });
    if (e.target.closest('[data-write]')) setWriteOpen(true);
  });
  document.getElementById('postSort').addEventListener('change', e => update({ sort: e.target.value }));

  let searchTimer;
  document.getElementById('postSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => update({ keyword: e.target.value.trim() }), 200);
  });

  document.getElementById('postMore').addEventListener('click', () => {
    state.shown += PAGE;
    render();
  });

  listEl.addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open]');
    const likeBtn = e.target.closest('[data-like]');
    const markBtn = e.target.closest('[data-mark]');
    const delBtn = e.target.closest('[data-del]');

    if (markBtn) {
      const id = Number(markBtn.dataset.mark);
      const on = !marked.has(id);
      if (on) marked.add(id); else marked.delete(id);
      save(MARK_KEY, [...marked]);
      render();
      showToast(on ? '북마크에 저장했어요. 왼쪽 \'북마크\'에서 볼 수 있어요.' : '북마크에서 뺐어요.');
      return;
    }

    if (openBtn) {
      const id = Number(openBtn.dataset.open);
      state.open = state.open === id ? null : id;
      render();
    } else if (likeBtn) {
      const id = Number(likeBtn.dataset.like);
      if (liked.has(id)) liked.delete(id); else liked.add(id);
      save(LIKE_KEY, [...liked]);
      render();
    } else if (delBtn && confirm('이 글을 삭제할까요?')) {
      myPosts = myPosts.filter(p => p.id !== Number(delBtn.dataset.del));
      save(POST_KEY, myPosts);
      state.open = null;
      render();
      showToast('글을 삭제했어요.');
    }
  });

  /* ---------- 글쓰기 ---------- */
  const form = document.getElementById('writeForm');
  const toggle = document.getElementById('writeToggle');

  function setWriteOpen(open) {
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.elements.title.focus({ preventScroll: true });
    }
  }
  toggle.addEventListener('click', () => setWriteOpen(form.hidden));
  document.getElementById('writeCancel').addEventListener('click', () => { form.reset(); setWriteOpen(false); });

  function setError(input, message) {
    const field = input.closest('.field');
    field.classList.toggle('is-error', !!message);
    field.querySelector('.field__error').textContent = message;
    return !message;
  }
  form.addEventListener('input', e => {
    if (e.target.closest('.field')?.classList.contains('is-error')) setError(e.target, '');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    const ok = [
      setError(f.title, f.title.value.trim() ? '' : '제목을 입력해 주세요.'),
      setError(f.body, f.body.value.trim().length >= 5 ? '' : '내용을 5자 이상 입력해 주세요.')
    ].every(Boolean);
    if (!ok) { form.querySelector('.is-error input, .is-error textarea').focus(); return; }

    const post = {
      id: Date.now(), type: f.type.value, title: f.title.value.trim(), body: f.body.value.trim(),
      nick: f.nick.value.trim() || myNick, date: todayStr(), views: 0, likes: 0, comments: 0, pinned: false
    };
    myPosts.unshift(post);
    save(POST_KEY, myPosts);
    form.reset();
    setWriteOpen(false);
    update({ view: 'feed', type: 'all', keyword: '', sort: 'newest' });
    document.getElementById('postSearch').value = '';
    document.getElementById('postSort').value = 'newest';
    state.open = post.id;
    render();
    showToast('글이 등록됐어요!');
  });

  /* ---------- 사이드: 인기 글 ---------- */
  function renderHot() {
    const hot = allPosts().filter(p => !p.pinned).sort(SORTS.likes).slice(0, 3);
    document.getElementById('hotList').innerHTML = hot.map((p, i) => `
      <li>
        <button type="button" data-hot="${p.id}">
          <span class="hot-list__rank">${i + 1}</span>
          <span class="hot-list__title">${escapeHTML(p.title)}</span>
          <span class="hot-list__likes">♥ ${likeCount(p)}</span>
        </button>
      </li>`).join('');
    renderTopUsers();
  }

  /* ---------- 사이드: 이번 주 활동 TOP 5 (글 × 10 + 받은 공감) ---------- */
  const LEVELS = [
    { min: 50, name: '북톡 마스터' }, { min: 35, name: '다독가' }, { min: 20, name: '책벌레' },
    { min: 10, name: '책 산책러' }, { min: 0, name: '새싹 독자' }
  ];
  const AVATAR_COLORS = ['#c2553a', '#2f4a3a', '#1f2a44', '#d98b3a', '#9a6b4f', '#4a5d8c', '#7a4f6d', '#5c6e7a'];
  // 닉네임마다 항상 같은 색
  const avatarColor = nick =>
    AVATAR_COLORS[[...nick].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATAR_COLORS.length];

  function renderTopUsers() {
    const users = {};
    allPosts().filter(p => !p.pinned).forEach(p => {
      users[p.nick] ??= { nick: p.nick, posts: 0, likes: 0 };
      users[p.nick].posts += 1;
      users[p.nick].likes += likeCount(p);
    });
    const score = u => u.posts * 10 + u.likes;
    document.getElementById('topUsers').innerHTML = Object.values(users)
      .sort((a, b) => score(b) - score(a)).slice(0, 5)
      .map((u, i) => `
        <li>
          <span class="rank-list__no">${i + 1}</span>
          <span class="rank-list__avatar" style="background:${avatarColor(u.nick)}" aria-hidden="true">${escapeHTML(u.nick.charAt(0))}</span>
          <span class="rank-list__who">
            <strong>${escapeHTML(u.nick)}</strong>
            <span>${LEVELS.find(l => score(u) >= l.min).name}</span>
          </span>
          <span class="rank-list__score">글 ${u.posts} · ♥ ${u.likes}</span>
        </li>`).join('');
  }

  document.getElementById('hotList').addEventListener('click', e => {
    const btn = e.target.closest('[data-hot]');
    if (!btn) return;
    const id = Number(btn.dataset.hot);
    update({ view: 'feed', type: 'all', keyword: '' });
    document.getElementById('postSearch').value = '';
    // 인기 글이 '더 보기' 뒤에 있으면 보이도록 펼침
    state.shown = Math.max(state.shown, allPosts().length);
    state.open = id;
    render();
    listEl.querySelector('.post.is-open')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------- 사이드: 지금 토론 중인 책 (리뷰가 가장 많은 책) ---------- */
  const talkBook = [...BOOKS].sort(BOOK_SORTERS.reviews)[0];
  document.getElementById('talkBook').innerHTML = `
    <a href="book-detail.html?id=${talkBook.id}#discussion" class="talk-book">
      ${coverHTML(talkBook)}
      <div>
        <p class="talk-book__title">${escapeHTML(talkBook.title)}</p>
        <p class="talk-book__q">Q. ${escapeHTML(DISCUSSION_QUESTIONS[talkBook.category])}</p>
        <span class="talk-book__go">토론 참여하기 →</span>
      </div>
    </a>`;

  /* ---------- 닉네임 바꾸기 (프로필의 닉네임 클릭) ---------- */
  document.getElementById('myNick').addEventListener('click', () => {
    const btn = document.getElementById('myNick');
    btn.hidden = true;
    btn.insertAdjacentHTML('afterend', `<input class="profile__nick-input" maxlength="12" value="${escapeHTML(myNick)}" aria-label="새 닉네임">`);
    const input = btn.nextElementSibling;
    input.focus();
    input.select();
    let done = false;
    const finish = ok => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      if (ok && v && v !== myNick) {
        if (v.length < 2) showToast('닉네임은 2자 이상이어야 해요.');
        else { myNick = v; save(NICK_KEY, v); showToast('닉네임을 바꿨어요.'); }
      }
      input.remove();
      btn.hidden = false;
      btn.focus();
      renderProfile();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  });

  render();
});
