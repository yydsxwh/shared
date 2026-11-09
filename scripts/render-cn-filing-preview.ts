import { writeFileSync } from "node:fs";

import { renderCompanyPreviewHtml } from "../src/legal/cn-filing";

const destination = process.argv[2];
const html = renderCompanyPreviewHtml();
if (!destination) {
  process.stdout.write(html);
} else {
  writeFileSync(destination, html);
  console.log(`wrote ${destination}`);
}
