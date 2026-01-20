export function getAssetPath(path: string): string {
  // 외부 URL인 경우 그대로 반환
  if (path.startsWith('http')) {
    return path;
  }
  // 절대 경로가 아닌 경우 '/'를 붙여서 반환
  if (!path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
}
