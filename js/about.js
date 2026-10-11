/* ==========================================================
   북톡 서비스 소개 페이지 (html/about.html) 스크립트
   - 상단 통계 (도서 · 분야 · 독서모임 수)
   - 헤더 도서 검색 → 책 목록 페이지로 이동
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- 상단 통계 ---------- */
  document.getElementById('pageStats').innerHTML = `
    <div><dt>등록 도서</dt><dd>${BOOKS.length}<small>권</small></dd></div>
    <div><dt>분야</dt><dd>${CATEGORIES.length - 1}<small>개</small></dd></div>
    <div><dt>독서모임</dt><dd>${CLUBS.length}<small>개</small></dd></div>`;

  /* ---------- 헤더 검색: 책 목록 페이지에서 결과 보기 ---------- */
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
  });
});
