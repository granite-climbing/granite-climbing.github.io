import styles from './HeroBanner.module.css';

interface HeroBannerProps {
  image: string;
  slogan: string;
}

export default function HeroBanner({ image, slogan }: HeroBannerProps) {
  const lines = slogan.split('\n').filter(line => line.trim() !== '');

  return (
    <section className={styles.hero}>
      <img src={image} alt="Hero" className={styles.heroImage} />
      <div className={styles.overlay}>
        <h1 className={styles.slogan}>
          {lines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </h1>
      </div>
    </section>
  );
}
