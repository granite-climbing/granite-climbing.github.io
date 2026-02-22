import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import BoulderDetail from '@/components/BoulderDetail';
import Footer from '@/components/Footer';
import { getAllCrags, getCragBySlug, getBouldersByCrag, getBoulderBySlug, getToposByBoulder, getProblemsByTopo } from '@/lib/content';

interface BoulderDetailPageProps {
  params: { slug: string; boulderSlug: string };
}

export async function generateStaticParams() {
  const crags = getAllCrags();
  const params: { slug: string; boulderSlug: string }[] = [];

  crags.forEach((crag) => {
    const boulders = getBouldersByCrag(crag.slug);
    boulders.forEach((boulder) => {
      params.push({
        slug: crag.slug,
        boulderSlug: boulder.slug,
      });
    });
  });

  return params;
}

export default async function BoulderDetailPage({ params }: BoulderDetailPageProps) {
  const crag = getCragBySlug(params.slug);
  if (!crag) {
    notFound();
  }

  const boulder = getBoulderBySlug(params.boulderSlug);
  if (!boulder) {
    notFound();
  }

  const allBoulders = getBouldersByCrag(params.slug);
  const topos = getToposByBoulder(params.boulderSlug);

  // Get problems for each topo
  const toposWithProblems = topos.map((topo) => ({
    ...topo,
    problems: getProblemsByTopo(topo.slug),
  }));

  return (
    <>
      <Header />
      <main>
        <BoulderDetail
          cragSlug={crag.slug}
          cragTitle={crag.title}
          boulder={boulder}
          toposWithProblems={toposWithProblems}
          allBoulders={allBoulders}
        />
      </main>
      <Footer />
    </>
  );
}
