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
  submittedAt: string;
  status: string;
  postId: string | null;
  deletedAt: string | null;
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

  useEffect(() => {
    const token = getDecapToken();
    setAuthToken(token);
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

  useEffect(() => {
    if (authToken) loadVideos(authToken, showDeleted);
  }, [authToken, loadVideos, showDeleted]);

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
                  <th>문제 (Problem)</th>
                  <th>등록일</th>
                  <th>삭제</th>
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
                        {v.deletedAt ? (
                          <span className={styles.deletedLabel}>삭제됨<br />{formatDate(v.deletedAt)}</span>
                        ) : (
                          <button className={styles.deleteBtn} onClick={() => deleteVideo(v.id)}>
                            🗑 삭제
                          </button>
                        )}
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
