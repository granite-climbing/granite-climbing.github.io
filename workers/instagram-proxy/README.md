# Instagram API Proxy (Cloudflare Worker)

GitHub Pages에서 Instagram Graph API를 사용하기 위한 서버리스 프록시.

## 사전 준비

1. **Facebook Developer App** 생성 (https://developers.facebook.com)
2. Instagram Graph API 활성화
3. Instagram Business 또는 Creator 계정을 Facebook 페이지에 연결
4. Long-lived access token 발급 (60일 유효, 갱신 가능)

## 배포

```bash
cd workers/instagram-proxy

# 의존성 설치
pnpm install

# 시크릿 설정 (대화형 입력)
pnpm wrangler secret put INSTAGRAM_ACCESS_TOKEN
pnpm wrangler secret put INSTAGRAM_USER_ID

# 배포
pnpm deploy
```

## 환경 변수

| 변수 | 설정 방법 | 설명 |
|------|-----------|------|
| `INSTAGRAM_ACCESS_TOKEN` | `wrangler secret put` | Instagram Graph API 토큰 |
| `INSTAGRAM_USER_ID` | `wrangler secret put` | Instagram Business Account ID |
| `ALLOWED_ORIGIN` | `wrangler.toml` | CORS 허용 origin |

## 프론트엔드 연결

Worker 배포 후 Next.js 빌드 시 환경 변수 설정:

```
NEXT_PUBLIC_INSTAGRAM_API_URL=https://granite-instagram-proxy.<account>.workers.dev
```

## API

```
GET /?tag=granite_climbing
```

응답:
```json
{
  "media": [
    {
      "id": "...",
      "media_url": "https://...",
      "thumbnail_url": "https://...",
      "permalink": "https://www.instagram.com/p/...",
      "media_type": "VIDEO"
    }
  ]
}
```

## 로컬 개발

```bash
pnpm dev
```

http://localhost:8787 에서 실행됩니다.
