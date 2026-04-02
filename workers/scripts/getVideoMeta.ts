/**
 * CLI script: Instagram URL에서 메타 정보(author_name, thumbnail_url)를 출력합니다.
 *
 * 사용법:
 *   npm run get-video-meta <instagram_url>
 *
 * 예시:
 *   npm run get-video-meta https://www.instagram.com/p/CsJa1FMAIr4/
 */

import { getVideoMetaFromHTML } from '../src/utils/htmlScraper';

const url = process.argv[2];

if (!url) {
  console.error('Usage: npm run get-video-meta <instagram_url>');
  process.exit(1);
}

getVideoMetaFromHTML(url).then((meta) => {
  if (!meta) {
    console.error('Failed to fetch metadata for:', url);
    process.exit(1);
  }
  console.log(JSON.stringify(meta, null, 2));
});
