import sharp from "sharp";
export async function compressPublicImage(bytes: Buffer) {
  const image = sharp(bytes, { limitInputPixels: 40000000, animated: false });
  const source = await image.metadata();
  if (!["jpeg", "png", "webp", "avif", "heif"].includes(source.format || "") || (source.pages || 1) > 1) throw new Error("Carica un’immagine JPG, PNG, WebP o AVIF non animata.");
  const { data, info } = await image.rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height };
}
