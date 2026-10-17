export type Project = {
  slug: string;
  title: string;
  occasion: string;
  cover?: string;
  images: string[];
};

export const projects: Project[] = [
  {
    slug: "18-silvia",
    title: "18 Silvia",
    occasion: "Diciottesimo",
    cover: "/media/portfolio/18/Silvia/1.webp",
    images: [
      "/media/portfolio/18/Silvia/1.webp",
      "/media/portfolio/18/Silvia/2.webp",
      "/media/portfolio/18/Silvia/3.webp",
      "/media/portfolio/18/Silvia/4.webp",
      "/media/portfolio/18/Silvia/5.webp",
      "/media/portfolio/18/Silvia/6.webp",
    ],
  },
  { slug: "18-viola", title: "18 Viola", occasion: "Diciottesimo", images: [] },
  { slug: "60-fabio", title: "60 Fabio", occasion: "Sessantesimo", images: [] },
];

export const getProject = (slug: string) => projects.find((project) => project.slug === slug);
