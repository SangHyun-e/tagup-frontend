// 딥링크 파싱: tagup://room/TAGCODE → /room-enter?tagCode=TAGCODE
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // path 예: /room/ABCD12 (scheme 제거 후)
    const match = path.match(/^\/room\/([A-Za-z0-9]+)/);
    if (match) {
      return `/room-enter?tagCode=${match[1]}`;
    }
  } catch {}
  return path;
}
