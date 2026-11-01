"use client";

import Script from "next/script";

type Work = { id: string; title: string; type: string };

export function ElimuaInstagramWorks({ posts }: { posts: Work[] }) {
  return <div className="eli-work-grid">
    {posts.map((work) => <article className="eli-work-card" key={work.id}>
      <div className="eli-work-card-head"><span>{work.type}</span><a href={`https://www.instagram.com/p/${work.id}/`} target="_blank" rel="noreferrer" aria-label={`Apri il post Instagram: ${work.title}`}>↗</a></div>
      <blockquote className="instagram-media" data-instgrm-permalink={`https://www.instagram.com/p/${work.id}/?utm_source=ig_embed&utm_campaign=loading`} data-instgrm-version="14"><a href={`https://www.instagram.com/p/${work.id}/`} target="_blank" rel="noreferrer">Apri il lavoro originale su Instagram</a></blockquote>
      <h3>{work.title}</h3>
    </article>)}
    <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" onLoad={() => { (window as Window & { instgrm?: { Embeds?: { process?: () => void } } }).instgrm?.Embeds?.process?.(); }} />
  </div>;
}
