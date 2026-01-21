import Header from '@/components/Header';
import PageBanner from '@/components/PageBanner';
import CragList from '@/components/CragList';
import Footer from '@/components/Footer';
import { getAllCrags, getSiteSettings } from '@/lib/content';

export default async function CragPage() {
  const crags = getAllCrags();
  const settings = getSiteSettings();

  return (
    <>
      <Header />
      <main>
        <PageBanner image={settings.heroImage} title="Crag" />
        <CragList crags={crags} />
      </main>
      <Footer />
    </>
  );
}
