import { access } from "node:fs/promises";
import { extname, resolve } from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("Usage: npm run image:prepare -- path/to/image [path/to/output.webp]");
  process.exit(1);
}

const input = resolve(source);
const output = resolve(process.argv[3] ?? source.slice(0, -extname(source).length) + ".webp");
if (input === output || extname(output).toLowerCase() !== ".webp") {
  console.error("Output must be a different file ending in .webp");
  process.exit(1);
}

await access(input);
await sharp(input)
  .rotate()
  .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 80, effort: 5 })
  .toFile(output);
console.log(output);
