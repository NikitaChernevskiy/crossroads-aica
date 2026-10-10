# AI Emotional Partner: investor pitch and demo video

Remotion project. Output: MP4, 1920x1080, H.264 + AAC, 1:54, burned-in English captions plus `out/captions.srt`.

## Edit specification (fixed timeline in `src/data/timeline.json`)

Hackathon theme: **AI That Does the Work**: "Don’t rebuild the agent. Build what it can’t do without you." Judged on working prototype, use of AI, problem & impact, execution & demo quality.

| Time | Scene | Purpose | On screen |
|---|---|---|---|
| 0:00–0:04 | Title | The idea in one picture | Silent card: 😰 person + Muse → signal → 🤖 → calm reply → 😊. Theme line. Music at 50% |
| 0:04–0:16 | Opening | Human problem | Same question in two situations, 😊 / 😰. "Same question. Different needs." *Illustration* |
| 0:16–0:27 | Product | Theme fit + buyer | "We don’t rebuild the agent. We give it what it can’t know." 😰 person + large Muse S Athena and Neurable One photos → AI Emotional Partner (one MCP tool) → any AI agent (wellbeing apps first) |
| 0:27–0:49 | Demo | Working prototype | Two recordings (😊 focused, 😰 tense) + estimated state + **real** `get_behavior_guidance` output. 7 s of spare runtime can extend this when real clips exist |
| 0:49–1:01 | Architecture | AI use | Wearables → local processing → Azure (Container Apps + MCP Guidance Server, Cosmos DB, Entra, Monitor) → Foundry → response; future-research panel |
| 1:01–1:10 | How we built it | "Explain how you built it" | Azure SRE Agent running on an Anthropic Claude model (backend, MCP, infra, CI/CD) · Microsoft Foundry · Claude Code (this video) · Lovable (placeholder) |
| 1:10–1:20 | EU AI Act | Trust | GDPR · Art. 50 · Art. 5 · Annex III design commitments |
| 1:20–1:33 | Business | Beachhead + model | Wellbeing apps with wearables, $4.5B category context, B2B subscription + usage (proposed), then any agent that works for people |
| 1:33–1:42 | Team (`TeamSlide`) | Credibility | Three team cards |
| 1:42–1:54 | Ask & close | Deep tech ask + hook | Validation, devices, conversation analysis, train-with-wearables → without; partners (EEG makers, Copilot Studio, Agentforce); "Not everything is measured in money. How people feel matters too. 💙" |

## Team scene (1:33–1:42, 9 s, composition `TeamSlide`; 9:16 variant `TeamSlideVertical`)

On-screen text (verbatim, source of truth is `src/TeamSlide.tsx`):

- Title **THE TEAM**, subtitle *Builders who speak human*
- **Artem Chernevskiy**, Founder, AICA
  - Role: Product, emotion model, Foundry agent (confirmed)
  - Microsoft MVP · Microsoft Foundry & M365 Copilot
  - Erickson-trained coach · 128h ICF-approved education
  - Harvard Online · Data Privacy and Technology
  - Tag: Current state: calm and curious
- **Nikita Chernevskiy**, Co-founder, AICA
  - Role: Azure architecture, MCP server (confirmed)
  - Azure Solutions Architect Expert
  - Agentic AI Business Solutions Architect
  - Elevate AUBG Accelerator winner · DigiEduHack 2025 podium
  - Tag: Current state: deeply focused
- **Peter Belousov**, Partner, Business Development & Sales, AICA
  - Role: Go-to-market and product discovery (confirmed)
  - Senior PM · WebPros (cPanel, Plesk), Smartcat, SberTech
  - Launched an in-product AI agent for a global payroll platform
  - 4× purchase conversion growth at WebPros
  - Tag: Current state: ready to pitch

