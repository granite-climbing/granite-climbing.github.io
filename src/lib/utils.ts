const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function getAssetPath(path: string): string {
  // 이미 basePath가 포함되어 있거나 외부 URL인 경우 그대로 반환
  if (path.startsWith('http') || (basePath && path.startsWith(basePath))) {
    return path;
  }
  return `${basePath}${path}`;
}
