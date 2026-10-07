/* ==========================================================
   북톡 커뮤니티 리뉴얼 샘플 (html/community-new.html) 스크립트
   1. 피드     : 게시판 · 내 활동 메뉴, 인기/최신/댓글순 정렬, 검색(하이라이트), 태그 필터, 무한 스크롤
   2. 게시글   : 공감 · 북마크 · 공유(링크 복사) · 숨기기 · 신고 · 삭제, 스포일러 가림
   3. 글 상세  : 본문 + 첨부 책 + 댓글/답글 · 댓글 공감 · 댓글 정렬, ?post=번호 로 바로 열기
   4. 글쓰기   : 게시판 선택, 책 검색 첨부, 태그, 스포일러, 임시 저장, Ctrl+Enter
   5. 위젯     : 오늘의 투표, 뜨는 태그, 활동 TOP 5, 다가오는 독서모임
   - 내가 한 활동은 이 브라우저(localStorage)에만 저장되는 샘플 기능
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ======================================================
     0. 저장 · 공통 도우미
     ====================================================== */
  const KEY = {
    posts: 'bt-cm-posts', likes: 'bt-cm-likes', marks: 'bt-cm-marks', hidden: 'bt-cm-hidden',
    comments: 'bt-cm-comments', cLikes: 'bt-cm-comment-likes', poll: 'bt-cm-poll',
    nick: 'bt-cm-nick', draft: 'bt-cm-draft'
  };
  const load = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경은 무시 */ } };

  let myPosts = load(KEY.posts, []);
  let myComments = load(KEY.comments, {});          // { 글id: [댓글...] }
  const liked = new Set(load(KEY.likes, []));
  const marked = new Set(load(KEY.marks, []));
  const hidden = new Set(load(KEY.hidden, []));
  const cLiked = new Set(load(KEY.cLikes, []));
  const revealed = new Set();                       // 이번 방문에서 펼친 스포일러
  const extraViews = {};                            // 이번 방문에서 열어본 횟수

  let myNick = load(KEY.nick, null);
  if (!myNick) { myNick = `독자${Math.floor(1000 + Math.random() * 9000)}`; save(KEY.nick, myNick); }

  const NOW = Date.now();
  const $ = id => document.getElementById(id);
  const icon = (name, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const boardOf = id => CM_BOARDS.find(b => b.id === id) || CM_BOARDS[0];
  const reEscape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function relTime(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return '방금 전';
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
    const d = new Date(ts);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  // 검색어 하이라이트 (먼저 이스케이프 → <mark>)
  function hl(text) {
    const safe = escapeHTML(text);
    if (!state.keyword) return safe;
    return safe.replace(new RegExp(reEscape(escapeHTML(state.keyword)), 'gi'), m => `<mark>${m}</mark>`);
  }

  /* ---------- 나 ---------- */
  const myLevel = () => Math.min(5, 1 + Math.floor((myPosts.length * 2 + Object.values(myComments).flat().length) / 3));
  const me = () => ({ nick: myNick, level: myLevel(), color: '#c2553a', me: true });
  const avatar = (a, size = '') =>
    `<span class="avatar ${size ? `avatar--${size}` : ''}" style="--av:${a.color}" aria-hidden="true">${escapeHTML(a.nick.charAt(0))}</span>`;

  /* ---------- 글 · 댓글 계산 ---------- */
  const ts = p => p.createdAt || NOW - p.minutesAgo * 60000;
  const authorOf = p => (p.mine ? me() : p.author);
  const allPosts = () => [...myPosts, ...CM_POSTS].filter(p => !hidden.has(p.id));
  const findPost = id => [...myPosts, ...CM_POSTS].find(p => p.id === id);
  const likeCount = p => p.likes + (liked.has(p.id) ? 1 : 0);
  const viewCount = p => p.views + (extraViews[p.id] || 0);

  // 샘플 댓글 + 내 댓글(답글 포함)을 합친 트리
  function commentTree(p) {
    const mine = (myComments[p.id] || []).map(c => ({ ...c, author: me(), mine: true }));
    const top = [
      ...p.comments.map(c => ({ ...c, replies: [...c.replies] })),
      ...mine.filter(c => !c.parentId).map(c => ({ ...c, replies: [] }))
    ];
    mine.filter(c => c.parentId).forEach(r => top.find(c => c.id === r.parentId)?.replies.push(r));
    return top;
  }
  const commentCount = p => p.comments.reduce((n, c) => n + 1 + c.replies.length, 0) + (myComments[p.id] || []).length;
  const cLikeCount = c => (c.likes || 0) + (cLiked.has(c.id) ? 1 : 0);
  const cTs = c => c.createdAt || NOW - c.minutesAgo * 60000;

  /* ======================================================
     1. 피드
     ====================================================== */
  const MY_VIEWS = [
    { id: 'mine', name: '내가 쓴 글', icon: 'pen', desc: '내가 작성한 글을 모아봐요', test: p => p.mine },
    { id: 'bookmarks', name: '북마크', icon: 'bookmark', desc: '나중에 다시 읽고 싶은 글', test: p => marked.has(p.id) },
    { id: 'liked', name: '공감한 글', icon: 'heart', desc: '내가 공감을 누른 글', test: p => liked.has(p.id) }
  ];
  const PAGE = 5;
  const state = { view: 'feed', board: 'all', sort: 'hot', keyword: '', tag: '', shown: PAGE, list: [], loading: false };

  const SORTS = {
    hot: (a, b) => hotScore(b) - hotScore(a),
    latest: (a, b) => ts(b) - ts(a),
    talk: (a, b) => commentCount(b) - commentCount(a) || ts(b) - ts(a)
  };
  function hotScore(p) {
    const hours = (Date.now() - ts(p)) / 3600000;
    return (likeCount(p) * 2 + commentCount(p) * 3 + viewCount(p) / 30 + 1) / Math.pow(hours + 2, 0.8);
  }

  function matches(p) {
    const kw = state.keyword.toLowerCase();
    if (state.tag && !p.tags.includes(state.tag)) return false;
    if (!kw) return true;
    return [p.title, p.body, authorOf(p).nick, ...p.tags].some(s => s.toLowerCase().includes(kw));
  }

  function getList() {
    const posts = allPosts().filter(p => !p.pinned);
    const scoped = state.view === 'feed'
      ? posts.filter(p => state.board === 'all' || p.board === state.board)
      : posts.filter(MY_VIEWS.find(v => v.id === state.view).test);
    return scoped.filter(matches).sort(SORTS[state.sort]);
  }

  function pinnedPosts() {
    if (state.view !== 'feed' || state.keyword || state.tag) return [];
    return allPosts().filter(p => p.pinned && (state.board === 'all' || p.board === state.board));
  }

  /* ---------- 게시글 카드 ---------- */
  function badgeHTML(a) {
    if (a.staff) return '<span class="post-card__badge post-card__badge--staff">운영자</span>';
    if (a.me) return '<span class="post-card__badge post-card__badge--me">나</span>';
    return `<span class="post-card__badge">Lv.${a.level} ${CM_LEVELS[a.level]}</span>`;
  }

  function spoilerWrap(p, inner) {
    if (!p.spoiler || p.mine || revealed.has(p.id)) return inner;
    return `
      <div class="spoiler is-hidden">
        <div class="spoiler__content">${inner}</div>
        <button type="button" class="spoiler__btn" data-reveal="${p.id}"><span>${icon('eye')} 스포일러 포함 · 눌러서 보기</span></button>
      </div>`;
  }

  function actionsHTML(p) {
    const isLiked = liked.has(p.id);
    const isMarked = marked.has(p.id);
    return `
      <div class="post-card__actions">
        <button type="button" class="act act--like ${isLiked ? 'is-on' : ''}" data-like="${p.id}" aria-pressed="${isLiked}" aria-label="공감 ${likeCount(p)}">
          ${icon('heart')}<span>${likeCount(p)}</span>
        </button>
        <button type="button" class="act" data-open="${p.id}" aria-label="댓글 ${commentCount(p)}">
          ${icon('comment')}<span>${commentCount(p)}</span>
        </button>
        <button type="button" class="act act--mark ${isMarked ? 'is-on' : ''}" data-mark="${p.id}" aria-pressed="${isMarked}">
          ${icon('bookmark')}<span class="act__label">${isMarked ? '저장됨' : '저장'}</span>
        </button>
        <button type="button" class="act" data-share="${p.id}">${icon('share')}<span class="act__label">공유</span></button>
        <span class="act act--views" aria-label="조회 ${viewCount(p)}">${icon('eye')}<span>${viewCount(p).toLocaleString()}</span></span>
      </div>`;
  }

  function cardHTML(p, { anim = true } = {}) {
    const a = authorOf(p);
    const board = boardOf(p.board);
    const book = p.bookId ? findBook(p.bookId) : null;
    return `
      <li class="cm-card post-card ${p.pinned ? 'post-card--pinned' : ''}" data-post="${p.id}" ${anim ? '' : 'style="animation:none"'}>
        <div class="post-card__head">
          ${avatar(a)}
          <div class="post-card__who">
            <span class="post-card__nick">${hl(a.nick)}</span>${badgeHTML(a)}
            <div class="post-card__meta">
              ${p.pinned ? `<span class="post-card__pin">${icon('pin')}고정</span> ·` : ''}
              <button type="button" class="post-card__board" data-board="${board.id}">${board.name}</button>
              · <time datetime="${new Date(ts(p)).toISOString()}">${relTime(ts(p))}</time>
            </div>
          </div>
          <div class="menu-wrap">
            <button type="button" class="icon-btn" data-menu="${p.id}" aria-label="더보기 메뉴" aria-haspopup="true">${icon('more')}</button>
          </div>
        </div>
        <div class="post-card__main">
          <div>
            <h3 class="post-card__title">${hl(p.title)}</h3>
            ${spoilerWrap(p, `<p class="post-card__excerpt">${hl(p.body)}</p>`)}
          </div>
          ${book ? `<div class="post-card__book" title="${escapeHTML(book.title)}">${coverHTML(book)}</div>` : ''}
        </div>
        ${p.tags.length ? `<div class="post-card__tags">${p.tags.map(t => `<button type="button" class="tag" data-tag="${escapeHTML(t)}">#${hl(t)}</button>`).join('')}</div>` : ''}
        ${actionsHTML(p)}
      </li>`;
  }

  const skeletonHTML = () =>
    '<li class="cm-card skeleton" aria-hidden="true"><span class="s1"></span><span class="s2"></span><span class="s3"></span><span class="s4"></span></li>';

  function emptyHTML() {
    const msg = state.keyword || state.tag
      ? { icon: '🔍', title: '검색 결과가 없어요', desc: '다른 단어로 검색하거나 필터를 지워보세요.', btn: '필터 지우기', act: 'clear' }
      : state.view === 'bookmarks' ? { icon: '🔖', title: '저장한 글이 없어요', desc: '마음에 드는 글의 \'저장\'을 눌러 모아보세요.' }
      : state.view === 'liked' ? { icon: '🤍', title: '공감한 글이 없어요', desc: '좋은 글에 공감을 눌러 마음을 표현해 보세요.' }
      : { icon: '✍️', title: '아직 글이 없어요', desc: '첫 번째 이야기를 들려주세요!', btn: '글쓰기', act: 'compose' };
    return `
      <li class="cm-card cm-empty">
        <p class="cm-empty__icon" aria-hidden="true">${msg.icon}</p>
        <h3>${msg.title}</h3>
        <p>${msg.desc}</p>
        ${msg.btn ? `<button type="button" data-empty="${msg.act}">${msg.btn}</button>` : ''}
      </li>`;
  }

  /* ---------- 피드 그리기 ---------- */
  const listEl = $('postList');

  function renderFeed() {
    state.list = getList();
    state.shown = PAGE;
    const pinned = pinnedPosts();
    listEl.innerHTML = state.list.length || pinned.length
      ? [...pinned, ...state.list.slice(0, PAGE)].map(p => cardHTML(p)).join('')
      : emptyHTML();
    $('feedEnd').hidden = !(state.list.length > PAGE ? false : state.list.length);
    renderHead();
    renderMenus();
    renderStats();
  }

  // 무한 스크롤: 바닥에 닿으면 스켈레톤을 잠깐 보여주고 다음 글 이어 붙이기
  function loadMore() {
    if (state.loading || state.shown >= state.list.length) return;
    state.loading = true;
    listEl.insertAdjacentHTML('beforeend', skeletonHTML() + skeletonHTML());
    setTimeout(() => {
      listEl.querySelectorAll('.skeleton').forEach(s => s.remove());
      listEl.insertAdjacentHTML('beforeend',
        state.list.slice(state.shown, state.shown + PAGE).map(p => cardHTML(p)).join(''));
      state.shown += PAGE;
      state.loading = false;
      $('feedEnd').hidden = state.shown < state.list.length;
    }, 450);
  }
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '200px' }).observe($('sentinel'));

  // 카드 하나만 다시 그리기 (공감 · 댓글 수 갱신)
  function refreshCard(id) {
    const li = listEl.querySelector(`[data-post="${id}"]`);
    const p = findPost(id);
    if (li && p) li.outerHTML = cardHTML(p, { anim: false });
  }

  function renderHead() {
    const v = state.view === 'feed' ? boardOf(state.board) : MY_VIEWS.find(x => x.id === state.view);
    $('boardIcon').innerHTML = icon(v.icon);
    $('feedTitle').textContent = v.name;
    $('feedDesc').textContent = `${v.desc} · ${state.list.length}개의 글`;

    document.querySelectorAll('.cm-segment [data-sort]').forEach(b =>
      b.setAttribute('aria-selected', String(b.dataset.sort === state.sort)));

    const chips = [];
    if (state.tag) chips.push(`<button type="button" class="cm-filter-chip" data-clear="tag">#${escapeHTML(state.tag)} ${icon('x')}</button>`);
    if (state.keyword) chips.push(`<button type="button" class="cm-filter-chip" data-clear="keyword">'${escapeHTML(state.keyword)}' ${icon('x')}</button>`);
    $('activeFilters').innerHTML = chips.join('');
  }

  function renderMenus() {
    const posts = allPosts().filter(p => !p.pinned);
    const count = id => (id === 'all' ? posts.length : posts.filter(p => p.board === id).length);
    $('boardMenu').innerHTML = CM_BOARDS.map(b => `
      <li><button type="button" data-nav-board="${b.id}" aria-current="${state.view === 'feed' && state.board === b.id}">
        ${icon(b.icon)}${b.name}<span class="cm-menu__count">${count(b.id)}</span>
      </button></li>`).join('');
    $('myMenu').innerHTML = MY_VIEWS.map(v => `
      <li><button type="button" data-nav-view="${v.id}" aria-current="${state.view === v.id}">
        ${icon(v.icon)}${v.name}<span class="cm-menu__count">${posts.filter(v.test).length}</span>
      </button></li>`).join('');
  }

  function renderStats() {
    const a = me();
    $('myAvatar').outerHTML = avatar(a, 'lg').replace('<span class="avatar', '<span id="myAvatar" class="avatar');
    $('quickAvatar').outerHTML = avatar(a).replace('<span class="avatar', '<span id="quickAvatar" class="avatar');
    if (!$('myNick').querySelector('input')) $('myNick').textContent = a.nick;
    $('myLevel').textContent = `Lv.${a.level} ${CM_LEVELS[a.level]}`;
    const received = myPosts.reduce((n, p) => n + likeCount(p), 0);
    $('myStats').innerHTML = `
      <div><dt>내 글</dt><dd>${myPosts.length}</dd></div>
      <div><dt>받은 공감</dt><dd>${received}</dd></div>
      <div><dt>저장</dt><dd>${[...marked].filter(id => findPost(id)).length}</dd></div>`;
  }

  // 조건 바꾸고 맨 위부터 다시
  function setState(changes, { scroll = true } = {}) {
    Object.assign(state, changes);
    renderFeed();
    if (scroll) {
      const top = document.querySelector('.cm-feed').getBoundingClientRect().top + window.scrollY - $('header').offsetHeight - 16;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  /* ---------- 메뉴 · 정렬 · 검색 ---------- */
  document.querySelector('.cm-nav').addEventListener('click', e => {
    const b = e.target.closest('[data-nav-board]');
    const v = e.target.closest('[data-nav-view]');
    if (b) setState({ view: 'feed', board: b.dataset.navBoard, tag: '' });
    if (v) setState({ view: v.dataset.navView, tag: '' });
  });

  document.querySelector('.cm-segment').addEventListener('click', e => {
    const b = e.target.closest('[data-sort]');
    if (b) setState({ sort: b.dataset.sort }, { scroll: false });
  });

  $('activeFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-clear]');
    if (!b) return;
    if (b.dataset.clear === 'keyword') $('cmSearch').value = '';
    setState({ [b.dataset.clear]: '' }, { scroll: false });
  });

  let searchTimer;
  $('cmSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setState({ keyword: e.target.value.trim() }, { scroll: false }), 250);
  });

  // 키보드: '/' 검색창으로 이동
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !openModal) {
      e.preventDefault();
      $('cmSearch').focus();
    }
  });

  // 상단 헤더의 도서 검색은 책 목록 페이지로 보냄
  $('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('searchInput').value.trim();
    location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
  });

  /* ======================================================
     2. 게시글 동작 (피드 · 상세에서 공용)
     ====================================================== */
  function toggleLike(id, btn) {
    if (liked.has(id)) liked.delete(id); else liked.add(id);
    save(KEY.likes, [...liked]);
    refreshCard(id);
    if (openModal === 'post' && pm.id === id) renderPostModal(false);
    // 방금 누른 버튼에 '톡' 애니메이션
    const target = (btn?.closest('.cm-modal') ? $('pmBody') : listEl).querySelector(`[data-like="${id}"]`);
    target?.classList.add('is-pop');
    renderStats();
    renderMenus();
  }

  function toggleMark(id) {
    const on = !marked.has(id);
    if (on) marked.add(id); else marked.delete(id);
    save(KEY.marks, [...marked]);
    refreshCard(id);
    if (openModal === 'post' && pm.id === id) renderPostModal(false);
    showToast(on ? '북마크에 저장했어요. 왼쪽 \'북마크\'에서 볼 수 있어요.' : '북마크에서 뺐어요.');
    renderStats();
    renderMenus();
  }

  function copyLink(id) {
    const url = `${location.href.split(/[?#]/)[0]}?post=${id}`;
    const done = () => showToast('링크를 복사했어요. 원하는 곳에 붙여넣어 공유하세요!');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch { showToast(url); }
      ta.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, fallback);
    else fallback();
  }

  function deletePost(id) {
    if (!confirm('이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없어요.')) return;
    myPosts = myPosts.filter(p => p.id !== id);
    delete myComments[id];
    save(KEY.posts, myPosts);
    save(KEY.comments, myComments);
    if (openModal === 'post') closeModal();
    renderFeed();
    renderWidgets();
    showToast('글을 삭제했어요.');
  }

  function hidePost(id) {
    hidden.add(id);
    save(KEY.hidden, [...hidden]);
    if (openModal === 'post') closeModal();
    renderFeed();
    showToast('이 글을 숨겼어요.');
  }

  /* ---------- ··· 메뉴 ---------- */
  function closeMenus() {
    document.querySelectorAll('.pop-menu').forEach(m => m.remove());
    document.querySelectorAll('[data-menu][aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  function openMenu(btn) {
    const open = btn.getAttribute('aria-expanded') === 'true';
    closeMenus();
    if (open) return;
    const p = findPost(Number(btn.dataset.menu));
    const items = [`<button type="button" data-do="link">${icon('link')}링크 복사</button>`];
    if (p.mine) items.push(`<button type="button" class="is-danger" data-do="delete">${icon('trash')}삭제하기</button>`);
    else if (!p.pinned) items.push(
      `<button type="button" data-do="hide">${icon('eyeoff')}이 글 숨기기</button>`,
      `<button type="button" class="is-danger" data-do="report">${icon('flag')}신고하기</button>`);
    btn.insertAdjacentHTML('afterend', `<div class="pop-menu" role="menu" data-for="${p.id}">${items.join('')}</div>`);
    btn.setAttribute('aria-expanded', 'true');
    btn.nextElementSibling.querySelector('button').focus();
  }

  function onMenuItem(item) {
    const id = Number(item.closest('.pop-menu').dataset.for);
    closeMenus();
    ({
      link: () => copyLink(id),
      delete: () => deletePost(id),
      hide: () => hidePost(id),
      report: () => showToast('신고가 접수됐어요. 운영팀이 확인 후 조치할게요.')
    })[item.dataset.do]();
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.menu-wrap')) closeMenus();
  });

  // 피드 · 상세 공용 클릭 처리 → 처리했으면 true
  function handleCommon(e) {
    const t = e.target;
    const get = sel => t.closest(sel);
    let el;
    if ((el = get('.pop-menu [data-do]'))) { onMenuItem(el); return true; }
    if ((el = get('[data-menu]'))) { openMenu(el); return true; }
    if ((el = get('[data-like]'))) { toggleLike(Number(el.dataset.like), el); return true; }
    if ((el = get('[data-mark]'))) { toggleMark(Number(el.dataset.mark)); return true; }
    if ((el = get('[data-share]'))) { copyLink(Number(el.dataset.share)); return true; }
    if ((el = get('[data-reveal]'))) {
      revealed.add(Number(el.dataset.reveal));
      el.closest('.spoiler').classList.remove('is-hidden');
      return true;
    }
    if ((el = get('[data-tag]'))) {
      if (openModal) closeModal();
      $('cmSearch').value = '';
      setState({ view: 'feed', board: 'all', tag: el.dataset.tag, keyword: '' });
      return true;
    }
    if ((el = get('[data-board]'))) {
      if (openModal) closeModal();
      setState({ view: 'feed', board: el.dataset.board, tag: '' });
      return true;
    }
    return false;
  }

  listEl.addEventListener('click', e => {
    if (handleCommon(e)) return;
    const empty = e.target.closest('[data-empty]');
    if (empty) {
      if (empty.dataset.empty === 'compose') openCompose();
      else { $('cmSearch').value = ''; setState({ tag: '', keyword: '' }); }
      return;
    }
    const card = e.target.closest('[data-post]');
    if (card && !e.target.closest('a, button')) openPost(Number(card.dataset.post));
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) openPost(Number(openBtn.dataset.open), { focusComment: true });
  });

  /* ======================================================
     3. 모달 공통
     ====================================================== */
  let openModal = null;     // 'post' | 'compose' | null
  let lastFocus = null;

  function showModal(name) {
    lastFocus = document.activeElement;
    openModal = name;
    $(name === 'post' ? 'postModal' : 'composeModal').hidden = false;
    document.body.classList.add('is-locked');
  }

  function closeModal() {
    if (!openModal) return;
    if (openModal === 'post') {
      $('postModal').hidden = true;
      history.replaceState(null, '', location.pathname);
    } else {
      $('composeModal').hidden = true;
      if (composeDirty()) showToast('작성 중인 글을 임시 저장했어요.');
    }
    openModal = null;
    document.body.classList.remove('is-locked');
    lastFocus?.focus?.();
  }

  document.querySelectorAll('.cm-modal').forEach(m => m.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeModal();
  }));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.pop-menu')) { closeMenus(); return; }
    if (!$('bookResults').hidden) { $('bookResults').hidden = true; return; }
    closeModal();
  });

  /* ======================================================
     4. 글 상세 + 댓글
     ====================================================== */
  const pm = { id: null, sort: 'old', replyTo: null };

  function openPost(id, { focusComment = false } = {}) {
    const p = findPost(id);
    if (!p) return;
    extraViews[id] = (extraViews[id] || 0) + 1;
    Object.assign(pm, { id, replyTo: null });
    history.replaceState(null, '', `?post=${id}`);
    showModal('post');
    renderPostModal(true);
    refreshCard(id);
    const target = focusComment ? $('cmtInput') : $('postModal').querySelector('[data-close].icon-btn');
    target?.focus();
  }

  function renderPostModal(full) {
    const p = findPost(pm.id);
    const a = authorOf(p);
    const board = boardOf(p.board);
    const book = p.bookId ? findBook(p.bookId) : null;
    $('pmBoard').innerHTML = `${board.name}`;

    if (!full) { // 공감 · 저장만 바뀐 경우: 액션 바만 교체
      $('pmBody').querySelector('.post-card__actions').outerHTML = actionsHTML(p);
      return;
    }

    $('pmBody').innerHTML = `
      <div class="pm">
        <div class="pm__head">
          ${avatar(a)}
          <div class="post-card__who">
            <span class="post-card__nick">${escapeHTML(a.nick)}</span>${badgeHTML(a)}
            <div class="post-card__meta">
              <button type="button" class="post-card__board" data-board="${board.id}">${board.name}</button>
              · ${relTime(ts(p))}
            </div>
          </div>
          <div class="menu-wrap">
            <button type="button" class="icon-btn" data-menu="${p.id}" aria-label="더보기 메뉴" aria-haspopup="true">${icon('more')}</button>
          </div>
        </div>
        <h2 class="pm__title" id="pmTitle">${hl(p.title)}</h2>
        ${spoilerWrap(p, `<p class="pm__body">${hl(p.body)}</p>`)}
        ${book ? `
          <a class="pm__book" href="book-detail.html?id=${book.id}">
            ${coverHTML(book)}
            <div>
              <p class="pm__book-title">${escapeHTML(book.title)}</p>
              <p class="pm__book-meta">${escapeHTML(book.author)} · ★ ${book.rating.toFixed(1)}</p>
            </div>
            <span class="pm__book-go">책 보러 가기 →</span>
          </a>` : ''}
        ${p.tags.length ? `<div class="post-card__tags">${p.tags.map(t => `<button type="button" class="tag" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</button>`).join('')}</div>` : ''}
        ${actionsHTML(p)}

        <section aria-label="댓글">
          <div class="cmt-head">
            <h3>댓글 <em id="cmtCount">${commentCount(p)}</em></h3>
            <div class="cmt-sort">
              <button type="button" data-csort="old" aria-pressed="${pm.sort === 'old'}">등록순</button>
              <button type="button" data-csort="new" aria-pressed="${pm.sort === 'new'}">최신순</button>
            </div>
          </div>
          <form class="cmt-form" id="cmtForm">
            ${avatar(me(), 'sm')}
            <div class="cmt-form__box">
              <label for="cmtInput" class="blind">댓글 입력</label>
              <textarea id="cmtInput" rows="1" maxlength="500" placeholder="따뜻한 댓글을 남겨주세요"></textarea>
              <button type="submit" class="cmt-send" id="cmtSend" disabled aria-label="댓글 등록">${icon('send')}</button>
            </div>
          </form>
          <div id="cmtReplyTo"></div>
          <ul id="cmtList"></ul>
        </section>
      </div>`;
    renderComments();
  }

  function commentHTML(c, isReply) {
    const on = cLiked.has(c.id);
    return `
      <li class="cmt ${c.mine ? 'is-mine' : ''}">
        ${avatar(c.author, 'sm')}
        <div class="cmt__main">
          <div class="cmt__bubble">
            <p class="cmt__nick">${escapeHTML(c.author.nick)}${c.author.staff ? ' <span class="post-card__badge post-card__badge--staff">운영자</span>' : ''}</p>
            <p class="cmt__text">${escapeHTML(c.text)}</p>
          </div>
          <div class="cmt__meta">
            <span>${relTime(cTs(c))}</span>
            <button type="button" class="${on ? 'is-on' : ''}" data-clike="${c.id}" aria-pressed="${on}">♥ ${cLikeCount(c) || '공감'}</button>
            ${isReply ? '' : `<button type="button" data-reply="${c.id}" data-nick="${escapeHTML(c.author.nick)}">답글</button>`}
            ${c.mine ? `<button type="button" data-cdel="${c.id}">삭제</button>` : ''}
          </div>
          ${!isReply && c.replies.length ? `<ul class="cmt__replies">${c.replies.map(r => commentHTML(r, true)).join('')}</ul>` : ''}
        </div>
      </li>`;
  }

  function renderComments() {
    const p = findPost(pm.id);
    const tree = commentTree(p).sort((a, b) => (pm.sort === 'old' ? cTs(a) - cTs(b) : cTs(b) - cTs(a)));
    $('cmtList').innerHTML = tree.length
      ? tree.map(c => commentHTML(c, false)).join('')
      : '<li class="cmt-empty">첫 댓글을 남겨보세요 💬</li>';
    $('cmtCount').textContent = commentCount(p);
    $('cmtReplyTo').innerHTML = pm.replyTo
      ? `<p class="cmt-reply-to">${icon('reply')} ${escapeHTML(pm.replyTo.nick)}님에게 답글 남기는 중 <button type="button" data-cancel-reply>취소</button></p>`
      : '';
  }

  $('pmBody').addEventListener('click', e => {
    if (handleCommon(e)) return;
    const t = e.target;
    let el;
    if ((el = t.closest('[data-csort]'))) {
      pm.sort = el.dataset.csort;
      document.querySelectorAll('[data-csort]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      renderComments();
    } else if ((el = t.closest('[data-clike]'))) {
      const id = el.dataset.clike;
      if (cLiked.has(id)) cLiked.delete(id); else cLiked.add(id);
      save(KEY.cLikes, [...cLiked]);
      renderComments();
    } else if ((el = t.closest('[data-reply]'))) {
      pm.replyTo = { id: el.dataset.reply, nick: el.dataset.nick };
      renderComments();
      $('cmtInput').focus();
    } else if (t.closest('[data-cancel-reply]')) {
      pm.replyTo = null;
      renderComments();
    } else if ((el = t.closest('[data-cdel]')) && confirm('댓글을 삭제할까요?')) {
      const id = el.dataset.cdel;
      myComments[pm.id] = (myComments[pm.id] || []).filter(c => c.id !== id && c.parentId !== id);
      save(KEY.comments, myComments);
      renderComments();
      refreshCard(pm.id);
      showToast('댓글을 삭제했어요.');
    }
  });

  // 댓글 입력: 높이 자동 조절 · 빈 칸이면 등록 버튼 비활성
  $('pmBody').addEventListener('input', e => {
    if (e.target.id !== 'cmtInput') return;
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    $('cmtSend').disabled = !e.target.value.trim();
  });
  $('pmBody').addEventListener('keydown', e => {
    if (e.target.id === 'cmtInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      $('cmtForm').requestSubmit();
    }
  });
  $('pmBody').addEventListener('submit', e => {
    if (e.target.id !== 'cmtForm') return;
    e.preventDefault();
    const text = $('cmtInput').value.trim();
    if (!text) return;
    (myComments[pm.id] ||= []).push({
      id: `m${Date.now()}`, parentId: pm.replyTo?.id || null, createdAt: Date.now(), text, likes: 0
    });
    save(KEY.comments, myComments);
    pm.replyTo = null;
    $('cmtInput').value = '';
    $('cmtInput').style.height = 'auto';
    $('cmtSend').disabled = true;
    renderComments();
    refreshCard(pm.id);
    renderStats();
  });

  /* ======================================================
     5. 글쓰기
     ====================================================== */
  const form = $('composeForm');
  const compose = { bookId: null, tags: [] };
  let draftTimer;

  $('composeBoards').innerHTML = CM_BOARDS.filter(b => b.id !== 'all').map(b => `
    <label class="board-chip">
      <input type="radio" name="board" value="${b.id}">
      <span>${icon(b.icon)}${b.name}</span>
    </label>`).join('');

  const composeDirty = () => !!(form.elements.title.value.trim() || form.elements.body.value.trim());

  function openCompose(mode = '') {
    const draft = load(KEY.draft, null);
    form.reset();
    Object.assign(compose, { bookId: null, tags: [] });
    let board = state.view === 'feed' && state.board !== 'all' ? state.board : 'free';
    if (mode === 'quote') board = 'quote';

    if (draft && (draft.title || draft.body)) {
      form.elements.title.value = draft.title || '';
      form.elements.body.value = draft.body || '';
      board = draft.board || board;
      compose.bookId = draft.bookId || null;
      compose.tags = draft.tags || [];
      $('cSpoiler').checked = !!draft.spoiler;
      $('draftState').textContent = '임시 저장된 글을 불러왔어요';
    } else {
      $('draftState').textContent = '';
    }
    form.querySelector(`input[name="board"][value="${board}"]`).checked = true;
    $('composeError').textContent = '';
    renderPicked();
    renderTags();
    updateCounts();
    showModal('compose');
    (mode === 'book' ? $('bookSearch') : form.elements.title).focus();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-compose]');
    if (btn) openCompose(btn.dataset.compose);
  });

  function updateCounts() {
    $('cTitleCount').textContent = form.elements.title.value.length;
    $('cBodyCount').textContent = form.elements.body.value.length;
  }

  function saveDraft() {
    const f = form.elements;
    save(KEY.draft, {
      title: f.title.value, body: f.body.value, board: f.board.value,
      bookId: compose.bookId, tags: compose.tags, spoiler: $('cSpoiler').checked
    });
    const t = new Date();
    $('draftState').textContent = `임시 저장됨 · ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`;
  }

  form.addEventListener('input', e => {
    if (e.target.id === 'bookSearch' || e.target.id === 'tagInput') return;
    updateCounts();
    $('composeError').textContent = '';
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 600);
  });

  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
  });

  /* --- 책 첨부 (검색 → 선택) --- */
  let bookActive = -1;
  function renderBookResults() {
    const q = $('bookSearch').value.trim().toLowerCase();
    const box = $('bookResults');
    if (!q) { box.hidden = true; $('bookSearch').setAttribute('aria-expanded', 'false'); return; }
    const found = BOOKS.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)).slice(0, 6);
    bookActive = found.length ? 0 : -1;
    box.innerHTML = found.length
      ? found.map((b, i) => `
          <li role="option" data-pick="${b.id}" aria-selected="${i === 0}">
            ${coverHTML(b)}
            <div><strong>${escapeHTML(b.title)}</strong><span>${escapeHTML(b.author)} · ${categoryName(b.category)}</span></div>
          </li>`).join('')
      : '<li class="cm-attach__none">검색 결과가 없어요. 책 목록 페이지에서 새 책 등록을 신청할 수 있어요.</li>';
    box.hidden = false;
    $('bookSearch').setAttribute('aria-expanded', 'true');
  }

  function renderPicked() {
    const b = compose.bookId ? findBook(compose.bookId) : null;
    $('pickedBook').hidden = !b;
    $('bookSearchWrap').hidden = !!b;
    $('pickedBook').innerHTML = b ? `
      ${coverHTML(b)}
      <div><strong>${escapeHTML(b.title)}</strong><span>${escapeHTML(b.author)} · ★ ${b.rating.toFixed(1)}</span></div>
      <button type="button" class="icon-btn" data-unpick aria-label="첨부한 책 빼기">${icon('x')}</button>` : '';
  }

  function pickBook(id) {
    compose.bookId = id;
    $('bookSearch').value = '';
    $('bookResults').hidden = true;
    renderPicked();
    saveDraft();
  }

  $('bookSearch').addEventListener('input', renderBookResults);
  $('bookSearch').addEventListener('keydown', e => {
    const items = [...$('bookResults').querySelectorAll('[data-pick]')];
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      bookActive = (bookActive + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((li, i) => li.setAttribute('aria-selected', String(i === bookActive)));
    } else if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      pickBook(Number(items[Math.max(0, bookActive)].dataset.pick));
    }
  });
  $('bookResults').addEventListener('click', e => {
    const li = e.target.closest('[data-pick]');
    if (li) pickBook(Number(li.dataset.pick));
  });
  $('pickedBook').addEventListener('click', e => {
    if (!e.target.closest('[data-unpick]')) return;
    compose.bookId = null;
    renderPicked();
    saveDraft();
    $('bookSearch').focus();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.cm-attach__search')) $('bookResults').hidden = true;
  });

  /* --- 태그 --- */
  function renderTags() {
    $('tagChips').innerHTML = compose.tags.map((t, i) =>
      `<span class="tag-chip">#${escapeHTML(t)}<button type="button" data-untag="${i}" aria-label="${escapeHTML(t)} 태그 빼기">${icon('x')}</button></span>`).join('');
    $('tagInput').placeholder = compose.tags.length >= 5 ? '태그는 5개까지' : '태그 입력 후 Enter (최대 5개)';
    $('tagInput').disabled = compose.tags.length >= 5;
  }
  function addTag(raw) {
    const t = raw.replace(/[#,\s]/g, '').slice(0, 12);
    if (!t || compose.tags.includes(t) || compose.tags.length >= 5) return;
    compose.tags.push(t);
    renderTags();
    saveDraft();
  }
  $('tagInput').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && !e.ctrlKey && !e.isComposing) {
      e.preventDefault();
      addTag(e.target.value);
      e.target.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && compose.tags.length) {
      compose.tags.pop();
      renderTags();
      saveDraft();
    }
  });
  $('tagChips').addEventListener('click', e => {
    const b = e.target.closest('[data-untag]');
    if (!b) return;
    compose.tags.splice(Number(b.dataset.untag), 1);
    renderTags();
    saveDraft();
    $('tagInput').focus();
  });
  $('tagBox').addEventListener('click', e => { if (e.target === $('tagBox')) $('tagInput').focus(); });
  $('cSpoiler').addEventListener('change', saveDraft);

  /* --- 등록 --- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    const title = f.title.value.trim();
    const body = f.body.value.trim();
    if ($('tagInput').value.trim()) { addTag($('tagInput').value); $('tagInput').value = ''; }

    const error = title.length < 2 ? '제목을 2자 이상 입력해 주세요.'
      : body.length < 10 ? '내용을 10자 이상 입력해 주세요.' : '';
    if (error) {
      $('composeError').textContent = error;
      (title.length < 2 ? f.title : f.body).focus();
      return;
    }

    const post = {
      id: Date.now(), board: f.board.value, mine: true, createdAt: Date.now(),
      title, body, tags: [...compose.tags], bookId: compose.bookId, spoiler: $('cSpoiler').checked,
      likes: 0, views: 0, comments: []
    };
    myPosts.unshift(post);
    save(KEY.posts, myPosts);
    save(KEY.draft, null);
    form.reset();

    $('composeModal').hidden = true;
    openModal = null;
    document.body.classList.remove('is-locked');

    $('cmSearch').value = '';
    setState({ view: 'feed', board: state.board === 'all' ? 'all' : post.board, sort: 'latest', tag: '', keyword: '' });
    listEl.querySelector(`[data-post="${post.id}"]`)?.classList.add('is-new');
    renderWidgets();
    showToast('글이 등록됐어요! 🎉');
  });

  /* ======================================================
     6. 닉네임 바꾸기
     ====================================================== */
  $('myNick').addEventListener('click', () => {
    const btn = $('myNick');
    if (btn.querySelector('input')) return;
    btn.innerHTML = `<input class="cm-profile__nick-input" maxlength="12" value="${escapeHTML(myNick)}" aria-label="새 닉네임">`;
    const input = btn.querySelector('input');
    input.focus(); input.select();
    const finish = ok => {
      const v = input.value.trim();
      if (ok && v.length >= 2) { myNick = v; save(KEY.nick, v); showToast('닉네임을 바꿨어요.'); }
      else if (ok) showToast('닉네임은 2자 이상이어야 해요.');
      btn.textContent = myNick;
      renderFeed();
      renderWidgets();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true), { once: true });
  });

  /* ======================================================
     7. 오른쪽 위젯
     ====================================================== */
  function renderPoll() {
    const voted = load(KEY.poll, null);
    const opts = CM_POLL.options.map(o => ({ ...o, votes: o.votes + (voted === o.id ? 1 : 0) }));
    const total = opts.reduce((n, o) => n + o.votes, 0);
    $('poll').innerHTML = `
      <span class="cm-poll__label">오늘의 투표</span>
      <p class="cm-poll__q">${CM_POLL.question}</p>
      ${opts.map(o => {
        const pct = Math.round((o.votes / total) * 100);
        return `
          <button type="button" class="cm-poll__opt ${voted === o.id ? 'is-mine' : ''}" data-vote="${o.id}" ${voted ? 'disabled' : ''}>
            ${voted ? `<span class="cm-poll__bar" style="width:${pct}%"></span>` : ''}
            <span>${voted === o.id ? '✓ ' : ''}${o.label}</span>
            ${voted ? `<span class="cm-poll__pct">${pct}%</span>` : ''}
          </button>`;
      }).join('')}
      <div class="cm-poll__foot">
        <span>${total.toLocaleString()}명 참여</span>
        ${voted ? '<button type="button" data-unvote>다시 투표하기</button>' : '<span>하나를 골라주세요</span>'}
      </div>`;
  }
  $('poll').addEventListener('click', e => {
    const v = e.target.closest('[data-vote]');
    if (v && !v.disabled) { save(KEY.poll, v.dataset.vote); renderPoll(); showToast('투표했어요! 결과를 확인해 보세요.'); }
    if (e.target.closest('[data-unvote]')) { save(KEY.poll, null); renderPoll(); }
  });

  function renderWidgets() {
    const posts = allPosts().filter(p => !p.pinned);

    // 뜨는 태그: 많이 쓰이고 공감 많은 태그
    const tagScore = {};
    posts.forEach(p => p.tags.forEach(t => {
      tagScore[t] ??= { n: 0, s: 0 };
      tagScore[t].n += 1;
      tagScore[t].s += 1 + likeCount(p) / 20;
    }));
    $('trendTags').innerHTML = Object.entries(tagScore).sort((a, b) => b[1].s - a[1].s).slice(0, 9)
      .map(([t, v]) => `<button type="button" class="tag" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}<small>${v.n}</small></button>`).join('');

    // 활동 TOP 5: 글 × 10 + 받은 공감
    const users = {};
    posts.forEach(p => {
      const a = authorOf(p);
      users[a.nick] ??= { a, posts: 0, likes: 0 };
      users[a.nick].posts += 1;
      users[a.nick].likes += likeCount(p);
    });
    $('topUsers').innerHTML = Object.values(users)
      .filter(u => !u.a.staff)
      .sort((x, y) => (y.posts * 10 + y.likes) - (x.posts * 10 + x.likes)).slice(0, 5)
      .map((u, i) => `
        <li>
          <span class="cm-ranking__no">${i + 1}</span>
          ${avatar(u.a, 'sm')}
          <div class="cm-ranking__who"><strong>${escapeHTML(u.a.nick)}${u.a.me ? ' (나)' : ''}</strong><span>${CM_LEVELS[u.a.level]}</span></div>
          <span class="cm-ranking__score">글 ${u.posts} · ♥ ${u.likes}</span>
        </li>`).join('');

    // 다가오는 독서모임 (시작 전 + 자리 있음)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const clubs = CLUBS.filter(c => new Date(c.startDate + 'T00:00:00') >= today && !clubState(c).isFull)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3);
    $('upcomingClubs').innerHTML = clubs.length ? clubs.map(c => {
      const d = new Date(c.startDate + 'T00:00:00');
      return `
        <li><a href="club.html">
          <span class="cm-events__date"><span><small>${d.getMonth() + 1}월</small><br><strong>${d.getDate()}</strong></span></span>
          <span>
            <span class="cm-events__name">${escapeHTML(c.name)}</span><br>
            <span class="cm-events__info">${c.type === 'online' ? '온라인' : '오프라인'} · ${dday(c.startDate)} · ${c.capacity - clubState(c).count}자리 남음</span>
          </span>
        </a></li>`;
    }).join('') : '<li class="cm-events__info">곧 새 모임이 열려요!</li>';
  }

  document.querySelector('.cm-side').addEventListener('click', e => {
    if (e.target.closest('[data-open-notice]')) { e.preventDefault(); openPost(100); return; }
    const tag = e.target.closest('[data-tag]');
    if (tag) { $('cmSearch').value = ''; setState({ view: 'feed', board: 'all', tag: tag.dataset.tag, keyword: '' }); }
  });

  /* ======================================================
     시작
     ====================================================== */
  renderFeed();
  renderWidgets();
  renderPoll();

  // 공유 링크(?post=번호)로 들어오면 그 글 바로 열기
  const linked = Number(new URLSearchParams(location.search).get('post'));
  if (linked && findPost(linked)) openPost(linked);
});
