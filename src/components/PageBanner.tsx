import styles from './PageBanner.module.css';

interface PageBannerProps {
  image: string;
  title: string;
}

export default function PageBanner({ image, title }: PageBannerProps) {
  return (
    <section className={styles.banner}>
      <img src={image} alt={title} className={styles.bannerImage} />
      <div className={styles.overlay}>
        <h1 className={styles.title}>
          <span className={styles.icon}>📍</span>
          {title}
        </h1>
      </div>
    </section>
  );
}
