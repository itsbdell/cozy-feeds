# Cozy Feeds → Fable Handoff Brief

*Two parts: **Context** (what you're inheriting and where it should go) and a **Discovery Prompt** (paste this to Fable to start). The prompt is deliberately written to hand you judgment rather than a spec — see the note at the end on why.*

---

## PART 1 — CONTEXT

### The soul of the thing

Cozy Feeds is the **anti-algorithm**. Where every modern feed dumps an infinite, machine-ranked stream at you, Cozy Feeds lets a person hand-curate a small collection of things they care about and choose *what resurfaces, and when*. It's calm, intentional, owned, warm. "Cozy" is the whole point: a personal corner of the internet, not a firehose.

The original mechanic was a **drip-release reading queue**: name a feed, add a list of URLs, set an interval ("every N days at HH:MM in timezone X"), and it exposes an RSS URL that releases one item at a time on that schedule — optionally looping forever. Two real examples from the prototype say more than any spec:

- **"Baby Poetry"** — one poem, queued and re-served daily at 2am, repeating forever. A ritual, not a feed.
- **"bd"** — two saved essays, one delivered per day, then it stops. A slow-reading queue that respects your attention.

### The unlock (why we're rebuilding, not patching)

The prototype under-sold itself. The real primitive isn't "an RSS trick" — it's a **beautiful, curated, shareable, embeddable playlist of things**, where the items today are links but could be anything. Think **Spotify playlists, but for reading and content**: ordered, titled, cover-art'd, browsable, and embeddable on any site as a polished widget. The drip-schedule ("play these out over time") becomes *one mode* of a playlist, alongside "just a gorgeous browsable collection you can share."

That reframing is the north star. Hold the Spotify-playlist quality bar for the embedded experience specifically — that's the surface people will see and share.

### The related second product (same primitive, different items)

Because the core is really "a curated, embeddable playlist of things," the same engine should power a **second content type: playlists of AI skills and prompts** — a "prompt playlist" / "skill pack" that a person curates and embeds on their site or shares. Same collection primitive, same beautiful card/embed treatment, different item schema (a prompt or Claude Code skill instead of a URL). We want the architecture to make this a natural extension, not a rewrite — ideally the item type is pluggable.

### What exists today (the prototype you're replacing)

- **Stack:** Node/Express, vanilla HTML/CSS/JS, one EJS view. A `feeds.json` flat file is the entire database.
- **No auth, single-user:** anyone with a URL can edit or delete any feed (documented as a known limitation).
- **RSS semantics are broken by design:** `/feed/:id` emits an RSS document with *exactly one item* that gets silently swapped on a cron tick. Most readers dedupe by guid/link and expect an accumulating list, so "new" items often never register as new. **This is the #1 architectural decision to revisit.**
- **Metadata:** scrapes title/author/site-name/favicon per URL via axios + cheerio, cached 1hr.
- **Abandoned scaffolding:** a bookmarklet + embed-widget system was built then deleted (leaving a broken `/embed/:id` route); a `.do/deploy.template.yaml` wrongly declares it a *static* site though it's a stateful server; the portfolio blurb calls it "a static feed generator, no databases, no accounts" which was never true. Treat all of this as noise — we're starting fresh. The `package.json` still says `"name": "farss"` (an old working title).

### Ambition & constraints for the rebuild

- **Many users, publicly usable.** Multi-tenant, accounts, the ability to make and share playlists. Local-first is explicitly *not* a goal — usable and interesting beats purist.
- **The embed is the hero.** A Spotify-playlist-caliber embeddable widget is a first-class deliverable, not an afterthought.
- **Two item types from the start (or a clean path to the second):** content/links (Cozy Feeds proper) and prompts/skills (the playlist-of-skills idea).
- **Keep what made it cozy:** curation, calm, ownership, scheduled resurfacing as an option. Don't turn it into another aggregator.
- **Honest RSS or a better resurfacing mechanic** — your call, but decide it deliberately.

### Taste references

- **Spotify** — playlist page + the embeddable player. Cover art, ordered rows, clean typography, the "follow"/share affordance, the embed that looks great on someone else's site.
- The prototype's dark embed card (favicon + title + author + site, rounded, hover states) was the right *instinct* — just under-designed. Aim far past it.

---

## PART 2 — DISCOVERY PROMPT (paste this to Fable)

> I'm handing you a project to rethink and rebuild from scratch. Read the Context section above first — it describes a prototype called **Cozy Feeds** and where I want it to go. Don't rebuild the prototype; rebuild the *ambition*.
>
> **The vision, in one line:** a beautifully designed, embeddable, shareable "playlist" primitive for curated content — Spotify playlists, but for the things a person reads and cares about — with an optional slow-drip resurfacing schedule, multi-user, and a clean path to a second item type (playlists of AI prompts/skills).
>
> **I'm trusting your judgment on the hard decisions.** I don't want a rigid spec executed literally — I want you to make good calls and tell me why. In particular, use your judgment on:
> - **The resurfacing model.** The prototype's single-swapping-RSS-item approach is semantically broken. Decide what replaces it: honest accumulating RSS, a native web reader, email drip, a "player" UI, or some combination. Explain the tradeoff you're making.
> - **Stack, storage, and auth.** Pick what makes this genuinely multi-user and shippable to many people, and what *you'd* want to maintain. Local-first is not a constraint.
> - **The item-type abstraction.** Design so that "a link" and "a prompt/skill" are both first-class playlist items without a rewrite. Show me the seam.
> - **How far to take the embed.** Treat the embeddable playlist widget as a hero surface and hold a Spotify-level quality bar for it.
> - **Scope and sequencing.** Decide what's v1 vs. later, and what deserves your full effort vs. routine work you'd delegate to lighter subagents/models.
>
> **Before you build, do discovery.** Come back to me with:
> 1. A short read on what you think the *soul* of this product is and where the prototype sold it short (confirm we're aligned before you commit).
> 2. 2–3 distinct architectural directions with the real tradeoffs — especially for the resurfacing/RSS decision and the multi-user data model — and your recommendation.
> 3. A proposed v1 scope: the smallest thing that is genuinely usable, interesting, and shareable, plus what it sets up for the prompts/skills playlist later.
> 4. Any questions where my answer would actually change your design (ask those; don't guess on genuine forks). Where a reasonable default exists, take it and note it.
>
> Then, once we're aligned on direction, build it — exercising judgment about when to test, when to delegate to cheaper models, and when to bring a decision back to me.

---

## Why the prompt is written this way

Per Simon Willison's *"Trusting the model's judgment"* (simonwillison.net, 2026-07-03): capable models produce better results when you hand them **intent + constraints + taste**, and let them decide *how* — rather than prescribing every step. The brief deliberately transfers the consequential decisions (resurfacing model, stack, auth, item abstraction, scope) to Fable and asks it to justify them, and it explicitly invites Fable to allocate its own effort (full power vs. lighter subagents) the way Willison describes. The one thing we *don't* delegate is the product's soul — that's pinned in Context so Fable optimizes toward the right thing.
