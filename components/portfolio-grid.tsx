import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projects";
import styles from "./portfolio-grid.module.css";

export function PortfolioGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.grid}>
      {projects.slice(0, compact ? 4 : undefined).map((project, index) => (
        <Link href={`/portfolio/${project.slug}`} className={styles.card} key={project.slug}>
          {project.cover ? <Image src={project.cover} alt={project.title} fill unoptimized sizes="(max-width: 900px) 100vw, 33vw" /> : <span className={styles.number} aria-hidden="true">{project.title.split(" ")[0]}</span>}
          <div className={styles.shade} />
          <div className={styles.meta}>
            <span className={styles.index}>0{index + 1} · {project.occasion}</span>
            <h2>{project.title}</h2>
            <span className={styles.open}>Apri album <ArrowUpRight size={17} /></span>
          </div>
        </Link>
      ))}
    </div>
  );
}
