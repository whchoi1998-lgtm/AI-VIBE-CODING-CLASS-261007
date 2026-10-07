/* ==========================================================
   북톡 커뮤니티 (리뉴얼 샘플) 데이터
   - 게시판 / 샘플 글 · 댓글 / 오늘의 투표
   - 시간은 '몇 분 전'(minutesAgo)으로 적어 언제 열어도 최근 글처럼 보이게 함
   - 모든 닉네임 · 글은 예시용 가상 데이터
   ========================================================== */

const CM_BOARDS = [
  { id: 'all',       name: '홈 피드',   icon: 'home',     desc: '북톡 독자들의 모든 이야기를 한곳에서' },
  { id: 'free',      name: '자유',      icon: 'chat',     desc: '책과 일상, 무엇이든 편하게 이야기해요' },
  { id: 'recommend', name: '책 추천',   icon: 'book',     desc: '나만 알기 아까운 책을 소개해요' },
  { id: 'question',  name: '질문',      icon: 'question', desc: '궁금한 건 북톡 독자들에게 물어보세요' },
  { id: 'review',    name: '모임 후기', icon: 'users',    desc: '독서모임의 생생한 현장 이야기' },
  { id: 'quote',     name: '문장 수집', icon: 'quote',    desc: '마음에 남은 한 문장을 나눠요' }
];

// 회원 등급 (글 · 활동량에 따라)
const CM_LEVELS = ['', '새싹 독자', '책 산책러', '책벌레', '다독가', '북톡 마스터'];

const A = { // 샘플 작성자
  dawn:   { nick: '새벽독서',     level: 5, color: '#c2553a' },
  star:   { nick: '별헤는밤',     level: 4, color: '#1f2a44' },
  newbie: { nick: '책린이',       level: 1, color: '#8a9a6b' },
  walk:   { nick: '느린산책',     level: 4, color: '#2f4a3a' },
  num:    { nick: '숫자읽는밤',   level: 3, color: '#4a5d8c' },
  coffee: { nick: '커피한잔',     level: 3, color: '#9a6b4f' },
  shop:   { nick: '작은책방',     level: 2, color: '#7a4f6d' },
  cat:    { nick: '책읽는고양이', level: 3, color: '#d98b3a' },
  bear:   { nick: '생각많은곰',   level: 2, color: '#5c6e7a' },
  admin:  { nick: '북톡 운영팀',  level: 5, color: '#231f1c', staff: true }
};

