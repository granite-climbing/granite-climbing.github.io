import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import TopoDetail from '@/components/TopoDetail';
import Footer from '@/components/Footer';
import {
  getAllCrags,
  getCragBySlug,
  getBoulderBySlug,
  getTopoBySlug,
  getToposByBoulder,
  getProblemsByTopo,
} from '@/lib/content';

interface TopoDetailPageProps {
  params: { slug: string; boulderSlug: string; topoSlug: string };
}

export async function generateStaticParams() {
  const crags = getAllCrags();
  const params: { slug: string; boulderSlug: string; topoSlug: string }[] = [];

  crags.forEach((crag) => {
    const cragSlug = crag.slug;
    // We need to get all boulders from content.ts directly
    const fs = require('fs');
    const path = require('path');
    const matter = require('gray-matter');

    const bouldersDir = path.join(process.cwd(), 'content', 'boulders');
    if (fs.existsSync(bouldersDir)) {
      const boulderFiles = fs.readdirSync(bouldersDir).filter((f: string) => f.endsWith('.md'));

      boulderFiles.forEach((boulderFile: string) => {
        const boulderPath = path.join(bouldersDir, boulderFile);
        const boulderContent = fs.readFileSync(boulderPath, 'utf8');
        const { data: boulderData } = matter(boulderContent);

        if (boulderData.crag === cragSlug) {
          const boulderSlug = boulderData.slug || boulderFile.replace(/\.md$/, '');

          // Get all topos for this boulder
          const toposDir = path.join(process.cwd(), 'content', 'topos');
          if (fs.existsSync(toposDir)) {
            const topoFiles = fs.readdirSync(toposDir).filter((f: string) => f.endsWith('.md'));

            topoFiles.forEach((topoFile: string) => {
              const topoPath = path.join(toposDir, topoFile);
              const topoContent = fs.readFileSync(topoPath, 'utf8');
              const { data: topoData } = matter(topoContent);

              if (topoData.boulder === boulderSlug) {
                const topoSlug = topoData.slug || topoFile.replace(/\.md$/, '');
                params.push({
                  slug: cragSlug,
                  boulderSlug,
                  topoSlug,
                });
              }
            });
          }
        }
      });
    }
  });

  return params;
}

export async function generateMetadata({ params }: TopoDetailPageProps) {
  const topo = getTopoBySlug(params.topoSlug);
  const boulder = getBoulderBySlug(params.boulderSlug);
  const crag = getCragBySlug(params.slug);

  if (!topo || !boulder || !crag) {
    return {
      title: 'Topo Not Found',
    };
  }

  return {
    title: `${topo.title} - ${boulder.title} - ${crag.title} | Granite Climbing`,
    description: topo.description || `${topo.title} topo at ${boulder.title}, ${crag.title}`,
  };
}

export default async function TopoDetailPage({ params }: TopoDetailPageProps) {
  const crag = getCragBySlug(params.slug);
  if (!crag) {
    notFound();
  }

  const boulder = getBoulderBySlug(params.boulderSlug);
  if (!boulder) {
    notFound();
  }

  const topo = getTopoBySlug(params.topoSlug);
  if (!topo) {
    notFound();
  }

  const allTopos = getToposByBoulder(params.boulderSlug);
  const problems = getProblemsByTopo(params.topoSlug);

  return (
    <>
      <Header />
      <main>
        <TopoDetail
          cragSlug={crag.slug}
          cragTitle={crag.title}
          boulderSlug={boulder.slug}
          boulderTitle={boulder.title}
          topo={topo}
          problems={problems}
          allTopos={allTopos}
        />
      </main>
      <Footer />
    </>
  );
}
