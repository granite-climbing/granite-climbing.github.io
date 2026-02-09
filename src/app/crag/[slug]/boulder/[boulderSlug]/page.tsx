import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import BoulderDetail from '@/components/BoulderDetail';
import Footer from '@/components/Footer';
import { getAllCrags, getCragBySlug, getBouldersByCrag, getBoulderBySlug, getProblemsByBoulder } from '@/lib/content';

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
  const problems = getProblemsByBoulder(params.boulderSlug);

  return (
    <>
      <Header />
      <main>
        <BoulderDetail
          cragSlug={crag.slug}
          boulder={boulder}
          problems={problems}
          allBoulders={allBoulders}
        />
      </main>
      <Footer />
    </>
  );
}
