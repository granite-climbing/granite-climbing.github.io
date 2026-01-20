import styles from './HeroBanner.module.css';

interface HeroBannerProps {
  image: string;
  slogan1: string;
  slogan2: string;
}

export default function HeroBanner({ image, slogan1, slogan2 }: HeroBannerProps) {
  return (
    <section className={styles.hero}>
      <img src={image} alt="Hero" className={styles.heroImage} />
      <div className={styles.overlay}>
        <h1 className={styles.slogan}>
          <span>{slogan1}</span>
          <span>{slogan2}</span>
        </h1>
      </div>
    </section>
  );
}
