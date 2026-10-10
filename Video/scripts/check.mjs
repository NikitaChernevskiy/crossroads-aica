// Pre-export gate: refuses to render a submission while required inputs are missing.
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const config = read("src/data/config.json");
const media = read("src/data/media.json");
const timeline = read("src/data/timeline.json");

const issues = [];
const total = Object.values(timeline).reduce((a, b) => a + b, 0);
if (total > 120) issues.push(`Duration ${total} s exceeds 2:00`);
for (const id of Object.keys(timeline)) if (!media.voiceover[id]) issues.push(`No narration for "${id}" (npm run voiceover)`);
if (!media.demoFocused) issues.push("Missing public/demo-focused.mp4");
if (!media.demoTense) issues.push("Missing public/demo-tense.mp4");
if (!config.claudeContribution) issues.push("config.claudeContribution is empty");
if (!config.lovableContribution) issues.push("config.lovableContribution is empty");

if (issues.length) {
  console.error("Not ready for submission:\n- " + issues.join("\n- "));
  console.error("\nUse `npm run render:draft` for a preview render.");
  process.exit(1);
}
console.log(`✓ Ready: ${total} s, all inputs present.`);
