# 문의하기 → Supabase 연결 방법

`html/support.html`의 문의 양식은 Supabase의 **`inquiries` 테이블**에 문의 내용을 저장한다.
아래 1~3단계를 한 번만 해 두면 된다.

## 1. 테이블 만들기

Supabase 대시보드 › **SQL Editor** › New query에 아래 내용을 붙여넣고 **Run**을 누른다.

```sql
-- 문의 내용을 저장할 테이블
create table public.inquiries (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 30),
  email      text not null check (char_length(email) between 3 and 100),
  category   text not null,
  title      text not null check (char_length(title) between 1 and 60),
  message    text not null check (char_length(message) between 10 and 1000),
  agreed     boolean not null check (agreed)
);

-- 보안(RLS) 켜기: 방문자는 '문의 쓰기'만 가능, 다른 사람의 문의는 읽을 수 없음
alter table public.inquiries enable row level security;

create policy "누구나 문의를 남길 수 있음"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);
```

- 읽기(select) 정책은 일부러 만들지 않는다. 문의 내용은 **대시보드의 Table Editor**에서만 확인한다.

## 2. 연결 정보 넣기

대시보드 › **Project Settings › API**에서 두 값을 복사해 `js/support.js` 맨 위에 넣는다.

```js
const SUPABASE_URL = 'https://프로젝트주소.supabase.co';
const SUPABASE_KEY = 'anon public 키 (또는 publishable 키)';
```

- **service_role(secret) 키는 절대 넣지 않는다.** 화면 코드는 누구나 볼 수 있다.
- anon 키는 공개돼도 괜찮다. 1단계의 RLS 정책 때문에 '쓰기'만 할 수 있다.

## 3. 확인하기

1. `html/support.html`을 열고 문의를 하나 보낸다 → "문의가 접수됐어요" 안내가 보이면 성공
2. 대시보드 › **Table Editor › inquiries**에 방금 쓴 문의가 들어왔는지 확인

### 안 될 때

| 화면 안내 | 원인 |
|---|---|
| "Database 연결 정보가 아직 없어요" | `SUPABASE_URL` · `SUPABASE_KEY`가 비어 있음 |
| "문의를 보내지 못했어요" | F12 › Console의 `문의 저장 실패` 메시지 확인. 테이블 이름 · 칸 이름이 1단계와 다르거나, RLS 정책이 없는 경우가 대부분 |
