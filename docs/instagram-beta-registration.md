# 인스타그램 베타 등록 방식별 데이터 수집 가이드

베타 영상을 등록하는 4가지 방식과 각 방식에서 **썸네일 URL**, **게시물 작성자 username**, **게시물 URL** 을 수집하는 방법을 정리합니다.

---

## 공통 참고 문서

| API | 문서 |
|-----|------|
| oEmbed | https://developers.facebook.com/docs/instagram-platform/oembed |
| Hashtag Top Media | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media |
| Mentioned Media | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_media |
| Mentioned Comment | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_comment |

---

## 방식 1 — 사용자가 URL 직접 입력

사용자가 인스타그램 게시물 URL을 직접 입력해서 베타를 등록하는 방식입니다.

### 데이터 수집

| 항목 | 수집 방법 | API 호출 |
|------|----------|---------|
| **썸네일 URL** | oEmbed `thumbnail_url` | `GET https://graph.facebook.com/v21.0/instagram_oembed?url={permalink}&fields=thumbnail_url,author_name&access_token={APP_ID}\|{APP_SECRET}` |
| **작성자 username** | oEmbed `author_name` | 위와 동일한 요청 |
| **게시물 URL** | 사용자 입력값 그대로 사용 | API 호출 불필요 |

### 제약사항
- oEmbed는 앱 심사(Live 모드) 전까지 **앱 관리자/개발자 역할** 계정의 게시물만 응답
- username(numeric ID 아님)만 반환 — numeric user ID는 획득 불가

---

## 방식 2 — 해시태그 검색 후 선택 등록

어드민 페이지에서 연결된 계정으로 해시태그를 검색하고, 결과 중 원하는 게시물을 선택해서 베타를 등록하는 방식입니다.

### 데이터 수집

| 항목 | 수집 방법 | API 호출 |
|------|----------|---------|
| **썸네일 URL** | `top_media` 응답의 `media_url` | `GET https://graph.facebook.com/v21.0/{hashtag-id}/top_media?user_id={ig-user-id}&fields=id,media_type,media_url,permalink,timestamp&access_token={token}` |
| **작성자 username** | oEmbed `author_name` | `GET https://graph.facebook.com/v21.0/instagram_oembed?url={permalink}&fields=author_name&access_token={APP_ID}\|{APP_SECRET}` |
| **게시물 URL** | `top_media` 응답의 `permalink` | 위 top_media 요청에서 함께 반환 |

### 제약사항
- `top_media` 응답에 `username` 필드 없음 → oEmbed 별도 호출 필요
- `CAROUSEL_ALBUM` 타입은 `media_url` 미반환
- 해시태그 검색은 7일 동안 최대 30개 고유 해시태그만 조회 가능
- oEmbed는 등록 시점에만 호출 (검색 시마다 호출 X)

---

## 방식 3 — 캡션 @멘션 → Webhook 자동 등록

인스타그램 게시물 작성 시 캡션에 `"문제장소_문제이름" @그라나이트계정` 형식을 포함하면, Webhook 알림을 받아 자동으로 베타를 등록하는 방식입니다.

### Webhook 페이로드
```json
{
  "object": "instagram",
  "entry": [{
    "id": "{ig-user-id}",
    "changes": [{
      "field": "mentions",
      "value": {
        "media_id": "17918195224117851"
      }
    }]
  }]
}
```

### 데이터 수집

| 항목 | 수집 방법 | API 호출 |
|------|----------|---------|
| **썸네일 URL** | `mentioned_media` 응답의 `thumbnail_url` (없으면 `media_url`) | `GET https://graph.facebook.com/v21.0/{ig-user-id}?fields=mentioned_media.media_id({media-id}){thumbnail_url,media_url,caption,username,media_type}&access_token={token}` |
| **작성자 username** | `mentioned_media` 응답의 `username` | 위와 동일한 요청 |
| **게시물 URL** | media_id로 직접 구성 | API 호출 불필요 — `https://www.instagram.com/p/{media-id}/` |

### 제약사항
- `mentioned_media` 응답에 `permalink` 필드 없음 → media_id로 URL 직접 구성
- 캡션 파싱 형식: `"문제이름"` (큰따옴표 또는 스마트 따옴표 `"" `)

---

## 방식 4 — 댓글 @멘션 → Webhook 자동 등록

이미 업로드된 게시물에 `"문제장소_문제이름" @그라나이트계정` 형식의 댓글을 추가하면, Webhook 알림을 받아 자동으로 베타를 등록하는 방식입니다.

### Webhook 페이로드
```json
{
  "object": "instagram",
  "entry": [{
    "id": "{ig-user-id}",
    "changes": [{
      "field": "mentions",
      "value": {
        "media_id": "17918195224117851",
        "comment_id": "17894227972186120"
      }
    }]
  }]
}
```

### 데이터 수집 (2단계)

**1단계 — 댓글 텍스트 + media_id 획득:**

| 항목 | API 호출 |
|------|---------|
| 댓글 텍스트 (caption으로 사용) | `GET https://graph.facebook.com/v21.0/{ig-user-id}?fields=mentioned_comment.comment_id({comment-id}){text,media}&access_token={token}` |

**2단계 — media_id로 미디어 정보 획득:**

| 항목 | 수집 방법 | API 호출 |
|------|----------|---------|
| **썸네일 URL** | `mentioned_media` 응답의 `thumbnail_url` (없으면 `media_url`) | `GET https://graph.facebook.com/v21.0/{ig-user-id}?fields=mentioned_media.media_id({media-id}){thumbnail_url,media_url,username}&access_token={token}` |
| **작성자 username** | `mentioned_media` 응답의 `username` | 위와 동일한 요청 |
| **게시물 URL** | media_id로 직접 구성 | API 호출 불필요 — `https://www.instagram.com/p/{media-id}/` |

### 제약사항
- comment_id가 있을 경우 반드시 `mentioned_comment` 먼저 호출 후 `mentioned_media` 호출
- 댓글 텍스트가 캡션 역할을 함 → 문제 제목 파싱 대상

---

## 전체 요약

| 방식 | 썸네일 출처 | username 출처 | 게시물 URL 출처 |
|------|------------|--------------|----------------|
| 1. URL 직접 입력 | oEmbed `thumbnail_url` | oEmbed `author_name` | 사용자 입력값 |
| 2. 해시태그 검색 | `top_media` `media_url` | oEmbed `author_name` | `top_media` `permalink` |
| 3. 캡션 멘션 webhook | `mentioned_media` `thumbnail_url` | `mentioned_media` `username` | `instagram.com/p/{media-id}/` |
| 4. 댓글 멘션 webhook | `mentioned_media` `thumbnail_url` | `mentioned_media` `username` | `instagram.com/p/{media-id}/` |
