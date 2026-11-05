const fs = require("fs");
const path = require("path");

const SOURCE = "https://blueberry-estates.pages.dev/";
const files = [
  "logo.png",
  "wreath.png",
  "rental-agreement.pdf",
  ...Array.from({ length: 22 }, (_, i) => `photos/${String(i + 1).padStart(2, "0")}.jpg`),
];

async function main() {
  for (const file of files) {
    const res = await fetch(SOURCE + file);
    if (!res.ok) throw new Error(`Could not download ${file}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
