import { media } from "@/data/media";
import { Eyebrow } from "./ui";
import styles from "./showreel.module.css";

export function Showreel() {
  return (
    <section id="showreel" className={`showreel ${styles.section}`}>
      <video className={styles.video} src={media.showreelVideo} poster={media.showreelPoster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      <div className={`hero-overlay ${styles.shade}`} />
      <div className={`showreel-content ${styles.content}`}>
        <Eyebrow>Flight films</Eyebrow>
        <h2>Ogni storia ha un ritmo.<br /><em>Il vostro si sente.</em></h2>
      </div>
    </section>
  );
}
