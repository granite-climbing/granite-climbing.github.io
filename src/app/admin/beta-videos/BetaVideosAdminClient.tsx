'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './page.module.css';
import type { ProblemMeta } from './page';

const WORKER_URL = (process.env.NEXT_PUBLIC_INSTAGRAM_API_URL || '').replace(/\/$/, '');

type Platform = 'instagram' | 'youtube' | 'tiktok' | 'other';

interface BetaVideo {
  id: number;
  problemSlug: string;
  videoUrl: string;
  platform: Platform;
  thumbnailUrl: string | null;
  instagramUsername: string | null;
  submittedAt: string;
  status: string;
  postId: string | null;
  deletedAt: string | null;
}

interface InstagramPost {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: string;
  username?: string;
  timestamp?: string;
}

interface IgStatus {
  connected: boolean;
  userId?: string;
  username?: string;
  expiresAt?: string;
  updatedAt?: string;
  daysUntilExpiry?: number;
  needsRefresh?: boolean;
}

interface PendingAccount {
  id: string;
  name: string;
  access_token: string;
  ig_id: string | null;
  ig_username: string | null;
}

function getDecapToken(): string | null {
  try {
    const raw = localStorage.getItem('gotrue.user');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.token?.access_token || null;
  } catch {
    return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  );
}

function truncateUrl(url: string, max = 50): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.hostname + u.pathname;
    return path.length > max ? path.slice(0, max) + '…' : path;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

interface DryRunRow {
  problem_slug: string;
  video_url: string;
  post_id: string | null;
  platform: string;
  thumbnail_url: string | null;
  submitted_at: string;
  status: string;
  instagram_username: string | null;
  instagram_timestamp: string | null;
}

// -------------------------------------------------------------------

const PLATFORM_INFO: Record<Platform, { icon: string; label: string }> = {
  instagram: { icon: '📸', label: 'Instagram' },
  youtube:   { icon: '▶',  label: 'YouTube' },
  tiktok:    { icon: '🎵', label: 'TikTok' },
  other:     { icon: '🔗', label: '기타' },
};

interface Props {
  problemMap: Record<string, ProblemMeta>;
}

