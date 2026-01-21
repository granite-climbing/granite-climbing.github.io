import styles from './CragDetailBanner.module.css';

interface CragDetailBannerProps {
  thumbnail: string;
  title: string;
  description: string;
}

export default function CragDetailBanner({ thumbnail, title, description }: CragDetailBannerProps) {
  return (
    <section className={styles.banner}>
      <img src={thumbnail} alt={title} className={styles.image} />
      <div className={styles.overlay}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
    </section>
  );
}
