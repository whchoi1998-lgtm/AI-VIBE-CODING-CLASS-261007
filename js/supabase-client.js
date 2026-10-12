/* ==========================================================
   북톡 Supabase 연결 (모든 페이지 공용)
   - @supabase/supabase-js v2 (CDN) 로 Supabase Client 를 한 번만 만든다.
   - 다른 스크립트에서는 window.supabaseClient 로 사용한다.
     (연결 정보가 비어 있거나 라이브러리를 못 불러오면 null)
   - HTML 에서 불러오는 순서: supabase-js CDN → supabase-client.js → 페이지 스크립트
   ========================================================== */

(() => {
  /* ---------- Supabase 연결 정보 ----------
     Supabase 대시보드에서 복사해 넣어 주세요.
     - SUPABASE_URL             : Project URL (예: https://abcdefgh.supabase.co)
                                  › 프로젝트 화면 위쪽 [Connect] 버튼, 또는 Settings › Data API
     - SUPABASE_PUBLISHABLE_KEY : Publishable key (sb_publishable_ 로 시작) › Settings › API Keys
                                  또는 예전 방식의 anon public 키
     ※ Secret key(sb_secret_…) · service_role 키는 절대 넣지 마세요.
       이 파일은 브라우저에서 누구나 볼 수 있습니다. */
  const SUPABASE_URL = 'https://pnvvtrwmmgjrgfxbwftw.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xf9YLSAZCZAHM9E2SRsLOQ_04KNQHi7';

  window.supabaseClient = null;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.info('[Supabase] 연결 정보가 비어 있어요. js/supabase-client.js 에 URL 과 Publishable key 를 입력해 주세요.');
    return;
  }
  if (!window.supabase?.createClient) {
    console.error('[Supabase] supabase-js 라이브러리를 불러오지 못했어요. CDN <script> 가 supabase-client.js 보다 먼저 있는지 확인해 주세요.');
    return;
  }

  // 브라우저에 쓰면 안 되는 키가 들어오면 연결하지 않음
  if (isSecretKey(SUPABASE_PUBLISHABLE_KEY)) {
    console.error('[Supabase] Secret key 는 브라우저에서 사용할 수 없어요. Publishable key 로 바꿔 주세요.');
    return;
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  // sb_secret_ 키, 또는 role 이 service_role 인 예전 JWT 키인지 확인
  function isSecretKey(key) {
    if (key.startsWith('sb_secret_')) return true;
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role === 'service_role';
    } catch (e) {
      return false; // JWT 형식이 아니면(sb_publishable_ 등) 통과
    }
  }
})();