Animation: title fades in (0–0.6 s), subtitle types in (0.6–1.8 s), cards rise with a soft spring at 1.2 / 1.5 / 1.8 s, status pills pulse like a live reading, subtle EEG line along the bottom. All deterministic.
Sound: soft "ding" as each card lands (low volume).
Voiceover: "We're a small team that combines Azure engineering, product thinking and real understanding of how people feel."
Photos: `public/artem.jpg`, `nikita.jpg`, `peter.jpg` (cropped from originals in `assets-src/photos/`; the badge graphic in Nikita's original is cropped out). A missing photo falls back to initials. No badges or logos are used because `public/badges/` is empty.

Narration: `scripts/script.json` (231 words). Visible text and labels: `src/data/config.json`.

## To finish (in order)

1. **Record the demo**: two clips with the same question, same agent and same settings, only the simulated state changes.
   - `public/demo-focused.mp4`: simulator set to focused, ask "Help me plan my evening.", wait for the full reply (≈11 s used)
   - `public/demo-tense.mp4`: simulator set to tense, same question (≈9 s used)
   - Zoom the browser so the reply is readable at 1080p. If a clip has dead time at the start, set `demoFocusedTrimStart` / `demoTenseTrimStart` (seconds) in `config.json`.
   - If you use a recorded sensor session instead of the simulator, set `demoInputLabel` to `"Recorded session"`.
2. **Fill in `src/data/config.json`**: `lovableContribution`. If Lovable isn't actually used yet, build the landing page first. The submission requires it.
3. **Narration**: `$env:ELEVENLABS_API_KEY="sk_..."; npm run voiceover`. This also rebuilds captions from the real word timings. Re-run for one scene with `npm run voiceover -- team`.
4. **Check and render**: `npm run render` refuses to export while anything above is missing. `npm run render:draft` renders regardless.
5. Before submitting: check that the file is under 200 MB, play it start to finish with sound, and confirm the captions are readable.

## Sources and material limitations

- **Market statistic**: Sensor Tower, "Health & Fitness Apps See Surging Revenue Fueled by AI", Feb 2026: "In-app purchases hit a record high last year, climbing +13% to hit $4.5 billion." The article does not state geographic or store scope, so it is shown as category context only, not as our TAM.
- **Not used**: RevenueCat *State of Subscription Apps 2026* (verified: "AI-powered apps generate 41% more revenue per payer, but they churn 30% faster"). Left out to keep one statistic. Hume (competitor context). Revenue illustration ($1.2M ARR), left out to avoid overloading.
- **Demo guidance text** is real output of `BehaviorRulesEngine.evaluate()` with `behavior_rules.json` v1.0.0 (`src/data/guidance.json`). The tense state returns 8 instructions; 4 are shown and marked *Excerpt*. The state values are simulated inputs.
- **Opening and closing chat replies are illustrative**, written for the video and labeled *Illustration*. They are not model output.
- **Claude Code**: verified. It built this video in this session. The repo commits are co-authored by Azure SRE Agent, not Claude, so the video does not claim Claude wrote the backend.
- **Lovable**: no evidence yet in the repo. The architecture doc lists the Lovable landing page as a Sunday task.
- **Business model, pilots, segment** are hypotheses to validate. Labeled on screen as proposed; no customers, traction or pricing claimed.
- **Music** is synthesized by `scripts/music.mjs` (no third-party licensing). Pad + soft plucked arpeggio, normalized to -1 dBFS peak. Volume: 50% under the silent title, 14% under narration (about 9 dB below the voice), fading out over the last 3 s.
- **Product photos** (`public/muse-s-athena.jpg`, `public/neurable-one.jpg`) are official manufacturer images from choosemuse.com and neurable.com, shown to identify the compatible devices. They are not ours; no endorsement is implied.
- **Emoji** use Noto Color Emoji (SIL Open Font License) so they look the same on every machine.

## Windows ARM64 note

Rendering uses the portable x64 Node in `C:\dev\tools\node-v24.15.0-win-x64` (Windows emulation). If `npm i` removes the x64 compositor:
`C:\dev\tools\node-v24.15.0-win-x64\npm.cmd i --no-save --force @remotion/compositor-win32-x64-msvc@4.0.534`