export default function BetaVideosAdminClient({ problemMap }: Props) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [allVideos, setAllVideos] = useState<BetaVideo[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Instagram OAuth state
  const [igStatus, setIgStatus] = useState<IgStatus | null>(null);
  const [igStatusLoading, setIgStatusLoading] = useState(false);
  const [oauthMessage, setOauthMessage] = useState('');

  // Hashtag search state
  const [hashtagProblem, setHashtagProblem] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [hashtagResults, setHashtagResults] = useState<InstagramPost[]>([]);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [hashtagError, setHashtagError] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [registeredUrls, setRegisteredUrls] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dryRunRows, setDryRunRows] = useState<DryRunRow[] | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  useEffect(() => {
    const token = getDecapToken();
    setAuthToken(token);
  }, []);

  // Account selection state
  const [pendingSession, setPendingSession] = useState<string | null>(null);
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [confirmingAccount, setConfirmingAccount] = useState(false);

  // Check for OAuth callback result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const igParam = params.get('instagram');

    if (igParam === 'connected') {
      setOauthMessage('✅ 인스타그램 연동이 완료되었습니다.');
    } else if (igParam === 'select') {
      const session = params.get('session');
      if (session) {
        setPendingSession(session);
        // 계정 목록 로드
        const token = getDecapToken();
        if (token) {
          fetch(`${WORKER_URL}/admin/instagram/pending-accounts?session=${session}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.json())
            .then((data: { accounts?: PendingAccount[] }) => {
              if (data.accounts) setPendingAccounts(data.accounts);
            })
            .catch(() => setOauthMessage('❌ 계정 목록을 불러오지 못했습니다.'));
        }
      }
    } else if (igParam === 'error') {
      const reason = params.get('reason') || 'unknown';
      setOauthMessage(`❌ 인스타그램 연동 실패 (${reason})`);
    }

    if (igParam) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('instagram');
      clean.searchParams.delete('session');
      clean.searchParams.delete('reason');
      window.history.replaceState({}, '', clean.toString());
    }
  }, []);

  const loadVideos = useCallback(async (token: string, includeDeleted: boolean) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (includeDeleted) params.set('includeDeleted', '1');

      const res = await fetch(`${WORKER_URL}/admin/beta-videos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        setAuthToken(null);
        setError('세션이 만료되었습니다. Decap CMS에서 다시 로그인해 주세요.');
        return;
      }
      if (!res.ok) {
        setError(`불러오기 실패: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      setAllVideos(data.videos || []);
    } catch (e: unknown) {
      setError(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstagramStatus = useCallback(async (token: string) => {
    setIgStatusLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/admin/instagram/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIgStatus(data);
      }
    } catch {
      // silently ignore
    } finally {
      setIgStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      loadVideos(authToken, showDeleted);
      loadInstagramStatus(authToken);
    }
  }, [authToken, loadVideos, loadInstagramStatus, showDeleted]);

  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(new Set());

  async function refreshVideoMeta(id: number) {
    if (!authToken) return;
    setRefreshingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`${WORKER_URL}/admin/beta-videos/${id}/refresh`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        setAuthToken(null);
        setError('세션이 만료되었습니다. Decap CMS에서 다시 로그인해 주세요.');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        alert(`메타데이터 갱신 실패: ${data.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      setAllVideos(prev =>
        prev.map(v => v.id === id
          ? { ...v, instagramUsername: data.instagramUsername, thumbnailUrl: data.thumbnailUrl }
          : v
        )
      );
    } catch (e: unknown) {
      alert(`갱신 오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function deleteVideo(id: number) {
    const video = allVideos.find(v => v.id === id);
    if (!video || !authToken) return;

    if (!confirm(`이 베타영상을 삭제하시겠습니까?\n\n문제: ${video.problemSlug}\nURL: ${video.videoUrl}`)) return;

    try {
      const res = await fetch(`${WORKER_URL}/admin/beta-videos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        setAuthToken(null);
        setError('세션이 만료되었습니다. Decap CMS에서 다시 로그인해 주세요.');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        alert(`삭제 실패: ${data.error || res.statusText}`);
        return;
      }

      setAllVideos(prev =>
        prev.map(v => v.id === id ? { ...v, deletedAt: new Date().toISOString() } : v)
      );
    } catch (e: unknown) {
      alert(`삭제 오류: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function confirmAccount(pageId: string) {
    if (!authToken || !pendingSession) return;
    setConfirmingAccount(true);
    try {
      const res = await fetch(`${WORKER_URL}/admin/instagram/confirm-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ sessionId: pendingSession, pageId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setOauthMessage(`❌ 계정 연동 실패: ${data.error || res.statusText}`);
        return;
      }
      setPendingSession(null);
      setPendingAccounts([]);
      setOauthMessage('✅ 인스타그램 연동이 완료되었습니다.');
      await loadInstagramStatus(authToken);
    } catch {
      setOauthMessage('❌ 계정 연동 중 오류가 발생했습니다.');
    } finally {
      setConfirmingAccount(false);
    }
  }

  // Instagram OAuth functions
  async function connectInstagram() {
    if (!authToken) return;
    try {
      const res = await fetch(`${WORKER_URL}/admin/instagram/auth-url`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        alert('인스타그램 연동 URL 생성 실패');
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert('인스타그램 연동 시작 중 오류가 발생했습니다.');
    }
  }

  async function disconnectInstagram() {
    if (!authToken || !confirm('인스타그램 연동을 해제하시겠습니까?')) return;
    try {
      await fetch(`${WORKER_URL}/admin/instagram/token`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setIgStatus({ connected: false });
      setHashtagResults([]);
    } catch {
      alert('연동 해제 중 오류가 발생했습니다.');
    }
  }

  async function refreshInstagramToken() {
    if (!authToken) return;
    try {
      const res = await fetch(`${WORKER_URL}/admin/instagram/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        await loadInstagramStatus(authToken);
        alert('토큰이 갱신되었습니다.');
      } else {
        alert('토큰 갱신 실패');
      }
    } catch {
      alert('토큰 갱신 중 오류가 발생했습니다.');
    }
  }

  // When a problem is selected, auto-fill hashtag from its metadata
  function handleProblemSelect(slug: string) {
    setHashtagProblem(slug);
    if (slug && problemMap[slug]?.hashtag) {
      setHashtagQuery(problemMap[slug].hashtag);
    } else if (!slug) {
      setHashtagQuery('');
    }
  }

  async function searchHashtag() {
    if (!authToken || !hashtagQuery.trim()) return;
    setHashtagLoading(true);
    setHashtagError('');
    setHashtagResults([]);
    setSelectedPostIds(new Set());
    setNextCursor(null);

    try {
      const params = new URLSearchParams({ hashtag: hashtagQuery.trim() });
      const [hashtagRes, videosRes] = await Promise.all([
        fetch(`${WORKER_URL}/admin/instagram/hashtag?${params}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        hashtagProblem
          ? fetch(`${WORKER_URL}/admin/beta-videos?problem=${hashtagProblem}&includeDeleted=0`, {
              headers: { Authorization: `Bearer ${authToken}` },
            })
          : Promise.resolve(null),
      ]);

      const data = await hashtagRes.json();
      if (!hashtagRes.ok) {
        setHashtagError(data.error || '검색 실패');
        setHashtagLoading(false);
        return;
      }

      // Build set of already-registered permalinks for the selected problem
      if (videosRes?.ok) {
        const videosData = await videosRes.json();
        const registered = new Set<string>(
          (videosData.videos || []).map((v: BetaVideo) => v.videoUrl)
        );
        setRegisteredUrls(registered);
      } else {
        setRegisteredUrls(new Set());
      }

      setHashtagResults(data.data || []);
      setNextCursor(data.nextCursor || null);
      setShowHashtagModal(true);
    } catch {
      setHashtagError('검색 중 오류가 발생했습니다.');
    } finally {
      setHashtagLoading(false);
    }
  }

  async function loadMoreHashtag() {
    if (!authToken || !hashtagQuery.trim() || !nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ hashtag: hashtagQuery.trim(), after: nextCursor });
      const res = await fetch(`${WORKER_URL}/admin/instagram/hashtag?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHashtagResults(prev => [...prev, ...(data.data || [])]);
        setNextCursor(data.nextCursor || null);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelectPost(postId: string) {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedPostIds.size === hashtagResults.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(hashtagResults.map(p => p.id)));
    }
  }

  async function dryRunSelected() {
    if (!authToken || !hashtagProblem || selectedPostIds.size === 0) return;
    setDryRunLoading(true);
    setDryRunRows(null);
    try {
      const selected = hashtagResults.filter(p => selectedPostIds.has(p.id));
      const res = await fetch(`${WORKER_URL}/admin/beta-videos/dry-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          problemSlug: hashtagProblem,
          items: selected.map(p => ({
            videoUrl: p.permalink,
            thumbnailUrl: p.media_url || p.thumbnail_url || null,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDryRunRows(data.rows);
      } else {
        alert(data.error || 'Dry run 실패');
      }
    } catch {
      alert('Dry run 중 오류가 발생했습니다.');
    } finally {
      setDryRunLoading(false);
    }
  }

  async function registerSelectedAsBetaVideos() {
    if (!authToken || !hashtagProblem || selectedPostIds.size === 0) return;
    setRegistering(true);

    const selected = hashtagResults.filter(p => selectedPostIds.has(p.id));
    let successCount = 0;
    const errors: string[] = [];

    for (const post of selected) {
      try {
        const res = await fetch(`${WORKER_URL}/beta-videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemSlug: hashtagProblem,
            videoUrl: post.permalink,
            thumbnailUrl: post.media_url || post.thumbnail_url || null,
            instagramUsername: post.username || null,
            instagramTimestamp: post.timestamp || null,
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          const d = await res.json();
          errors.push(`${post.permalink}: ${d.error}`);
        }
      } catch {
        errors.push(`${post.permalink}: 네트워크 오류`);
      }
    }

    setRegistering(false);
    setShowHashtagModal(false);
    setSelectedPostIds(new Set());

    if (successCount > 0) {
      await loadVideos(authToken, showDeleted);
    }

    if (errors.length > 0) {
      alert(`${successCount}개 등록 완료\n\n실패:\n${errors.join('\n')}`);
    } else {
      alert(`${successCount}개의 베타 영상이 등록되었습니다.`);
    }
  }

  const filtered = allVideos.filter(v => {
    if (currentPlatform && v.platform !== currentPlatform) return false;
    if (!showDeleted && v.deletedAt) return false;
    if (searchVal) {
      const q = searchVal.toLowerCase();
      const title = problemMap[v.problemSlug]?.title.toLowerCase() ?? '';
      if (!v.problemSlug.toLowerCase().includes(q) && !title.includes(q)) return false;
    }
    return true;
  });

  if (!authToken) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <a href="/admin/" className={styles.backLink}>← CMS</a>
          <h1>베타영상 관리</h1>
        </div>
        <div className={styles.setupScreen}>
          <div className={styles.setupCard}>
            <h2>로그인 필요</h2>
            <p>베타영상 관리 페이지에 접근하려면 먼저 Decap CMS에 로그인해야 합니다.</p>
            <div className={styles.warnBox}>
              ⚠️ Decap CMS 세션이 없습니다.{' '}
              <a href="/admin/">로그인하러 가기 →</a>
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/admin/" className={styles.backLink}>← CMS</a>
        <h1>베타영상 관리</h1>
        <div className={styles.headerSpacer} />
        <button className={styles.logoutBtn} onClick={() => setAuthToken(null)}>로그아웃</button>
      </div>

      <div className={styles.main}>

        {/* OAuth callback toast */}
        {oauthMessage && (
          <div className={`${styles.toastMsg} ${oauthMessage.startsWith('✅') ? styles.toastSuccess : styles.toastError}`}>
            {oauthMessage}
            <button className={styles.toastClose} onClick={() => setOauthMessage('')}>×</button>
          </div>
        )}

        {/* Account Selection Modal */}
        {pendingSession && pendingAccounts.length > 0 && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>인스타그램 계정 선택</h2>
                  <p className={styles.modalSubtitle}>연동할 계정을 선택하세요.</p>
                </div>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingAccounts.map(account => (
                  <button
                    key={account.id}
                    className={`${styles.accountSelectBtn} ${!account.ig_id ? styles.accountSelectBtnWarn : ''}`}
                    onClick={() => confirmAccount(account.id)}
                    disabled={confirmingAccount}
                  >
                    <span className={styles.accountSelectName}>
                      {account.ig_username ? `@${account.ig_username}` : account.name}
                    </span>
                    {account.ig_username && (
                      <span className={styles.accountSelectSub}>{account.name}</span>
                    )}
                    {!account.ig_id && (
                      <span className={styles.accountSelectWarn}>
                        ⚠️ Instagram Business 계정이 아닙니다. 해시태그 검색 등 대부분의 기능이 동작하지 않을 수 있습니다.
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={styles.modalCancelBtn}
                  onClick={() => { setPendingSession(null); setPendingAccounts([]); }}
                  disabled={confirmingAccount}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instagram OAuth Section */}
        <div className={styles.igSection}>
          <div className={styles.igSectionHeader}>
            <h2>인스타그램 연동</h2>
            {igStatus?.connected && <span className={styles.igConnectedBadge}>연결됨 ✓</span>}
          </div>

          {igStatusLoading && <p className={styles.stateMsg}>상태 확인 중...</p>}

          {!igStatusLoading && igStatus && (
            <>
              <div className={styles.igStatusCard}>
                {igStatus.connected ? (
                  <>
                    <p className={styles.igStatusText}>
                      {igStatus.username && `@${igStatus.username} `}
                      (ID: {igStatus.userId})
                      &nbsp;|&nbsp;
                      만료: {igStatus.expiresAt
                        ? new Date(igStatus.expiresAt).toLocaleDateString('ko-KR')
                        : '-'}
                      &nbsp;({igStatus.daysUntilExpiry}일 남음)
                    </p>
                    {igStatus.needsRefresh && (
                      <button className={styles.igRefreshBtn} onClick={refreshInstagramToken}>
                        🔄 토큰 갱신
                      </button>
                    )}
                    <button className={styles.igDisconnectBtn} onClick={disconnectInstagram}>
                      연동 해제
                    </button>
                  </>
                ) : (
                  <button className={styles.igConnectBtn} onClick={connectInstagram}>
                    📸 인스타그램 연동하기
                  </button>
                )}
              </div>

              {/* Hashtag Search Controls - only when connected */}
              {igStatus.connected && (
                <div className={styles.hashtagSection}>
                  <h3>해시태그 검색</h3>
                  <div className={styles.hashtagControls}>
                    <select
                      className={styles.problemSelect}
                      value={hashtagProblem}
                      onChange={e => handleProblemSelect(e.target.value)}
                    >
                      <option value="">-- 문제 선택 --</option>
                      {Object.entries(problemMap).map(([slug, meta]) => (
                        <option key={slug} value={slug}>
                          {meta.title} ({slug})
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.hashtagInput}
                      type="text"
                      placeholder="해시태그 (예: #안양_Piano)"
                      value={hashtagQuery}
                      onChange={e => setHashtagQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchHashtag()}
                    />
                    <button
                      className={styles.hashtagSearchBtn}
                      onClick={searchHashtag}
                      disabled={hashtagLoading || !hashtagQuery.trim()}
                    >
                      {hashtagLoading ? '검색 중...' : '검색'}
                    </button>
                  </div>
                  {hashtagError && <p className={styles.errorMsg}>{hashtagError}</p>}
                  {!hashtagProblem && (
                    <p className={styles.hashtagHint}>검색 전 위에서 등록할 문제를 선택하세요.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Hashtag Search Results Modal */}
        {showHashtagModal && (
          <div className={styles.modalOverlay} onClick={() => setShowHashtagModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>해시태그 검색 결과</h2>
                  <p className={styles.modalSubtitle}>
                    {hashtagQuery} · {hashtagResults.length}개
                    {hashtagProblem && problemMap[hashtagProblem]
                      ? ` | 등록 대상: ${problemMap[hashtagProblem].title}`
                      : ''}
                  </p>
                </div>
                <button className={styles.modalClose} onClick={() => setShowHashtagModal(false)}>×</button>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.selectAllBtn} onClick={toggleSelectAll}>
                  {selectedPostIds.size === hashtagResults.length ? '전체 해제' : '전체 선택'}
                </button>
                <span className={styles.selectedCount}>
                  {selectedPostIds.size}개 선택됨
                </span>
              </div>

              <div className={styles.igGrid}>
                {hashtagResults.map(post => {
                  const isRegistered = registeredUrls.has(post.permalink);
                  const isSelected = selectedPostIds.has(post.id);
                  const rawThumb = post.thumbnail_url || post.media_url;
                  const thumb = rawThumb
                    ? `${WORKER_URL}/proxy/image?url=${encodeURIComponent(rawThumb)}`
                    : null;
                  return (
                    <div
                      key={post.id}
                      className={`${styles.igCard} ${isSelected ? styles.igCardSelected : ''} ${isRegistered ? styles.igCardRegistered : ''}`}
                      onClick={() => !isRegistered && toggleSelectPost(post.id)}
                    >
                      {isRegistered ? (
                        <div className={styles.igRegisteredBadge}>✓ 등록됨</div>
                      ) : (
                        <div className={styles.igCardCheckbox}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPost(post.id)}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      )}
                      {thumb ? (
                        <img
                          className={styles.igCardImg}
                          src={thumb}
                          alt=""
                          loading="lazy"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={styles.igCardImgPlaceholder}>📸</div>
                      )}
                      <div className={styles.igCardFooter}>
                        <span className={styles.igMediaType}>{post.media_type}</span>
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.igPermalink}
                          onClick={e => e.stopPropagation()}
                        >
                          보기 ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {nextCursor && (
                <div className={styles.loadMoreRow}>
                  <button
                    className={styles.loadMoreBtn}
                    onClick={loadMoreHashtag}
                    disabled={loadingMore}
                  >
                    {loadingMore ? '불러오는 중...' : '더 불러오기'}
                  </button>
                </div>
              )}

              <div className={styles.modalFooter}>
                <button className={styles.modalCancelBtn} onClick={() => setShowHashtagModal(false)}>
                  취소
                </button>
                <button
                  className={styles.modalDryRunBtn}
                  onClick={dryRunSelected}
                  disabled={selectedPostIds.size === 0 || !hashtagProblem || dryRunLoading}
                  title={!hashtagProblem ? '모달을 닫고 문제를 선택하세요' : 'DB에 저장될 데이터 미리보기'}
                >
                  {dryRunLoading ? 'oEmbed 조회 중...' : `🔍 Dry Run (${selectedPostIds.size})`}
                </button>
                <button
                  className={styles.modalRegisterBtn}
                  onClick={registerSelectedAsBetaVideos}
                  disabled={selectedPostIds.size === 0 || registering || !hashtagProblem}
                  title={!hashtagProblem ? '모달을 닫고 문제를 선택하세요' : ''}
                >
                  {registering
                    ? '등록 중...'
                    : `선택된 ${selectedPostIds.size}개 베타로 등록`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dry Run Result Modal */}
        {dryRunRows && (
          <div className={styles.modalOverlay} onClick={() => setDryRunRows(null)}>
            <div className={styles.modal} style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>🔍 Dry Run — DB INSERT 미리보기</h2>
                <button className={styles.modalClose} onClick={() => setDryRunRows(null)}>×</button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ marginBottom: '12px', color: '#666', fontSize: '13px' }}>
                  실제로 저장되는 데이터가 아닙니다. 아래는 <strong>{dryRunRows.length}개</strong> 포스트 선택 시 DB에 INSERT될 값입니다.
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table} style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>problem_slug</th>
                        <th>video_url</th>
                        <th>post_id</th>
                        <th>platform</th>
                        <th>thumbnail_url</th>
                        <th>status</th>
                        <th>instagram_username</th>
                        <th>instagram_timestamp</th>
                        <th>submitted_at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunRows.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><code>{row.problem_slug}</code></td>
                          <td style={{ maxWidth: '160px', wordBreak: 'break-all' }}>
                            <a href={row.video_url} target="_blank" rel="noopener noreferrer">{row.video_url}</a>
                          </td>
                          <td><code>{row.post_id ?? <span style={{ color: '#999' }}>null</span>}</code></td>
                          <td><code>{row.platform}</code></td>
                          <td style={{ maxWidth: '120px', wordBreak: 'break-all', fontSize: '11px' }}>
                            {row.thumbnail_url
                              ? <a href={row.thumbnail_url} target="_blank" rel="noopener noreferrer">보기 ↗</a>
                              : <span style={{ color: '#999' }}>null</span>}
                          </td>
                          <td><code>{row.status}</code></td>
                          <td>{row.instagram_username
                            ? <code>@{row.instagram_username}</code>
                            : <span style={{ color: '#999' }}>null</span>}
                          </td>
                          <td style={{ fontSize: '11px' }}>
                            {row.instagram_timestamp
                              ? formatDate(row.instagram_timestamp)
                              : <span style={{ color: '#999' }}>null</span>}
                          </td>
                          <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{formatDate(row.submitted_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.modalCancelBtn} onClick={() => setDryRunRows(null)}>닫기</button>
              </div>
            </div>
          </div>
        )}

        {/* Beta Videos List */}
        <div className={styles.topBar}>
          <h2>베타영상 목록</h2>
          <span className={styles.badge}>{filtered.length}개</span>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.filterBar}>
          {(['', 'instagram', 'youtube', 'tiktok', 'other'] as const).map(p => (
            <button
              key={p}
              className={`${styles.filterBtn} ${currentPlatform === p ? styles.active : ''}`}
              onClick={() => setCurrentPlatform(p)}
            >
              {p === '' ? '전체' : `${PLATFORM_INFO[p as Platform].icon} ${PLATFORM_INFO[p as Platform].label}`}
            </button>
          ))}
          <div className={styles.filterSpacer} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="문제명 검색..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
          />
          <label className={styles.toggleDeleted}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={e => setShowDeleted(e.target.checked)}
            />
            삭제된 항목 포함
          </label>
        </div>

        <div className={styles.tableWrapper}>
          {loading && <div className={styles.stateMsg}>불러오는 중...</div>}
          {!loading && filtered.length === 0 && (
            <div className={styles.stateMsg}>등록된 베타영상이 없습니다.</div>
          )}
          {!loading && filtered.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thumbnailCell}>썸네일</th>
                  <th>플랫폼</th>
                  <th>URL</th>
                  <th>Author</th>
                  <th>문제 (Problem)</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const pi = PLATFORM_INFO[v.platform] || PLATFORM_INFO.other;
                  const problem = problemMap[v.problemSlug];
                  return (
                    <tr key={v.id} className={v.deletedAt ? styles.deletedRow : ''}>
                      <td className={styles.thumbnailCell}>
                        {v.thumbnailUrl ? (
                          <img
                            className={styles.thumbnail}
                            src={v.thumbnailUrl}
                            alt=""
                            loading="lazy"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>{pi.icon}</div>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.platformBadge} ${styles[`platform_${v.platform}`]}`}>
                          {pi.icon} {pi.label}
                        </span>
                      </td>
                      <td>
                        <a
                          className={styles.videoLink}
                          href={v.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={v.videoUrl}
                        >
                          {truncateUrl(v.videoUrl)}
                        </a>
                      </td>
                      <td className={styles.authorCell}>
                        {v.instagramUsername
                          ? <span className={styles.authorName}>@{v.instagramUsername}</span>
                          : <span className={styles.authorEmpty}>-</span>
                        }
                      </td>
                      <td>
                        {problem ? (
                          <a
                            href={problem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.problemLink}
                          >
                            <span className={styles.problemTitle}>{problem.title}</span>
                            <span className={styles.problemSlug}>{v.problemSlug}</span>
                          </a>
                        ) : (
                          <span className={styles.problemSlug}>{v.problemSlug}</span>
                        )}
                      </td>
                      <td className={styles.dateCell}>{formatDate(v.submittedAt)}</td>
                      <td>
                        <div className={styles.actionCell}>
                          {v.platform === 'instagram' && !v.deletedAt && (
                            <button
                              className={styles.refreshBtn}
                              onClick={() => refreshVideoMeta(v.id)}
                              disabled={refreshingIds.has(v.id)}
                              title="author 및 썸네일 다시 불러오기"
                            >
                              {refreshingIds.has(v.id) ? '...' : '🔄'}
                            </button>
                          )}
                          {v.deletedAt ? (
                            <span className={styles.deletedLabel}>삭제됨<br />{formatDate(v.deletedAt)}</span>
                          ) : (
                            <button className={styles.deleteBtn} onClick={() => deleteVideo(v.id)}>
                              🗑 삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
