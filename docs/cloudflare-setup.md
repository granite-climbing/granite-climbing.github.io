# Cloudflare Workers + D1 Database 설정 가이드

이 가이드는 Granite 클라이밍 앱의 베타 영상 제출 기능을 위한 Cloudflare Workers와 D1 Database 설정 방법을 설명합니다.

## 목차

1. [Cloudflare 계정 생성](#1-cloudflare-계정-생성)
2. [Wrangler CLI 설치](#2-wrangler-cli-설치)
3. [D1 Database 생성](#3-d1-database-생성)
4. [Worker 배포](#4-worker-배포)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [테스트 및 검증](#6-테스트-및-검증)
7. [문제 해결](#7-문제-해결)

---

## 1. Cloudflare 계정 생성

### 1.1 계정 가입
1. [Cloudflare 웹사이트](https://dash.cloudflare.com/sign-up)에서 계정 생성
2. 이메일 인증 완료
3. 무료 플랜(Free) 선택

### 1.2 Workers 활성화
1. Cloudflare 대시보드 로그인
2. 좌측 메뉴에서 **Workers & Pages** 클릭
3. **Create application** 버튼 클릭하여 Workers 활성화

**참고**: 무료 플랜에서는 하루 10만 요청까지 사용 가능합니다.

---

## 2. Wrangler CLI 설치

Wrangler는 Cloudflare Workers를 로컬에서 개발하고 배포하기 위한 CLI 도구입니다.

### 2.1 Node.js 확인
먼저 Node.js가 설치되어 있는지 확인합니다:

```bash
node --version  # v16.13.0 이상 필요
npm --version
```

### 2.2 Wrangler 설치
프로젝트의 workers 디렉토리로 이동하여 의존성을 설치합니다:

```bash
cd workers
npm install
```

Wrangler는 이미 `package.json`의 devDependencies에 포함되어 있습니다.

### 2.3 Wrangler 인증
Cloudflare 계정에 Wrangler를 연결합니다:

```bash
npx wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하여 권한을 부여합니다.

### 2.4 인증 확인
```bash
npx wrangler whoami
```

계정 정보가 표시되면 성공입니다.

---

## 3. D1 Database 생성

D1은 Cloudflare의 서버리스 SQLite 데이터베이스입니다.

### 3.1 데이터베이스 생성
```bash
npx wrangler d1 create granite
```

**출력 예시**:
```
✅ Successfully created DB 'granite'

[[d1_databases]]
binding = "DB"
database_name = "granite"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**중요**: `database_id` 값을 복사해둡니다. 이 값은 `wrangler.toml` 파일에 추가해야 합니다.

### 3.2 wrangler.toml 업데이트
`workers/wrangler.toml` 파일을 엽니다:

```toml
name = "granite"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
ALLOWED_ORIGIN = "https://granite-climbing.github.io"

# D1 database binding for beta videos
[[d1_databases]]
binding = "DB"
database_name = "granite"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # 여기에 실제 database_id 입력
```

`database_id`를 복사한 실제 값으로 교체합니다.

### 3.3 데이터베이스 스키마 적용
`schema.sql` 파일을 사용하여 테이블을 생성합니다:

```bash
npx wrangler d1 execute granite --file=./schema.sql
```

**성공 메시지**:
```
🌀 Executing on granite (a1b2c3d4-e5f6-7890-abcd-ef1234567890):
🌀 To execute on your local development database, use --local
🚣 Executed 4 commands in 0.5s
```

### 3.4 테이블 생성 확인
```bash
npx wrangler d1 execute granite --command="SELECT name FROM sqlite_master WHERE type='table'"
```

**출력**:
```
┌──────────────┐
│ name         │
├──────────────┤
│ beta_videos  │
└──────────────┘
```

`beta_videos` 테이블이 표시되면 성공입니다.

### 3.5 테스트 데이터 삽입 (선택사항)
```bash
npx wrangler d1 execute granite --command="INSERT INTO beta_videos (problem_slug, instagram_url, instagram_post_id, thumbnail_url, submitted_at, status) VALUES ('test-problem', 'https://www.instagram.com/p/ABC123/', 'ABC123', 'https://example.com/thumbnail.jpg', '2025-02-22T10:00:00Z', 'approved')"
```

### 3.6 데이터 확인
```bash
npx wrangler d1 execute granite --command="SELECT * FROM beta_videos"
```

---

## 4. Worker 배포

### 4.1 로컬 테스트 (선택사항)
배포하기 전에 로컬에서 Worker를 테스트할 수 있습니다:

```bash
npm run dev
```

이제 `http://localhost:8787`에서 Worker를 테스트할 수 있습니다.

**다른 터미널에서 테스트**:
```bash
# GET 요청 테스트
curl "http://localhost:8787/beta-videos?problem=test-problem"

# POST 요청 테스트
curl -X POST http://localhost:8787/beta-videos \
  -H "Content-Type: application/json" \
  -d '{"problemSlug":"test-problem","instagramUrl":"https://www.instagram.com/p/ABC123/"}'
```

종료하려면 `Ctrl+C`를 누릅니다.

### 4.2 프로덕션 배포
```bash
npm run deploy
```

**성공 메시지**:
```
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded granite (x.xx sec)
Published granite (x.xx sec)
  https://granite.your-account.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**중요**: 출력된 Worker URL(`https://granite.your-account.workers.dev`)을 복사해둡니다.

---

## 5. 환경 변수 설정

### 5.1 Instagram API 시크릿 설정
Instagram API 토큰과 사용자 ID를 설정합니다:

```bash
# Instagram Access Token 설정
npx wrangler secret put INSTAGRAM_ACCESS_TOKEN
# 프롬프트가 나타나면 토큰 값 입력

# Instagram User ID 설정
npx wrangler secret put INSTAGRAM_USER_ID
# 프롬프트가 나타나면 사용자 ID 입력
```

**참고**: 시크릿 값은 안전하게 암호화되어 저장되며, `wrangler.toml` 파일에는 저장되지 않습니다.

### 5.2 프론트엔드 환경 변수 설정
Next.js 프로젝트의 `.env.local` 파일에 Worker URL을 추가합니다:

```bash
# 프로젝트 루트 디렉토리로 이동
cd ../..

# .env.local 파일 편집
echo 'NEXT_PUBLIC_INSTAGRAM_API_URL=https://granite.your-account.workers.dev' >> .env.local
```

`your-account` 부분을 실제 Cloudflare 계정 이름으로 교체합니다.

---

## 6. 테스트 및 검증

### 6.1 Worker 엔드포인트 테스트

**베타 영상 조회 테스트**:
```bash
curl "https://granite.your-account.workers.dev/beta-videos?problem=test-problem"
```

**예상 응답**:
```json
{
  "videos": [
    {
      "id": 1,
      "instagramUrl": "https://www.instagram.com/p/ABC123/",
      "submittedAt": "2025-02-22T10:00:00Z"
    }
  ]
}
```

**베타 영상 제출 테스트**:
```bash
curl -X POST https://granite.your-account.workers.dev/beta-videos \
  -H "Content-Type: application/json" \
  -d '{
    "problemSlug": "test-problem-2",
    "instagramUrl": "https://www.instagram.com/p/DEF456/"
  }'
```

**예상 응답**:
```json
{
  "success": true,
  "id": 2
}
```

**해시태그 검색 테스트** (기존 기능 확인):
```bash
curl "https://granite.your-account.workers.dev/?hashtag=climbing"
```

### 6.2 프론트엔드 통합 테스트

1. Next.js 개발 서버 시작:
   ```bash
   npm run dev
   ```

2. 브라우저에서 `http://localhost:3000` 접속

3. 볼더 상세 페이지에서 문제 선택 → 베타 버튼 클릭

4. "베타 영상 올리기" 버튼 클릭

5. Instagram URL 입력 및 제출:
   - 예: `https://www.instagram.com/p/ABC123/`

6. 제출 성공 후 베타 시트에 영상이 표시되는지 확인

### 6.3 데이터베이스 확인
```bash
cd workers/instagram-proxy
npx wrangler d1 execute granite --command="SELECT * FROM beta_videos ORDER BY submitted_at DESC LIMIT 10"
```

---

## 7. 문제 해결

### 7.1 "Database not found" 오류
**증상**: Worker 실행 시 데이터베이스를 찾을 수 없다는 오류

**해결방법**:
1. `wrangler.toml`의 `database_id`가 올바른지 확인
2. 데이터베이스 목록 확인:
   ```bash
   npx wrangler d1 list
   ```
3. 다시 배포:
   ```bash
   npx wrangler deploy
   ```

### 7.2 CORS 오류
**증상**: 프론트엔드에서 API 호출 시 CORS 에러

**해결방법**:
1. `wrangler.toml`의 `ALLOWED_ORIGIN` 확인:
   - 로컬 개발: `http://localhost:3000`
   - 프로덕션: `https://granite-climbing.github.io`

2. 개발 시 임시로 모든 origin 허용 (프로덕션에서는 비권장):
   ```toml
   [vars]
   ALLOWED_ORIGIN = "*"
   ```

### 7.3 "Invalid Instagram URL" 오류
**증상**: 제출 시 URL 형식 오류

**해결방법**:
올바른 Instagram URL 형식 사용:
- ✅ `https://www.instagram.com/p/ABC123/`
- ✅ `https://instagram.com/p/ABC123/`
- ✅ `https://www.instagram.com/reel/ABC123/`
- ❌ `https://www.instagram.com/username/`
- ❌ `https://www.instagram.com/`

### 7.4 "Video already submitted" 오류
**증상**: 중복 제출 시도 시 409 에러

**해결방법**:
이는 정상적인 동작입니다. 동일한 Instagram 게시물은 같은 문제에 한 번만 제출 가능합니다.

중복 데이터 확인:
```bash
npx wrangler d1 execute granite --command="SELECT * FROM beta_videos WHERE problem_slug='problem-slug' AND instagram_post_id='ABC123'"
```

### 7.5 환경 변수가 로드되지 않음
**증상**: `NEXT_PUBLIC_INSTAGRAM_API_URL`이 undefined

**해결방법**:
1. `.env.local` 파일 위치 확인 (프로젝트 루트)
2. 환경 변수 이름 확인 (`NEXT_PUBLIC_` 접두사 필수)
3. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

### 7.6 Worker 로그 확인
실시간 로그 모니터링:
```bash
cd workers
npx wrangler tail
```

특정 배포의 로그 확인:
```bash
npx wrangler tail --deployment-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 7.7 프로젝트 구조 참고
Worker 코드는 다음과 같이 구성되어 있습니다:

```
workers/
├── src/
│   ├── index.ts              # 메인 라우터
│   ├── handlers/
│   │   ├── hashtag.ts        # Instagram 해시태그 검색
│   │   └── betaVideos.ts     # 베타 영상 관리
│   └── utils/
│       ├── response.ts       # HTTP 응답 유틸리티
│       └── validation.ts     # 입력 검증 유틸리티
├── schema.sql                # D1 데이터베이스 스키마
├── wrangler.toml             # Cloudflare 설정
└── package.json              # 의존성
```

---

## 추가 리소스

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [D1 Database 문서](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [Instagram Graph API 문서](https://developers.facebook.com/docs/instagram-api/)

---

## 비용 안내

### 무료 플랜 한도
- **Workers**: 하루 10만 요청
- **D1 Database**:
  - 5GB 저장공간
  - 하루 500만 읽기
  - 하루 10만 쓰기

### 예상 사용량
- **베타 영상 조회**: 문제 1개당 1회 읽기
- **베타 영상 제출**: 제출 1건당 2회 쓰기 (중복 확인 + 삽입)
- **해시태그 검색**: Instagram API 호출 (Workers 요청)

대부분의 클라이밍 앱 사용량은 무료 플랜 내에서 충분히 감당 가능합니다.

---

## 보안 권장사항

1. **시크릿 관리**: Instagram Access Token을 절대 코드나 `wrangler.toml`에 직접 저장하지 마세요. 항상 `wrangler secret` 명령어 사용.

2. **CORS 설정**: 프로덕션에서는 `ALLOWED_ORIGIN`을 특정 도메인으로 제한하세요.

3. **Rate Limiting**: 필요시 Cloudflare Rate Limiting을 설정하여 남용 방지.

4. **데이터 검증**: Worker에서 입력 데이터를 항상 검증합니다.

5. **모니터링**: Cloudflare 대시보드에서 정기적으로 사용량과 에러를 확인하세요.
