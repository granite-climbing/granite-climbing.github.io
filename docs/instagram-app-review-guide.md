# Instagram Graph API 앱 검수 가이드

Meta Developer 앱 검수 시 제출할 권한별 설명과 사용 사례입니다.

## 앱 개요

**앱 이름**: Granite Climbing
**앱 목적**: 클라이밍 커뮤니티를 위한 암장 정보 및 문제(Problem) 데이터베이스. Instagram을 통해 공유된 베타 영상을 자동으로 수집하여 클라이머들이 쉽게 찾을 수 있도록 지원.

**웹사이트**: https://granite-climbing.github.io

---

## 권한별 설명 및 앱 검수 작성 가이드

### 1. `public_profile` (자동 승인)

**권한 설명**: 사용자의 기본 공개 프로필 필드 읽기

**필요 이유**: 없음 (모든 앱에 자동 부여)

**앱 검수 필요**: 없음

---

### 2. `pages_show_list`

**권한 설명**: 사용자가 관리하는 Facebook 페이지 목록 조회

#### 필요 이유

우리 앱은 클라이밍 암장의 공식 Facebook 페이지와 연결된 Instagram Business 계정에 접근해야 합니다. `pages_show_list` 권한을 통해 암장 관리자가 관리하는 페이지 목록을 조회하고, 올바른 페이지를 선택할 수 있습니다.

#### 앱 검수 작성 예시

**How your app uses this permission (이 권한을 어떻게 사용하나요?)**

```
Our app helps climbing gyms manage their route database and connect beta videos
from Instagram. We need to access the list of Facebook Pages that gym administrators
manage to identify which Page is linked to their Instagram Business account.

Without this permission, we cannot retrieve the Page access token needed to access
the Instagram Business account data.
```

**한국어 번역**:
```
우리 앱은 클라이밍 암장이 문제 데이터베이스를 관리하고 Instagram의 베타 영상을 연결하도록
돕습니다. 암장 관리자가 관리하는 Facebook 페이지 목록에 접근하여, Instagram 비즈니스
계정과 연결된 페이지를 식별해야 합니다.

이 권한 없이는 Instagram 비즈니스 계정 데이터에 접근하는 데 필요한 페이지 액세스 토큰을
가져올 수 없습니다.
```

**스크린캡처 설명**:
- 관리자가 페이지 목록에서 자신의 암장 페이지를 선택하는 화면
- 페이지 선택 후 Instagram 계정이 연결되었음을 확인하는 화면

---

### 3. `pages_read_engagement`

**권한 설명**: 페이지의 콘텐츠, 인사이트, Instagram 계정 연결 정보 읽기

#### 필요 이유

Facebook 페이지에 연결된 Instagram Business 계정 ID를 조회하기 위해 필수적입니다. Instagram Graph API는 Facebook 페이지를 통해서만 접근할 수 있으며, `pages_read_engagement` 권한이 있어야 `instagram_business_account` 필드를 읽을 수 있습니다.

#### 앱 검수 작성 예시

**How your app uses this permission**

```
We use this permission to retrieve the Instagram Business Account ID that is
connected to the climbing gym's Facebook Page. This is a prerequisite for using
the Instagram Graph API.

Specifically, we query the Page's `instagram_business_account` field, which
requires `pages_read_engagement` permission. This allows us to:
1. Verify the Page has a connected Instagram Business account
2. Obtain the Instagram account ID needed for hashtag searches
3. Access beta videos shared by the climbing community

We do not read or store any other Page content, follower data, or insights.
```

