/* ==========================================================
   북톡 독서모임 페이지 (html/club.html) 스크립트
   - 모임 목록 : 종류 탭(모집 중 / 온라인 / 오프라인 / 내가 신청한) · 정렬 · 참여 신청
   - 모임 개설 문의
   (모임 카드 · 신청 저장은 common.js 공용)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const FILTERS = [
    { id: 'all', name: '전체', test: () => true },
    { id: 'open', name: '모집 중', test: c => !clubState(c).isFull },
    { id: 'online', name: '온라인', test: c => c.type === 'online' },
    { id: 'offline', name: '오프라인', test: c => c.type === 'offline' },
    { id: 'mine', name: '내가 신청한 모임', test: c => joinedClubs.has(c.id) }
  ];
  const SORTS = {
    start: (a, b) => a.startDate.localeCompare(b.startDate),
    seats: (a, b) => (b.capacity - clubState(b).count) - (a.capacity - clubState(a).count)
  };

  const tabsEl = document.getElementById('clubTabs');
  const gridEl = document.getElementById('clubGrid');
  const sortEl = document.getElementById('clubSort');
  const state = { filter: 'all', sort: 'start' };

  // 메인 등에서 club.html#mine 으로 오면 '내가 신청한 모임' 탭으로 시작
  if (FILTERS.some(f => f.id === location.hash.slice(1))) state.filter = location.hash.slice(1);

  tabsEl.innerHTML = FILTERS.map(f =>
    `<button type="button" class="tab" role="tab" data-filter="${f.id}">${f.name}</button>`).join('');

  function renderStats() {
    const open = CLUBS.filter(c => !clubState(c).isFull).length;
    document.getElementById('pageStats').innerHTML = `
      <div><dt>전체 모임</dt><dd>${CLUBS.length}<small>개</small></dd></div>
      <div><dt>모집 중</dt><dd>${open}<small>개</small></dd></div>
      <div><dt>내가 신청한 모임</dt><dd>${joinedClubs.size}<small>개</small></dd></div>`;
  }

  function render() {
    tabsEl.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.filter === state.filter;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });

    const filter = FILTERS.find(f => f.id === state.filter);
    const list = CLUBS.filter(filter.test).sort(SORTS[state.sort]);
    document.getElementById('clubResult').textContent = `${filter.name} · ${list.length}개`;

    gridEl.innerHTML = list.length
      ? list.map(clubCardHTML).join('')
      : `<li class="books__empty">${state.filter === 'mine'
          ? '아직 신청한 모임이 없어요. 마음에 드는 모임에 참여해 보세요!'
          : '조건에 맞는 모임이 없어요.'}</li>`;
    renderStats();
  }

  tabsEl.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    state.filter = tab.dataset.filter;
    render();
  });
  tabsEl.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...tabsEl.querySelectorAll('.tab')];
    const cur = tabs.indexOf(document.activeElement);
    const next = tabs[(cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });

  sortEl.addEventListener('change', () => { state.sort = sortEl.value; render(); });

  gridEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-club]');
    if (!btn || btn.disabled) return;
    showToast(toggleClubJoin(Number(btn.dataset.club)));
    render();
  });

  document.getElementById('hostBtn').addEventListener('click', () => {
    showToast('모임 개설 문의는 카카오톡 채널로 받고 있어요. 상단의 카카오톡 아이콘을 눌러 주세요!');
  });

  render();
});
