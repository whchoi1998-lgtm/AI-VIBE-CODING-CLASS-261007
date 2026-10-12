# 회원가입 · 마이페이지 → Supabase 연결 방법

`html/signup.html`에서 가입하면 Supabase **Authentication**에 회원이 만들어지고,
닉네임 · 관심 분야 · 소식 받기 동의는 **`profiles` 테이블**에 자동으로 저장된다.
`html/mypage.html`은 이 `profiles`에서 내 정보를 읽고 수정한다.

```
회원가입 화면 ─ signUp(이메일, 비밀번호, 닉네임 등) ─▶ auth.users (Supabase 회원)
                                                      │ 트리거가 자동 실행
                                                      ▼
                                              public.profiles (내 정보)
마이페이지 ─ 읽기 · 수정 (본인 것만, RLS) ─────────────▶ public.profiles
```

연결 정보는 `js/supabase-client.js` 한 곳에서 쓴다 (Publishable key만, Secret key 금지).

## 1. 테이블 · 트리거 만들기 (한 번만)

Supabase 대시보드 › **SQL Editor** › New query에 붙여넣고 **Run**.
DROP 명령은 없고, 다시 실행해도 이미 있는 것은 건너뛴다.

```sql
-- ========== 1) 회원 정보 테이블 ==========
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade, -- 회원 번호 (Auth 와 같은 값)
  email               text,
  nickname            text not null check (char_length(nickname) between 1 and 20),
  favorite_categories text[] not null default '{}',                                  -- 관심 분야 (예: {소설,과학})
  marketing_agreed    boolean not null default false,                                -- 소식 받기 동의
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ========== 2) 보안: 본인 정보만 보기 · 수정 ==========
alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
                 and policyname = '본인 정보만 볼 수 있음') then
    create policy "본인 정보만 볼 수 있음" on public.profiles
      for select to authenticated using ((select auth.uid()) = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
                 and policyname = '본인 정보만 고칠 수 있음') then
    create policy "본인 정보만 고칠 수 있음" on public.profiles
      for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  end if;
end $$;

-- 최소 권한: 방문자는 접근 불가, 회원은 조회 + 일부 칸만 수정 (추가 · 삭제는 트리거 · 대시보드만)
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nickname, favorite_categories, marketing_agreed, updated_at) on public.profiles to authenticated;

-- ========== 3) 가입하면 profiles 에 자동 저장하는 트리거 ==========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nickname, favorite_categories, marketing_agreed)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1)), 20),
    coalesce(array(select jsonb_array_elements_text(
      case when jsonb_typeof(new.raw_user_meta_data -> 'favorite_categories') = 'array'
           then new.raw_user_meta_data -> 'favorite_categories' else '[]'::jsonb end)), '{}'),
    coalesce((new.raw_user_meta_data ->> 'marketing_agreed')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ========== 4) 이미 있던 회원도 profiles 에 채워 넣기 (INSERT 만) ==========
insert into public.profiles (id, email, nickname)
select u.id, u.email, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'nickname'), ''), split_part(u.email, '@', 1)), 20)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ========== 5) 확인 ==========
select id, email, nickname, favorite_categories, marketing_agreed, created_at
from public.profiles
order by created_at;
```

## 2. 이메일 인증 설정 (선택)

- 기본값은 **이메일 인증 켜짐**: 가입 후 메일의 링크를 눌러야 로그인할 수 있다.
  가입 화면은 "인증 메일을 보냈어요" 안내로 바뀐다.
- 수업 · 테스트 중에 바로 로그인되게 하려면
  대시보드 › **Authentication › Sign In / Providers › Email** 에서 **Confirm email** 을 끈다.
  이때는 가입하자마자 마이페이지로 이동한다.
- 인증 메일 링크가 돌아올 주소는 사이트를 웹 서버(예: GitHub Pages, Live Server)로 열었을 때만 지정된다.
  대시보드 › **Authentication › URL Configuration** 의 Site URL / Redirect URLs 에 그 주소를 넣어 둔다.

## 3. 확인하기

1. `html/signup.html` 에서 가입 → (인증 메일 확인) → `html/login.html` 에서 로그인
2. 최상단 바의 '로그인'이 **마이페이지 · 로그아웃** 으로 바뀌는지 확인
3. 대시보드 › **Table Editor › profiles** 에 닉네임 · 관심 분야가 들어왔는지 확인
4. 마이페이지에서 닉네임을 바꾸고 저장 → profiles 에 반영되는지 확인

### 안 될 때

| 화면 안내 | 원인 |
|---|---|
| "회원 정보를 저장하지 못했어요" (가입 시) | 트리거 함수 오류. 1단계 SQL을 다시 실행했는지, profiles 칸 이름이 같은지 확인 |
| "이메일 인증이 아직 안 됐어요" (로그인 시) | 메일의 인증 링크를 누르지 않음 (또는 2단계에서 Confirm email 끄기) |
| 마이페이지 저장 시 "profiles 테이블 설정이 아직 없어요" | 1단계 SQL 미실행 |
| "요청이 너무 많아요" | Supabase 기본 메일 발송 제한(시간당 몇 통). 잠시 후 다시, 또는 Confirm email 끄기 |
