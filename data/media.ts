/** TEMPORARY STOCK MEDIA REGISTRY — replace URLs here with original Flight P.R. assets. */
const u = (id: string, width = 1800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=88`;

export const media = {
  logo: "/favicon.webp",
  mark: "https://i0.wp.com/flightpr.net/wp-content/uploads/2025/09/cropped-Flight-PR-Rev.7-1.webp?fit=400%2C400&ssl=1",
  hero: u("photo-1519741497674-611481863552", 2400), manifesto: "/media/home/sorr-1.webp",
  showreelPoster: u("photo-1519225421980-715cb0215aed", 2400), drone: u("photo-1530789253388-582c481c54b0", 2400), homeDroneBanner: "/media/home/drone2.webp",
  finalCta: u("photo-1519741497674-611481863552", 2400),
  wedding: {
    rome: u("photo-1519225421980-715cb0215aed"), puglia: u("photo-1606216794074-735e91aa2c92"),
    tuscany: u("photo-1464366400600-7168b8af9bc3"), amalfi: u("photo-1537633552985-df8429e8048b"),
    details: u("photo-1490750967868-88aa4486c946"), party: u("photo-1507504031003-b417219a0fde"),
    reception: u("photo-1519167758481-83f550bb49b3"), ceremony: u("photo-1520854221256-17451cc331bf"),
    couple: u("photo-1522673607200-164d1b6ce486"), night: u("photo-1523438885200-e635ba2c371e"),
  },
  services: { photo: "/media/home/fotografia.webp", film: "/media/home/video.webp", drone: "/media/home/drone1.webp", events: "/media/home/eventi.webp" },
  // TODO: Replace with original Flight P.R. wedding footage
  heroVideo: "", showreelVideo: "https://www.andreban.com/storage/flightpr/home.mp4", projectVideo: "",
} as const;

export const stockNotice = "Le immagini di questa anteprima sono stock temporanee e saranno sostituite con i contenuti originali Flight P.R.";
