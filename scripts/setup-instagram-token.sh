#!/bin/bash
#
# Instagram Graph API 토큰 발급 스크립트
#
# 전체 흐름:
#   1. Facebook User Token (Graph API Explorer에서 수동 발급)
#   2. User Token → Long-Lived User Token 교환
#   3. 비즈니스 포트폴리오 조회
#   4. 비즈니스 소유 페이지 조회 → Page Token 획득
#   5. Page Token으로 Instagram Business Account ID 조회
#   6. 해시태그 검색 테스트
#
# 사전 준비:
#   - Meta Developer App 생성 (https://developers.facebook.com)
#   - 이용 사례에서 Instagram 콘텐츠 액세스 추가
#   - Instagram Business/Creator 계정이 Facebook 페이지에 연결
#   - Graph API Explorer에서 User Token 발급:
#     권한: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_comments
#
# 사용법:
#   ./scripts/setup-instagram-token.sh

set -e

API_VERSION="v24.0"
API_BASE="https://graph.facebook.com/${API_VERSION}"
ENV_FILE=".env.local"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Instagram Graph API 토큰 설정${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# .env.local에서 기존 값 읽기
if [ -f "$ENV_FILE" ]; then
  source <(grep -E '^(IG_CLIENT_ID|IG_CLIENT_SECRET)=' "$ENV_FILE")
fi

# Step 0: 앱 ID / 시크릿 확인
if [ -z "$IG_CLIENT_ID" ] || [ -z "$IG_CLIENT_SECRET" ]; then
  echo -e "${YELLOW}[Step 0] 앱 정보 입력${NC}"
  read -p "앱 ID (App ID): " IG_CLIENT_ID
  read -p "앱 시크릿 (App Secret): " IG_CLIENT_SECRET
else
  echo -e "${GREEN}[Step 0] 앱 정보 확인${NC}"
  echo "  앱 ID: ${IG_CLIENT_ID}"
fi
echo ""

# Step 1: User Token 입력
echo -e "${YELLOW}[Step 1] Facebook User Token 입력${NC}"
echo "  Graph API Explorer에서 발급받은 단기 User Token을 붙여넣으세요."
echo "  (https://developers.facebook.com/tools/explorer/)"
echo ""
read -p "User Token: " USER_TOKEN

if [ -z "$USER_TOKEN" ]; then
  echo -e "${RED}토큰이 입력되지 않았습니다.${NC}"
  exit 1
fi
echo ""

# Step 2: Long-Lived User Token 교환
echo -e "${YELLOW}[Step 2] Long-Lived User Token 교환 중...${NC}"
LL_RESPONSE=$(curl -s "${API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${IG_CLIENT_ID}&client_secret=${IG_CLIENT_SECRET}&fb_exchange_token=${USER_TOKEN}")

LL_TOKEN=$(echo "$LL_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -z "$LL_TOKEN" ]; then
  echo -e "${RED}  Long-Lived Token 교환 실패${NC}"
  echo "  응답: $LL_RESPONSE"
  exit 1
fi
echo -e "${GREEN}  Long-Lived User Token 획득 완료${NC}"
echo ""

# Step 3: 비즈니스 포트폴리오 조회
echo -e "${YELLOW}[Step 3] 비즈니스 포트폴리오 조회 중...${NC}"
BIZ_RESPONSE=$(curl -s "${API_BASE}/me/businesses?fields=id,name&access_token=${LL_TOKEN}")
BIZ_LIST=$(echo "$BIZ_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
for i, b in enumerate(data):
    print(f\"  [{i}] {b['id']} : {b['name']}\")
" 2>/dev/null)

if [ -z "$BIZ_LIST" ]; then
  echo -e "${RED}  비즈니스 포트폴리오가 없습니다.${NC}"
  echo "  응답: $BIZ_RESPONSE"
  echo ""
  echo "  비즈니스 포트폴리오 없이 /me/accounts로 시도합니다..."

  # 비즈니스 없이 직접 페이지 조회
  PAGES_RESPONSE=$(curl -s "${API_BASE}/me/accounts?fields=id,name,access_token&access_token=${LL_TOKEN}")
  PAGE_COUNT=$(echo "$PAGES_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)

  if [ "$PAGE_COUNT" = "0" ] || [ -z "$PAGE_COUNT" ]; then
    echo -e "${RED}  페이지도 조회되지 않습니다. 비즈니스 포트폴리오가 필요합니다.${NC}"
    exit 1
  fi
else
  echo "$BIZ_LIST"
  echo ""

  BIZ_COUNT=$(echo "$BIZ_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)

  if [ "$BIZ_COUNT" = "1" ]; then
    BIZ_ID=$(echo "$BIZ_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])" 2>/dev/null)
    echo -e "  자동 선택: ${BIZ_ID}"
  else
    read -p "  비즈니스 번호 선택: " BIZ_INDEX
    BIZ_ID=$(echo "$BIZ_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][${BIZ_INDEX:-0}]['id'])" 2>/dev/null)
  fi
  echo ""

  # Step 4: 비즈니스 소유 페이지 조회
  echo -e "${YELLOW}[Step 4] 비즈니스 소유 페이지 조회 중...${NC}"
  PAGES_RESPONSE=$(curl -s "${API_BASE}/${BIZ_ID}/owned_pages?fields=id,name,access_token&access_token=${LL_TOKEN}")
fi

# 페이지 목록 표시
PAGE_LIST=$(echo "$PAGES_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
for i, p in enumerate(data):
    print(f\"  [{i}] {p['id']} : {p['name']}\")
" 2>/dev/null)

if [ -z "$PAGE_LIST" ]; then
  echo -e "${RED}  페이지가 없습니다.${NC}"
  echo "  응답: $PAGES_RESPONSE"
  exit 1
fi

echo "$PAGE_LIST"
echo ""

PAGE_COUNT=$(echo "$PAGES_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)

if [ "$PAGE_COUNT" = "1" ]; then
  PAGE_INDEX=0
  echo "  자동 선택"
else
  read -p "  페이지 번호 선택: " PAGE_INDEX
  PAGE_INDEX=${PAGE_INDEX:-0}
fi

PAGE_ID=$(echo "$PAGES_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][${PAGE_INDEX}]['id'])" 2>/dev/null)
PAGE_TOKEN=$(echo "$PAGES_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][${PAGE_INDEX}]['access_token'])" 2>/dev/null)
PAGE_NAME=$(echo "$PAGES_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][${PAGE_INDEX}]['name'])" 2>/dev/null)

echo -e "${GREEN}  페이지: ${PAGE_NAME} (${PAGE_ID})${NC}"
echo ""

# Step 5: Instagram Business Account ID 조회
echo -e "${YELLOW}[Step 5] Instagram Business Account ID 조회 중...${NC}"
IG_RESPONSE=$(curl -s "${API_BASE}/${PAGE_ID}?fields=instagram_business_account&access_token=${PAGE_TOKEN}")
IG_USER_ID=$(echo "$IG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('instagram_business_account',{}).get('id',''))" 2>/dev/null)

if [ -z "$IG_USER_ID" ]; then
  echo -e "${RED}  Instagram Business Account를 찾을 수 없습니다.${NC}"
  echo "  페이지에 Instagram 비즈니스 계정이 연결되어 있는지 확인하세요."
  echo "  응답: $IG_RESPONSE"
  exit 1
fi

echo -e "${GREEN}  Instagram Business Account ID: ${IG_USER_ID}${NC}"
echo ""

# Step 6: 토큰 검증
echo -e "${YELLOW}[Step 6] 토큰 검증 중...${NC}"
DEBUG_RESPONSE=$(curl -s "${API_BASE}/debug_token?input_token=${PAGE_TOKEN}&access_token=${IG_CLIENT_ID}|${IG_CLIENT_SECRET}")
EXPIRES=$(echo "$DEBUG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('expires_at','-1'))" 2>/dev/null)
IS_VALID=$(echo "$DEBUG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('is_valid','False'))" 2>/dev/null)
TOKEN_TYPE=$(echo "$DEBUG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('type','unknown'))" 2>/dev/null)

echo "  유형: ${TOKEN_TYPE}"
echo "  유효: ${IS_VALID}"
if [ "$EXPIRES" = "0" ]; then
  echo -e "  만료: ${GREEN}만료 안 됨 (영구 토큰)${NC}"
else
  echo -e "  만료: ${YELLOW}${EXPIRES} (교환 필요할 수 있음)${NC}"
fi
echo ""

# Step 7: 해시태그 검색 테스트
echo -e "${YELLOW}[Step 7] 해시태그 검색 테스트 (climbing)...${NC}"
HASHTAG_RESPONSE=$(curl -s "${API_BASE}/ig_hashtag_search?q=climbing&user_id=${IG_USER_ID}&access_token=${PAGE_TOKEN}")
HASHTAG_ID=$(echo "$HASHTAG_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); print(d[0]['id'] if d else '')" 2>/dev/null)

if [ -z "$HASHTAG_ID" ]; then
  echo -e "${RED}  해시태그 검색 실패${NC}"
  echo "  응답: $HASHTAG_RESPONSE"
else
  echo -e "${GREEN}  해시태그 'climbing' ID: ${HASHTAG_ID}${NC}"

  # 최근 미디어 조회 테스트
  MEDIA_RESPONSE=$(curl -s "${API_BASE}/${HASHTAG_ID}/recent_media?user_id=${IG_USER_ID}&fields=id,permalink,media_type&limit=3&access_token=${PAGE_TOKEN}")
  MEDIA_COUNT=$(echo "$MEDIA_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
  echo -e "${GREEN}  최근 미디어 ${MEDIA_COUNT}개 조회 성공${NC}"
fi
echo ""

# Step 8: .env.local 업데이트
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} 결과 요약${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  INSTAGRAM_ACCESS_TOKEN = ${PAGE_TOKEN:0:30}..."
echo "  INSTAGRAM_USER_ID      = ${IG_USER_ID}"
echo ""
read -p ".env.local에 저장할까요? (y/n): " SAVE_CONFIRM

if [ "$SAVE_CONFIRM" = "y" ] || [ "$SAVE_CONFIRM" = "Y" ]; then
  # 기존 값 제거 후 새로 추가
  if [ -f "$ENV_FILE" ]; then
    # 기존 Instagram 관련 변수 제거
    grep -v -E '^(IG_ACCESS_TOKEN|FB_PAGE_TOKEN|INSTAGRAM_ACCESS_TOKEN|INSTAGRAM_USER_ID)=' "$ENV_FILE" > "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
  fi

  # 새 값 추가
  cat >> "$ENV_FILE" << EOF

# Instagram Graph API (자동 생성: $(date +%Y-%m-%d))
INSTAGRAM_ACCESS_TOKEN=${PAGE_TOKEN}
INSTAGRAM_USER_ID=${IG_USER_ID}
EOF

  echo -e "${GREEN}  .env.local 업데이트 완료${NC}"
else
  echo "  저장하지 않았습니다. 위 값을 수동으로 설정하세요."
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Cloudflare Worker 배포${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  cd workers/instagram-proxy"
echo "  pnpm install"
echo "  pnpm wrangler secret put INSTAGRAM_ACCESS_TOKEN"
echo "    → 위의 INSTAGRAM_ACCESS_TOKEN 값 입력"
echo "  pnpm wrangler secret put INSTAGRAM_USER_ID"
echo "    → ${IG_USER_ID} 입력"
echo "  pnpm deploy"
echo ""
echo -e "${GREEN}완료!${NC}"
