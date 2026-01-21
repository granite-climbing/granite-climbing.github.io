import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import CragDetailBanner from '@/components/CragDetailBanner';
import CragDetailTabs from '@/components/CragDetailTabs';
import Footer from '@/components/Footer';
import { getCragBySlug, getAllCrags } from '@/lib/content';

interface CragDetailPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const crags = getAllCrags();
  return crags.map((crag) => ({
    slug: crag.slug,
  }));
}

export default async function CragDetailPage({ params }: CragDetailPageProps) {
  const crag = getCragBySlug(params.slug);

  if (!crag) {
    notFound();
  }

  return (
    <>
      <Header />
      <main>
        <CragDetailBanner
          thumbnail={crag.thumbnail}
          title={crag.title}
          description={crag.description}
        />
        <CragDetailTabs crag={crag} />
      </main>
      <Footer />
    </>
  );
}
