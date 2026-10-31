---
status: accepted
---

# One Shehnat brand theme replaces the three looks

The web app let each user pick one of three looks: Container, Majlis (navy and gold) and Oasis (light green). None of them used the logo's green and gold. We replace all three with a single Shehnat theme built from the logo (green `#06503A` for actions, gold `#B39144` for decoration, warm sand surfaces). It ships light only, and the look picker goes. A financial product has to look the same to everyone who uses it, including staff, support and screenshots shared between investors. One theme is also one set of contrast checks, one set of motion specs and one set of screens to test, at a time when the effort is better spent on mobile, right-to-left layouts and the elaborate motion system. The spec is [`docs/design-system.md`](../design-system.md).

## Considered options

- **A brand default with the three looks recoloured.** Rejected: four themes to maintain and test, for a choice users didn't ask for.
- **Light and dark from launch.** Rejected for now. The tokens are semantic (`--surface-card`, `--text`, `--action`), so a dark theme can be added later by redefining that one block.

## Consequences

- Users who picked Majlis or Oasis lose their choice. The `shehnat-look` key in browser storage becomes unused and can be removed with the picker.
- Every component must use the semantic tokens, never raw colours or the primitives, or a later dark theme becomes a rewrite.
