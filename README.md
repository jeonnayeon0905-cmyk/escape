# 방탈출 기록

내가 다녀온 방탈출 기록을 저장하고 돌아보는 개인용 웹앱입니다.
모바일 우선 반응형 · Google 로그인 · Supabase 클라우드 DB · Netlify 배포.

- **기술**: Vite + React, `@supabase/supabase-js` (Auth + Postgres), react-router
- **데이터**: 모든 기록은 Supabase DB 에 저장됩니다. 브라우저에는 로그인 세션과 "작성 중 임시저장"만 남습니다.
  → 휴대폰을 바꾸거나 캐시를 지워도, 같은 Google 계정으로 로그인하면 기록이 그대로 보입니다.
- **보안**: RLS(Row Level Security)로 본인(`auth.uid() = user_id`) 기록만 조회·등록·수정·삭제할 수 있습니다.
- 디자인 규칙은 [DESIGN.md](DESIGN.md) 참고.

## 화면
| 경로 | 내용 |
|---|---|
| `/` | 홈: 총/성공/실패 요약, 기록 추가 버튼, 실시간 검색, 최신순 카드 목록 |
| `/records` | 기록 목록: 검색 + 성공/실패 필터 + 정렬(최신/오래된/난이도) |
| `/records/new` | 기록 추가 |
| `/records/:id` | 기록 상세 (수정 / 삭제 — 삭제 전 확인창) |
| `/records/:id/edit` | 기록 수정 |
| `/stats` | 통계: 총·성공률·최근 3개월, 월별(6개월), 성공/실패, 난이도 분포, 가장 많이 간 카페, 최고 난이도 성공 |

## 데이터 안정성
- 저장 버튼을 누르면 "저장 중…" 표시, 중복 클릭 방지
- **DB 저장이 성공한 뒤에만** 목록·통계를 갱신하고 홈으로 이동
- 실패 시(네트워크 끊김, 응답 지연 15초, DB 오류, 로그인 만료) 원인을 한국어로 안내하고 **입력 내용은 그대로 유지**
- 수정 시 불러온 시점의 `updated_at` 과 비교해 **다른 기기에서 먼저 바뀐 내용을 덮어쓰지 않음** (최신 불러오기 / 내 수정으로 덮어쓰기 선택)
- 새 기록 작성 중 내용은 이 기기에 자동 임시저장, 작성 중 화면을 벗어나면 확인
- 삭제 전 "정말 이 기록을 삭제하시겠습니까?" 확인
- 계정 메뉴(우측 상단 프로필)에서 전체 기록 JSON 백업 파일 다운로드

---

## 설정 방법 (처음 한 번)

### 1. Supabase 프로젝트 만들기 (무료 플랜)
1. <https://supabase.com> 에서 새 프로젝트 생성
2. **SQL Editor** 에서 [`supabase/schema.sql`](supabase/schema.sql) 내용을 전부 붙여넣고 **Run**
   → `escape_records` 테이블, 인덱스, `updated_at` 트리거, RLS 정책이 만들어집니다.
3. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사

### 2. Google 로그인 연결
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **OAuth 클라이언트 ID 만들기** (웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://<프로젝트-ref>.supabase.co/auth/v1/callback`
   - (OAuth 동의 화면을 먼저 설정해야 할 수 있습니다. 게시 상태를 "프로덕션"으로 두면 테스트 사용자 제한이 없습니다.)
2. Supabase → **Authentication → Sign In / Providers → Google** 활성화, 위 Client ID / Secret 입력
3. Supabase → **Authentication → URL Configuration**
   - Site URL: `https://<내-사이트>.netlify.app`
   - Redirect URLs 에 추가: `https://<내-사이트>.netlify.app/**`, `http://localhost:5173/**`

로그인 세션은 기기에 저장되고 자동 갱신되므로 한 번 로그인하면 계속 유지됩니다.
(Supabase → Authentication → Sessions 에서 세션 만료를 따로 설정하지 않으면 로그아웃할 때까지 유지)

### 3. 로컬 실행
```bash
cp .env.example .env      # 값 채우기
npm install
npm run dev               # http://localhost:5173
```

### 4. Netlify 배포
1. Netlify → **Add new site → Import from Git** 에서 이 저장소 선택
   (빌드 설정은 `netlify.toml` 에 있음: `npm run build`, 게시 폴더 `dist`)
2. **Site configuration → Environment variables** 에 추가
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 배포 후 사이트 주소를 위 2-3 단계의 Supabase Site URL / Redirect URLs 에 등록

> `anon` 키는 브라우저에 공개되어도 되는 키입니다. 데이터 보호는 RLS 정책이 담당합니다.
> `service_role` 키는 절대 프론트엔드나 Netlify 환경 변수에 넣지 마세요.
