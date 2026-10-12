/* ==========================================================
   북톡 마이페이지 (html/mypage.html) 스크립트
   - 로그인 확인 (안 했으면 로그인 페이지로, 로그인 후 다시 여기로)
   - 내 정보: Supabase profiles 테이블에서 읽기 · 수정 (본인 것만, RLS)
   - 비밀번호 변경 (Supabase Auth)
   - 신청한 독서모임 (이 브라우저에 저장된 신청 목록)
   - 헤더 도서 검색 → 책 목록 페이지로 이동
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const db = window.supabaseClient;
  const notice = document.getElementById('mypageNotice');
  const body = document.getElementById('mypageBody');

  /* ---------- 헤더 검색: 책 목록 페이지에서 결과 보기 ---------- */
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
  });

  if (!db) {
    notice.textContent = 'Supabase 연결 정보가 아직 없어요. js/supabase-client.js 를 확인해 주세요.';
    return;
  }

  // 로그인 확인
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.replace('login.html?next=mypage.html');
    return;
  }
  const user = session.user;

  // 내 정보 불러오기 (profiles 테이블이 아직 없거나 비어 있으면 가입 정보로 대신 표시)
  const meta = user.user_metadata || {};
  let profile = {
    nickname: meta.nickname || user.email.split('@')[0],
    favorite_categories: meta.favorite_categories || [],
    marketing_agreed: !!meta.marketing_agreed,
    created_at: user.created_at
  };
  let hasProfileRow = false;

  const { data: row, error: loadError } = await db
    .from('profiles')
    .select('nickname, favorite_categories, marketing_agreed, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (loadError) console.error('프로필 불러오기 실패:', loadError);
  if (row) { profile = row; hasProfileRow = true; }

  notice.hidden = true;
  body.hidden = false;
  renderProfile();
  renderClubs();

  /* ---------- 프로필 카드 ---------- */
  function renderProfile() {
    document.getElementById('mpAvatar').textContent = profile.nickname.charAt(0).toUpperCase();
    document.getElementById('mpNick').textContent = profile.nickname;
    document.getElementById('mpEmail').textContent = user.email;
    document.getElementById('mpJoined').textContent = new Date(profile.created_at).toLocaleDateString('ko-KR');
    document.getElementById('mpCats').textContent = profile.favorite_categories.length
      ? profile.favorite_categories.join(', ') : '아직 고르지 않았어요';

    const form = document.getElementById('profileForm');
    form.elements.nickname.value = profile.nickname;
    form.elements.marketing.checked = profile.marketing_agreed;
    document.getElementById('mpCategories').innerHTML = categoryChipsHTML('categories', profile.favorite_categories);
  }

  /* ---------- 신청한 독서모임 ---------- */
  function renderClubs() {
    const list = document.getElementById('mpClubs');
    const clubs = CLUBS.filter(c => joinedClubs.has(c.id));
    list.innerHTML = clubs.length
      ? clubs.map(c => `
          <li>
            <div>
              <strong>${escapeHTML(c.name)}</strong>
              <span>${escapeHTML(c.schedule)} · ${c.type === 'online' ? '온라인' : '오프라인'}</span>
            </div>
            <span class="mypage-clubs__dday">${dday(c.startDate)}</span>
          </li>`).join('')
      : '<li class="mypage-clubs__empty">아직 신청한 모임이 없어요. <a href="club.html">독서모임 보러 가기</a></li>';
  }

  function setError(input, msg) {
    const field = input.closest('.field');
    field.classList.toggle('is-error', !!msg);
    field.querySelector('.field__error').textContent = msg;
    return !msg;
  }
  document.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('is-error')) setError(e.target, '');
  });

  /* ---------- 내 정보 수정 ---------- */
  const profileForm = document.getElementById('profileForm');
  profileForm.addEventListener('submit', async e => {
    e.preventDefault();
    const nickInput = profileForm.elements.nickname;
    const nickname = nickInput.value.trim();
    if (!setError(nickInput, !nickname ? '닉네임을 입력해 주세요.'
      : nickname.length >= 2 && nickname.length <= 12 ? '' : '닉네임은 2~12자로 정해 주세요.')) {
      nickInput.focus();
      return;
    }
    if (!hasProfileRow) {
      showToast('profiles 테이블 설정이 아직 없어요. md/supabase-auth.md 를 확인해 주세요.');
      return;
    }

    const changes = {
      nickname,
      favorite_categories: [...profileForm.querySelectorAll('input[name="categories"]:checked')].map(cb => cb.value),
      marketing_agreed: profileForm.elements.marketing.checked,
      updated_at: new Date().toISOString()
    };
    const btn = document.getElementById('profileSubmit');
    btn.disabled = true;
    const { error } = await db.from('profiles').update(changes).eq('id', user.id);
    btn.disabled = false;

    if (error) {
      console.error('프로필 저장 실패:', error);
      showToast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    Object.assign(profile, changes);
    renderProfile();
    showToast('내 정보를 저장했어요.');
  });

  /* ---------- 비밀번호 변경 ---------- */
  const pwForm = document.getElementById('passwordForm');
  pwForm.addEventListener('submit', async e => {
    e.preventDefault();
    const { password, password2 } = pwForm.elements;
    const ok = [
      setError(password, passwordProblem(password.value)),
      setError(password2, !password2.value ? '비밀번호를 한 번 더 입력해 주세요.'
        : password2.value === password.value ? '' : '비밀번호가 서로 달라요.')
    ].every(Boolean);
    if (!ok) { pwForm.querySelector('.is-error input')?.focus(); return; }

    const btn = document.getElementById('passwordSubmit');
    btn.disabled = true;
    const { error } = await db.auth.updateUser({ password: password.value });
    btn.disabled = false;

    if (error) {
      console.error('비밀번호 변경 실패:', error);
      setError(password, /different|same/i.test(error.message)
        ? '지금 쓰는 비밀번호와 다르게 정해 주세요.' : '비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    pwForm.reset();
    showToast('비밀번호를 바꿨어요.');
  });

  /* ---------- 로그아웃 ---------- */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    location.href = '../index.html';
  });
});
