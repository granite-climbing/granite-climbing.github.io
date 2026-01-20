import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import CragSection from '@/components/CragSection';
import CultureSection from '@/components/CultureSection';
import Footer from '@/components/Footer';
import { getSiteSettings, getAllCrags, getAllCultureItems } from '@/lib/content';

export default async function Home() {
  const settings = getSiteSettings();
  const crags = getAllCrags();
  const cultureItems = getAllCultureItems();

  return (
    <>
      <Header />
      <main>
        <HeroBanner
          image={settings.heroImage}
          slogan1={settings.slogan1}
          slogan2={settings.slogan2}
        />
        <CragSection crags={crags} />
        <CultureSection items={cultureItems} />
      </main>
      <Footer />
    </>
  );
}