**한국어 번역**:
```
클라이밍 암장의 Facebook 페이지에 연결된 Instagram 비즈니스 계정 ID를 조회하기 위해
이 권한을 사용합니다. 이는 Instagram Graph API 사용을 위한 필수 조건입니다.

구체적으로, 페이지의 `instagram_business_account` 필드를 쿼리하며, 이는
`pages_read_engagement` 권한이 필요합니다. 이를 통해:
1. 페이지에 Instagram 비즈니스 계정이 연결되어 있는지 확인
2. 해시태그 검색에 필요한 Instagram 계정 ID 획득
3. 클라이밍 커뮤니티가 공유한 베타 영상에 접근

우리는 다른 페이지 콘텐츠, 팔로워 데이터, 인사이트는 읽거나 저장하지 않습니다.
```

**스크린캡처 설명**:
- Graph API Explorer에서 `/페이지ID?fields=instagram_business_account` 쿼리 결과
- 앱에서 Instagram 계정 ID가 성공적으로 조회된 화면

---

### 4. `instagram_basic`

**권한 설명**: Instagram 계정 프로필 정보 및 미디어 읽기

#### 필요 이유

Instagram Business 계정의 기본 정보와 해시태그 검색 기능에 접근하기 위해 필요합니다. 클라이머들이 특정 문제(Problem)에 대한 베타 영상을 Instagram에 업로드할 때 사용하는 해시태그를 통해 관련 영상을 찾고 표시합니다.

#### 앱 검수 작성 예시

**How your app uses this permission**

```
Our app allows climbers to find beta (technique) videos for specific climbing
problems by searching Instagram hashtags. When a climber posts a beta video on
Instagram with a problem-specific hashtag (e.g., #granite_climbing_problem1),
we use `instagram_basic` to:

1. Search for posts using the hashtag
2. Retrieve video thumbnails and permalinks
3. Display them in our app so other climbers can learn the technique

This helps the climbing community share knowledge and improve their skills.
We only access publicly shared content that users have tagged with our gym's hashtags.

We do not post, modify, or delete any Instagram content.
```

**한국어 번역**:
```
우리 앱은 클라이머들이 특정 클라이밍 문제에 대한 베타(기술) 영상을 Instagram 해시태그로
찾을 수 있게 합니다. 클라이머가 Instagram에 베타 영상을 업로드하면서 문제별 해시태그
(예: #granite_climbing_problem1)를 사용할 때, `instagram_basic`을 통해:

1. 해시태그를 사용한 게시물 검색
2. 비디오 썸네일 및 퍼머링크 조회
3. 앱에서 표시하여 다른 클라이머들이 기술을 배울 수 있도록 지원

이를 통해 클라이밍 커뮤니티가 지식을 공유하고 실력을 향상시킬 수 있습니다.
우리는 사용자가 암장의 해시태그로 태그한 공개 콘텐츠만 접근합니다.

Instagram 콘텐츠를 게시, 수정, 삭제하지 않습니다.
```

**스크린캡처 설명**:
- 앱에서 문제별 베타 영상 그리드가 표시된 화면
- Instagram 해시태그 검색 결과 (Graph API Explorer)
- 사용자가 해시태그와 함께 베타 영상을 공유하는 플로우

---

### 5. `business_management`

**권한 설명**: Business Manager API를 통한 비즈니스 데이터 읽기/쓰기

#### 필요 이유

일부 Facebook 페이지는 "새 페이지 환경(New Pages Experience)"으로 전환되어 `/me/accounts` 엔드포인트로 조회되지 않습니다. 이 경우 `/me/businesses` → `비즈니스ID/owned_pages` 경로를 통해 페이지 목록을 조회해야 하며, 이를 위해 `business_management` 권한이 필요합니다.

#### 앱 검수 작성 예시

**How your app uses this permission**

```
Due to Facebook's migration to the New Pages Experience, some Pages cannot be
accessed via the traditional `/me/accounts` endpoint. We use `business_management`
to query `/me/businesses` and retrieve the list of Pages owned by the Business
Portfolio.

This is solely for the initial setup process to:
1. Identify which Business Portfolio the gym administrator manages
2. Retrieve the list of Pages owned by that Business
3. Obtain the Page access token needed for Instagram API access

We only READ business and page data during initial authentication. We do NOT
write, modify, or delete any business data.

This is a workaround for the New Pages Experience limitation and is only used
when `/me/accounts` returns an empty result.
```

