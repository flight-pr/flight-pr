import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui";
import { getProject, projects } from "@/data/projects";
import styles from "./album.module.css";

export function generateStaticParams() { return projects.map(project => ({ slug: project.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = getProject((await params).slug);
  return { title: project ? `${project.title} — Album` : "Album", robots: project && project.images.length === 0 ? { index: false, follow: true } : undefined };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  return <main id="main"><header className="page-header"><Link href="/portfolio" className="text-link"><ArrowLeft size={17} /> Tutti gli album</Link><Eyebrow>{project.occasion}</Eyebrow><h1>{project.title}</h1>{project.images.length === 0 ? <p>Le fotografie di questo album saranno disponibili a breve.</p> : null}</header>{project.images.length > 0 ? <section className={styles.gallery} aria-label={`Fotografie di ${project.title}`}>{project.images.map((src, index) => <figure key={src} className={styles.photo}><Image src={src} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" alt={`${project.title} — fotografia ${index + 1}`} /></figure>)}</section> : null}<section className="simple-cta"><h2>La prossima festa è la vostra?</h2><Link href="/contatti" className="button-primary">Parliamone <ArrowRight /></Link></section></main>;
}
