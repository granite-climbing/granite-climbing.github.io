import { getAllProblems, getAllTopos, getAllBoulders } from '@/lib/content';
import BetaVideosAdminClient from './BetaVideosAdminClient';

export type ProblemMeta = {
  title: string;
  url: string; // /crag/[cragSlug]/boulder/[boulderSlug]#[topoSlug]
  hashtag: string;
};

function buildProblemMap(): Record<string, ProblemMeta> {
  const problems = getAllProblems();
  const topos = getAllTopos();
  const boulders = getAllBoulders();

  const topoMap: Record<string, typeof topos[number]> = Object.fromEntries(topos.map(t => [t.slug, t]));
  const boulderMap: Record<string, typeof boulders[number]> = Object.fromEntries(boulders.map(b => [b.slug, b]));

  const map: Record<string, ProblemMeta> = {};
  for (const p of problems) {
    const topo = topoMap[p.topo];
    if (!topo) continue;
    const boulder = boulderMap[topo.boulder];
    if (!boulder) continue;
    map[p.slug] = {
      title: p.title,
      url: `/crag/${boulder.crag}/boulder/${boulder.slug}#${topo.slug}`,
      hashtag: p.hashtag,
    };
  }
  return map;
}

export default function BetaVideosAdminPage() {
  const problemMap = buildProblemMap();
  return <BetaVideosAdminClient problemMap={problemMap} />;
}