const CM_POSTS = [
  {
    id: 100, board: 'free', author: A.admin, minutesAgo: 60 * 24 * 30, pinned: true,
    title: '북톡 커뮤니티가 새로워졌어요 (이용 안내)',
    body: '서로의 독서 취향을 존중해 주세요.\n결말이 담긴 글은 작성할 때 \'스포일러 포함\'을 꼭 체크해 주세요. 체크한 글은 흐리게 가려져 원하는 사람만 볼 수 있어요.\n광고·홍보성 글은 안내 없이 숨김 처리될 수 있습니다.',
    tags: ['공지'], likes: 52, views: 1520, comments: []
  },
  {
    id: 101, board: 'recommend', author: A.dawn, minutesAgo: 42,
    title: '비 오는 날 읽기 좋은 소설, 「겨울 정원의 편지」',
    body: '「달이 머무는 서점」을 읽고 비슷한 분위기의 책을 찾다가 만났어요. 할머니의 정원에서 발견한 편지 서른 통을 따라가는 이야기인데, 문장이 조용하고 따뜻해서 빗소리랑 정말 잘 어울립니다. 하루 한 통씩 아껴 읽는 걸 추천해요.',
    tags: ['소설', '힐링', '비오는날'], bookId: 7, likes: 38, views: 412,
    comments: [
      { id: 'c101-1', author: A.cat, minutesAgo: 30, text: '저도 이 책 정말 좋았어요! 편지 하나하나가 짧은 단편 같아요.', likes: 6,
        replies: [{ id: 'c101-1-1', author: A.dawn, minutesAgo: 25, text: '맞아요. 그래서 하루 한 통씩 읽기 딱 좋더라고요 :)', likes: 2 }] },
      { id: 'c101-2', author: A.newbie, minutesAgo: 12, text: '장바구니에 담았습니다. 추천 감사해요!', likes: 1, replies: [] }
    ]
  },
  {
    id: 102, board: 'review', author: A.star, minutesAgo: 60 * 3,
    title: '[후기] 과학이 궁금한 사람들 1회차 — 8분 20초 전의 태양',
    body: '첫 모임이었는데 2시간이 순식간에 지나갔어요. "우리가 보는 태양은 8분 20초 전의 태양"이라는 문장으로 시작해서, 각자 가장 놀라웠던 문장을 하나씩 나눴습니다. 과학책이 어렵다는 분들도 다들 질문이 끊이지 않았어요. 다음 회차는 4~6장입니다!',
    tags: ['독서모임', '과학', '온라인모임'], bookId: 5, likes: 47, views: 356,
    comments: [
      { id: 'c102-1', author: A.walk, minutesAgo: 150, text: '분위기 너무 좋아 보여요. 다음 기수 열리면 꼭 신청할게요.', likes: 4, replies: [] },
      { id: 'c102-2', author: A.bear, minutesAgo: 90, text: '혹시 녹화본 같은 건 없나요? 이번 회차를 놓쳤어요 ㅠㅠ', likes: 2,
        replies: [{ id: 'c102-2-1', author: A.star, minutesAgo: 80, text: '녹화는 안 하지만 요약 노트를 단톡방에 올려두었어요!', likes: 5 }] }
    ]
  },
  {
    id: 103, board: 'question', author: A.newbie, minutesAgo: 60 * 5,
    title: '독서모임 처음인데, 책을 다 못 읽으면 실례일까요?',
    body: '다음 주에 처음으로 오프라인 모임에 나가요. 회사 일이 바빠서 절반 정도밖에 못 읽을 것 같은데 괜찮을까요? 다들 메모는 어떻게 하시는지도 궁금합니다.',
    tags: ['독서모임', '질문', '초보'], likes: 12, views: 241,
    comments: [
      { id: 'c103-1', author: A.dawn, minutesAgo: 280, text: '전혀요! 읽은 만큼만 이야기해도 충분해요. 오히려 "여기까지 읽었는데 이 부분이 궁금했다"는 이야기가 대화를 풍성하게 만들어요.', likes: 14, replies: [] },
      { id: 'c103-2', author: A.coffee, minutesAgo: 200, text: '저는 포스트잇에 페이지 번호랑 한 줄 생각만 적어가요. 부담 없이 시작해 보세요!', likes: 8, replies: [] },
      { id: 'c103-3', author: A.cat, minutesAgo: 120, text: '휴대폰 메모장에 인상 깊은 문장 사진 찍어두는 것도 편해요 📸', likes: 3, replies: [] }
    ]
  },
  {
    id: 104, board: 'quote', author: A.walk, minutesAgo: 60 * 8,
    title: '"느리게 걷는다는 건 게으르다는 뜻이 아니다"',
    body: '느리게 걷는다는 건 게으르다는 뜻이 아니다. 그저 발밑과 하늘을 번갈아 볼 여유를 갖는다는 뜻이다.\n\n— 「조금 느리게 걷는 법」 중에서\n\n요즘 너무 바쁘게 살고 있었는데, 이 문장 읽고 오늘은 한 정거장 일찍 내려서 걸어왔어요.',
    tags: ['에세이', '오늘의문장'], bookId: 2, likes: 64, views: 503,
    comments: [
      { id: 'c104-1', author: A.shop, minutesAgo: 400, text: '저도 이 문장 필사해서 책상에 붙여뒀어요.', likes: 7, replies: [] }
    ]
  },
  {
    id: 105, board: 'free', author: A.coffee, minutesAgo: 60 * 13,
    title: '책 읽을 때 듣는 음악 공유해요 🎧',
    body: '저는 가사 없는 피아노 곡을 틀어둬요. 소설 읽을 땐 빗소리 ASMR, 경제·경영 책 읽을 땐 로파이 힙합이 집중이 잘 되더라고요. 여러분은 어떤 음악 들으세요?',
    tags: ['독서환경', '플레이리스트'], likes: 29, views: 388,
    comments: [
      { id: 'c105-1', author: A.num, minutesAgo: 700, text: '저는 아무것도 안 들어야 집중이 돼요… 카페 백색소음 정도?', likes: 3, replies: [] },
      { id: 'c105-2', author: A.star, minutesAgo: 600, text: '우주 다큐 배경음악 추천합니다. 과학책이랑 찰떡이에요.', likes: 5, replies: [] }
    ]
  },
  {
    id: 106, board: 'recommend', author: A.num, minutesAgo: 60 * 20,
    title: '경제 입문서로 「작은 가게의 큰 숫자」 강력 추천',
    body: '경제 공부를 처음 시작하는 분들께 부담 없이 추천할 만한 책이에요. 예시가 동네 빵집이라 원가율, 손익분기점 같은 개념이 머리에 쏙쏙 들어옵니다. 사이드 프로젝트 하시는 분들께도 좋아요.',
    tags: ['경제경영', '입문서'], bookId: 4, likes: 21, views: 264,
    comments: []
  },
  {
    id: 107, board: 'question', author: A.shop, minutesAgo: 60 * 26,
    title: 'ISBN 없는 독립출판물도 북톡에 등록할 수 있나요?',
    body: '좋아하는 독립출판 에세이가 있는데 북톡에 없어서요. 새 책 등록 신청 기준에 ISBN이 있어야 한다고 되어 있던데, 예외가 있을까요?',
    tags: ['새책등록', '독립출판'], likes: 5, views: 98,
    comments: [
      { id: 'c107-1', author: A.admin, minutesAgo: 60 * 24, text: '안녕하세요, 북톡 운영팀입니다. 현재는 ISBN이 있는 도서만 등록하고 있지만, 독립출판물 등록도 검토 중이에요. 소식이 생기면 공지로 알려드릴게요!', likes: 9, replies: [] }
    ]
  },
  {
    id: 108, board: 'review', author: A.cat, minutesAgo: 60 * 30, spoiler: true,
    title: '[스포] 「달이 머무는 서점」 마지막 장 이야기 나눠요',
    body: '결국 주인공이 서가 맨 아래 칸에서 찾은 책이 열한 살 여름의 기억이었다는 게… 그리고 마지막에 서점 주인이 사실 누구였는지 밝혀지는 장면에서 소름이 돋았어요. 다들 그 장면 어떻게 읽으셨어요?',
    tags: ['소설', '스포일러', '결말토론'], bookId: 1, likes: 33, views: 290,
    comments: [
      { id: 'c108-1', author: A.dawn, minutesAgo: 60 * 28, text: '저는 두 번째 읽을 때 앞부분 복선이 다 보여서 더 좋았어요.', likes: 6, replies: [] }
    ]
  },
  {
    id: 109, board: 'free', author: A.walk, minutesAgo: 60 * 40,
    title: '올해 목표 30권, 10월에 드디어 달성했습니다 🎉',
    body: '작년에 12권 읽고 올해는 30권을 목표로 했는데 드디어 달성했어요. 북톡 미리보기로 첫 장을 읽고 고른 책들이 실패가 적었던 게 큰 도움이 됐습니다. 남은 두 달은 벽돌책에 도전해 볼게요!',
    tags: ['독서목표', '자랑'], likes: 88, views: 712,
    comments: [
      { id: 'c109-1', author: A.newbie, minutesAgo: 60 * 38, text: '와 대단하세요! 저도 내년엔 도전해 볼게요.', likes: 2, replies: [] },
      { id: 'c109-2', author: A.coffee, minutesAgo: 60 * 35, text: '축하드려요! 올해 최고의 책은 뭐였나요?', likes: 3,
        replies: [{ id: 'c109-2-1', author: A.walk, minutesAgo: 60 * 34, text: '「우주는 생각보다 가깝다」요! 고민 없이 1등이에요.', likes: 4 }] }
    ]
  },
  {
    id: 110, board: 'quote', author: A.star, minutesAgo: 60 * 52,
    title: '"우주는 멀리 있는 것 같지만, 매일 아침 우리 얼굴 위에 내려앉는다"',
    body: '— 「우주는 생각보다 가깝다」 중에서\n\n출근길 햇빛이 다르게 느껴지는 문장이에요.',
    tags: ['과학', '오늘의문장'], bookId: 5, likes: 57, views: 431,
    comments: []
  },
  {
    id: 111, board: 'question', author: A.bear, minutesAgo: 60 * 70,
    title: '자기계발서, 읽고 나서 실천까지 이어가는 팁 있나요?',
    body: '읽을 땐 의욕이 넘치는데 일주일만 지나면 다 잊어버려요. 「하루 15분의 기적」 읽고 있는데, 이번엔 꼭 실천해 보고 싶습니다.',
    tags: ['자기계발', '습관'], bookId: 6, likes: 15, views: 187,
    comments: [
      { id: 'c111-1', author: A.num, minutesAgo: 60 * 65, text: '책 덮자마자 딱 하나만 오늘 해보는 거요. 15분 챌린지 모임도 추천해요!', likes: 6, replies: [] }
    ]
  }
];

// 오늘의 투표
const CM_POLL = {
  id: 'poll-2026-10',
  question: '가장 책이 잘 읽히는 시간은 언제인가요?',
  options: [
    { id: 'morning', label: '출근 전 이른 아침', votes: 128 },
    { id: 'commute', label: '출퇴근 지하철', votes: 214 },
    { id: 'lunch',   label: '점심시간 카페', votes: 76 },
    { id: 'night',   label: '자기 전 침대', votes: 302 }
  ]
};