**한국어 번역**:
```
Facebook의 새 페이지 환경으로의 마이그레이션으로 인해, 일부 페이지는 기존 `/me/accounts`
엔드포인트로 접근할 수 없습니다. 우리는 `business_management`를 사용하여
`/me/businesses`를 쿼리하고 비즈니스 포트폴리오가 소유한 페이지 목록을 조회합니다.

이는 초기 설정 과정에서만 사용되며:
1. 암장 관리자가 관리하는 비즈니스 포트폴리오 식별
2. 해당 비즈니스가 소유한 페이지 목록 조회
3. Instagram API 접근에 필요한 페이지 액세스 토큰 획득

초기 인증 중에만 비즈니스 및 페이지 데이터를 읽습니다. 비즈니스 데이터를 쓰거나, 수정하거나,
삭제하지 않습니다.

이는 새 페이지 환경 제한에 대한 해결 방법이며, `/me/accounts`가 빈 결과를 반환할 때만
사용됩니다.
```

**스크린캡처 설명**:
- `/me/accounts`가 빈 배열을 반환하는 경우의 스크린샷
- `/me/businesses` → `owned_pages` 경로로 페이지를 성공적으로 조회한 화면
- 두 방법의 차이를 설명하는 다이어그램

---

## Instagram Public Content Access (추가 권한)

**권한 설명**: 공개 Instagram 콘텐츠 접근 (해시태그 검색, 공개 미디어 조회)

#### 필요 이유

실제로 해시태그 검색(`ig_hashtag_search`)과 최근 미디어 조회(`/hashtag_id/recent_media`)를 수행하려면 이 기능이 필요합니다. `instagram_basic`만으로는 자신의 계정 정보만 읽을 수 있고, 공개 콘텐츠 검색은 불가능합니다.

#### 앱 검수 작성 예시

**How your app uses this feature**

```
Instagram Public Content Access enables us to search for beta videos using hashtags
and display them to climbers. This is the core functionality of our app.

Use case:
1. Climbing gym creates a problem (e.g., "Overhang Crusher V5")
2. App generates a unique hashtag (e.g., #granite_climbing_overhang_crusher)
3. Climbers share their beta videos on Instagram with this hashtag
4. Our app uses `ig_hashtag_search` to find the hashtag ID
5. We query `/hashtag_id/recent_media` to retrieve public posts
6. Videos are displayed in our app with thumbnails and Instagram links

This creates a community-driven knowledge base where climbers help each other
improve. All content is publicly shared by users on Instagram, and we only
display what they've already made public with gym-specific hashtags.

We respect user privacy and only access content that users explicitly tag with
our hashtags, indicating their intent to share with the climbing community.
```

**한국어 번역**:
```
Instagram Public Content Access는 해시태그를 사용하여 베타 영상을 검색하고
클라이머들에게 표시할 수 있게 합니다. 이것이 우리 앱의 핵심 기능입니다.

사용 사례:
1. 클라이밍 암장이 문제를 생성 (예: "Overhang Crusher V5")
2. 앱이 고유한 해시태그 생성 (예: #granite_climbing_overhang_crusher)
3. 클라이머들이 이 해시태그와 함께 베타 영상을 Instagram에 공유
4. 앱이 `ig_hashtag_search`를 사용하여 해시태그 ID 찾기
5. `/hashtag_id/recent_media`를 쿼리하여 공개 게시물 조회
6. 썸네일 및 Instagram 링크와 함께 앱에 영상 표시

이를 통해 클라이머들이 서로 향상하도록 돕는 커뮤니티 기반 지식 베이스가 생성됩니다.
모든 콘텐츠는 사용자가 Instagram에 공개적으로 공유한 것이며, 우리는 그들이 이미
암장별 해시태그로 공개한 것만 표시합니다.

우리는 사용자 프라이버시를 존중하며, 사용자가 명시적으로 우리 해시태그로 태그한 콘텐츠만
접근합니다. 이는 클라이밍 커뮤니티와 공유하려는 의도를 나타냅니다.
```

