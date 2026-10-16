---
name: skill-finder
description: Discover and vet new Claude Code / Claude skills and plugins from online sources (GitHub, plugin marketplaces, curated "awesome" lists) that match a need. Use whenever the user asks "is there a skill for X", "find me a skill/plugin that does Y", "what skills exist for Z", "search for a skill", or describes a recurring task that a community skill might already solve, even if they never say "skill finder". Also use when they ask where to download or how to install a skill.
---

# Skill Finder

Find skills published online that fit the user's need, check they are safe and real, and hand back a short ranked list with install steps. Do not install anything until the user picks one.

## Why this skill is careful
A skill is instructions plus possibly scripts that run on the user's machine with their permissions. A popular-looking skill can still contain something harmful or just be low quality. So the value here is not only finding candidates but vetting them before recommending.

## Workflow

1. **Pin down the need.** Restate it in one line: the task, the tools or file types involved, and where the skill will run (Claude Code, claude.ai, Cowork). If it is too vague to search, ask one question, no more.

2. **Check what is already installed first.** Look in `~/.claude/skills/`, the project's `.claude/skills/`, and the skills list in the session. If an installed skill already covers the need, say so and stop. This avoids duplicates.

3. **Search online.** Run several searches in parallel (WebSearch, standard mode first; use extended only if results are thin):
   - GitHub: `"SKILL.md" <topic>`, `claude code skill <topic>`, topic tags like `claude-skills`, `claude-code-plugin`
   - Official and well-known sources: the `anthropics/skills` repo, Claude Code plugin marketplaces, and curated "awesome claude skills" lists
   - Use WebFetch on candidate repos to read the actual `SKILL.md` and file tree, not just the search snippet.

4. **Vet each candidate** (keep 3 to 5). Check:
   - Does the `SKILL.md` description really match the need?
   - Source and maintenance: author, last commit, stars or usage, open issues
   - Contents: any `scripts/`? Read them for network calls, credential access, `curl | sh`, obfuscated code, or writes outside the working folder
   - License allows the user's use
   Mark anything you could not verify as unverified. Never claim a skill is safe, only what you inspected.

5. **Report.** Give a ranked shortlist, best fit first. For each: name, link, one-line what it does, why it fits, maintenance signal, and any flags (runs scripts, needs API keys, unverified). Finish with a recommendation and an offer to install.

6. **Install only on request.** Typical routes:
   - Plugin in a marketplace: `/plugin marketplace add <owner/repo>` then `/plugin install <name>@<marketplace>`
   - Standalone skill folder: copy it to `~/.claude/skills/<name>/` (personal) or `.claude/skills/<name>/` (project)
   Confirm the destination with the user, then verify the folder contains a `SKILL.md`. Confirm the exact commands against the repo's README, since marketplaces vary.

## If nothing fits
Say so plainly. Offer to build one with the skill-creator skill, using the closest candidate as a starting point if its license permits.

## Output format

**Need:** <one line>
**Already installed:** <none / name>

| # | Skill | Fit | Maintenance | Flags |
|---|-------|-----|-------------|-------|

**Recommendation:** <pick and why>
**Install:** <exact steps, on request>
