const fs = require("fs");
const path = require("path");

const singles = [];
const parts = {};

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".wrangler") continue;
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      walk(file);
    } else if (/\.b64part\d+$/.test(name)) {
      const key = file.replace(/\.b64part\d+$/, "");
      (parts[key] ||= []).push(file);
    } else if (name.endsWith(".b64")) {
      singles.push(file);
    }
  }
}

function decode(b64, outPath) {
  fs.writeFileSync(outPath, Buffer.from(b64.replace(/\s/g, ""), "base64"));
}

walk(process.cwd());
for (const file of singles) decode(fs.readFileSync(file, "utf8"), file.slice(0, -4));
for (const [key, files] of Object.entries(parts)) {
  files.sort();
  const b64 = files.map((file) => fs.readFileSync(file, "utf8")).join("");
  decode(b64, key.endsWith(".b64") ? key.slice(0, -4) : key);
}