**스크린캡처 설명**:
- 문제 상세 페이지에서 베타 영상 그리드가 표시된 화면
- Instagram에서 해시태그와 함께 베타 영상을 공유하는 예시
- Graph API로 해시태그 검색 결과 조회 화면
- 사용자가 영상을 클릭하여 Instagram으로 이동하는 플로우

---

## 제출 시 주의사항

### 1. 스크린캡처 준비
- 각 권한마다 **실제 사용 화면**을 스크린캡처로 첨부
- 사용자 관점에서의 플로우를 보여주는 것이 중요
- Graph API Explorer 결과도 포함하여 기술적 타당성 입증

### 2. 개인정보 처리방침 (Privacy Policy)
앱 검수를 위해서는 개인정보 처리방침 URL이 필요합니다.

**포함해야 할 내용**:
- 어떤 데이터를 수집하는가 (Instagram 공개 게시물만)
- 데이터를 어떻게 사용하는가 (베타 영상 표시용)
- 데이터를 저장하는가 (썸네일/링크만 저장, 영상 자체는 미저장)
- 사용자가 데이터 삭제를 요청할 수 있는가

### 3. 비즈니스 인증
- 일부 권한은 **비즈니스 인증**이 완료되어야 승인 가능
- Meta Business Suite에서 비즈니스 인증 진행
- 사업자등록증 또는 공식 웹사이트 필요

### 4. 테스트 계정
- 검수 담당자가 테스트할 수 있도록 **테스트 계정** 제공
- 테스트 Instagram 계정에 샘플 해시태그 게시물 미리 업로드
- 앱 사용 플로우를 문서화하여 제공

### 5. 사용 빈도 제한
- API 호출 빈도와 목적을 명확히 설명
- Rate limit 준수 계획 제시 (30 hashtags / 7 days)

---

## 검수 통과 팁

### 1. 명확한 사용 목적
- "왜 이 권한이 필요한가"를 기술적으로 명확히 설명
- 대안이 없음을 입증 (예: Instagram Business Account는 Facebook 페이지를 통해서만 접근 가능)

### 2. 최소 권한 원칙
- 필요한 권한만 요청
- 사용하지 않는 권한은 제외
- 각 권한이 핵심 기능에 필수적임을 강조

### 3. 사용자 프라이버시 존중
- 공개 콘텐츠만 접근
- 사용자가 명시적으로 태그한 콘텐츠만 수집
- 데이터 저장 최소화

### 4. 커뮤니티 가치 강조
- 클라이밍 커뮤니티에 제공하는 가치
- 지식 공유 및 기술 향상 지원
- 비상업적/교육적 목적

---

## 대안: 앱 검수 없이 사용하는 방법

만약 앱 검수가 거절되거나 시간이 오래 걸린다면:

### oEmbed 방식
- CMS에서 Instagram URL을 직접 입력
- oEmbed API로 게시물 임베드
- 앱 토큰(`앱ID|앱시크릿`)만으로 동작
- 검수 불필요

**장점**: 즉시 사용 가능
**단점**: 해시태그 자동 검색 불가, URL 수동 입력 필요

---

## 체크리스트

검수 제출 전 확인:
- [ ] 각 권한마다 명확한 사용 목적 작성
- [ ] 스크린캡처 준비 (실제 사용 화면)
- [ ] 개인정보 처리방침 URL 게시
- [ ] 비즈니스 인증 완료 (필요 시)
- [ ] 테스트 계정 및 샘플 데이터 준비
- [ ] 사용 플로우 문서화
- [ ] Rate limit 준수 계획 작성
