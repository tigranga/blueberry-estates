const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".wrangler") continue;
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      walk(file);
    } else if (name.endsWith(".b64")) {
      const out = file.slice(0, -4);
      fs.writeFileSync(out, Buffer.from(fs.readFileSync(file, "utf8").replace(/\s/g, ""), "base64"));
    }
  }
}

walk(process.cwd());
