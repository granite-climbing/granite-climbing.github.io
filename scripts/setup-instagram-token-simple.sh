#!/bin/bash
#
# Instagram Graph API 토큰 발급 스크립트 (간소화 버전)
#
# 전체 흐름:
#   1. Facebook User Token (Graph API Explorer에서 수동 발급)
#   2. User Token → Long-Lived User Token 교환
#   3. /me/accounts로 페이지 조회 → Page Token 획득
#   4. Page Token으로 Instagram Business Account ID 조회
#   5. 해시태그 검색 테스트
#
# 사전 준비:
#   - Meta Developer App 생성 (https://developers.facebook.com)
#   - 이용 사례에서 Instagram 콘텐츠 액세스 추가
#   - Instagram Business/Creator 계정이 Facebook 페이지에 연결
#   - Graph API Explorer에서 User Token 발급:
#     필수 권한: pages_show_list, pages_read_engagement, instagram_basic
#
# 사용법:
#   ./scripts/setup-instagram-token-simple.sh

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
echo -e "${CYAN} (간소화 버전 - /me/accounts 사용)${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# .env.local에서 기존 값 읽기
if [ -f "$ENV_FILE" ]; then
  export $(grep -E '^(IG_CLIENT_ID|IG_CLIENT_SECRET)=' "$ENV_FILE" | xargs)
fi

# Step 0: 앱 ID / 시크릿 자동 로드
if [ -z "$IG_CLIENT_ID" ] || [ -z "$IG_CLIENT_SECRET" ]; then
  echo -e "${RED}[Step 0] .env.local에 앱 정보가 없습니다.${NC}"
  echo "  IG_CLIENT_ID와 IG_CLIENT_SECRET을 .env.local에 추가하세요."
  exit 1
fi

echo -e "${GREEN}[Step 0] 앱 정보 확인${NC}"
echo "  앱 ID: ${IG_CLIENT_ID}"
echo ""

# Step 1: User Token 입력
echo -e "${YELLOW}[Step 1] Facebook User Token 입력${NC}"
echo "  Graph API Explorer에서 발급받은 User Token을 붙여넣으세요."
echo "  (https://developers.facebook.com/tools/explorer/)"
echo ""
echo "  필수 권한: pages_show_list, pages_read_engagement, instagram_basic"
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

# Step 3: /me/accounts로 페이지 조회
echo -e "${YELLOW}[Step 3] 페이지 목록 조회 중 (/me/accounts)...${NC}"
PAGES_RESPONSE=$(curl -s "${API_BASE}/me/accounts?fields=id,name,access_token&access_token=${LL_TOKEN}")

# 페이지 목록 표시
PAGE_LIST=$(echo "$PAGES_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
if not data:
    print('')
else:
    for i, p in enumerate(data):
        print(f\"  [{i}] {p['id']} : {p['name']}\")
" 2>/dev/null)

if [ -z "$PAGE_LIST" ]; then
  echo -e "${RED}  페이지가 조회되지 않습니다.${NC}"
  echo "  응답: $PAGES_RESPONSE"
  echo ""
  echo -e "${YELLOW}  원인:${NC}"
  echo "  1. Graph API Explorer에서 pages_show_list 권한을 승인하지 않음"
  echo "  2. 승인 시 페이지 접근을 허용하지 않음"
  echo "  3. '새 페이지 환경' 페이지로 /me/accounts가 빈 배열 반환"
  echo ""
  echo "  '새 페이지 환경' 페이지인 경우, 다른 스크립트를 사용하세요:"
  echo "    ./scripts/setup-instagram-token.sh"
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

# Step 4: Instagram Business Account ID 조회
echo -e "${YELLOW}[Step 4] Instagram Business Account ID 조회 중...${NC}"
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

# Step 5: 토큰 검증
echo -e "${YELLOW}[Step 5] 토큰 검증 중...${NC}"
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

# Step 6: 해시태그 검색 테스트 (앱 검수 필요)
echo -e "${YELLOW}[Step 6] 해시태그 검색 테스트 (climbing)...${NC}"
echo "  주의: 해시태그 검색은 앱 검수 통과 후 사용 가능합니다."
echo ""
HASHTAG_RESPONSE=$(curl -s "${API_BASE}/ig_hashtag_search?q=climbing&user_id=${IG_USER_ID}&access_token=${PAGE_TOKEN}")
HASHTAG_ID=$(echo "$HASHTAG_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); print(d[0]['id'] if d else '')" 2>/dev/null)

if [ -z "$HASHTAG_ID" ]; then
  ERROR_CODE=$(echo "$HASHTAG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('code',''))" 2>/dev/null)
  if [ "$ERROR_CODE" = "10" ]; then
    echo -e "${YELLOW}  앱 검수가 필요합니다 (예상된 결과)${NC}"
    echo "  Instagram Public Content Access 권한 검수 후 사용 가능합니다."
  else
    echo -e "${RED}  해시태그 검색 실패${NC}"
    echo "  응답: $HASHTAG_RESPONSE"
  fi
else
  echo -e "${GREEN}  해시태그 'climbing' ID: ${HASHTAG_ID}${NC}"

  # 최근 미디어 조회 테스트
  MEDIA_RESPONSE=$(curl -s "${API_BASE}/${HASHTAG_ID}/recent_media?user_id=${IG_USER_ID}&fields=id,permalink,media_type&limit=3&access_token=${PAGE_TOKEN}")
  MEDIA_COUNT=$(echo "$MEDIA_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
  echo -e "${GREEN}  최근 미디어 ${MEDIA_COUNT}개 조회 성공${NC}"
fi
echo ""

# Step 7: .env.local 업데이트
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
