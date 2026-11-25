# TodoMVC+ (Showcased by ProductionLine / `mogra`)

This repository is the live showcase for **ProductionLine (`mogra`)**.
By convention over configuration, it contains minimal onboarding config: opening a GitHub Issue triggers `ProductionLine` to tag the issue with the chosen stack name and autonomously run **Discovery → Spec → Build → Accessibility/Reflow Verification → Security/SBOM → Auto-Merge → GitHub Pages Deployment** (`human_in_the_loop` is disabled by default).

## Showcase Stacks (Initial 5)

| Stack ID | Framework & Toolchain |
| :--- | :--- |
| `react19-ts-vite` | React 19 + TypeScript + Vite + Tailwind CSS v4 + ARIA/Radix |
| `vue3-ts-vite` | Vue 3.5 + TypeScript + Vite + Reka UI + Modern CSS |
| `svelte5-ts-vite` | Svelte 5 (Runes) + TypeScript + Vite + Melt UI |
| `angular-ts` | Angular 19+ Standalone Signals + TypeScript + Angular CDK/ARIA |
| `solid-ts-vite` | SolidJS + TypeScript + Vite + Kobalte ARIA |

Every implementation enforces [`wcag-reflow-a11y`](https://github.com/rajeevkannav/ProductionLine/blob/main/skills/wcag-reflow-a11y/SKILL.md), [`ultra-modern-web-css`](https://github.com/rajeevkannav/ProductionLine/blob/main/skills/ultra-modern-web-css/SKILL.md), [`local-first-resilience`](https://github.com/rajeevkannav/ProductionLine/blob/main/skills/local-first-resilience/SKILL.md), and [`security-hardening`](https://github.com/rajeevkannav/ProductionLine/blob/main/skills/security-hardening/SKILL.md).

---

## Required Setup on `TodoMVC-Plus`

### 1. Repository Settings
- **Settings → Actions → General:** Set Workflow permissions to **Read and write permissions** and enable **Allow GitHub Actions to create and approve pull requests**.
- **Settings → General → Pull Requests:** Enable **Allow auto-merge**.
- **Settings → Pages:** Set Source to **GitHub Actions**.

### 2. Repository Secrets (Keep out of Git)
Set via **Settings → Secrets and variables → Actions** or `gh secret set`:

```sh
gh secret set MOGRA_BOT_TOKEN -R rajeevkannav/TodoMVC-Plus
gh secret set GEMINI_API_KEY -R rajeevkannav/TodoMVC-Plus
```

- `MOGRA_BOT_TOKEN`: Fine-grained PAT (`Contents R/W`, `Issues R/W`, `Pull requests R/W`, `Metadata R`) so auto-merged PRs trigger GitHub Pages cleanly.
- `GEMINI_API_KEY`: Required for the default `antigravity` / `gemini-2.5-pro` runtime.
- *(Optional)* `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` only if overriding agents in `.mogra.yaml` to `claude-code` or `codex`.

### 3. Optional `.mogra.yaml` Override
Omit `.mogra.yaml` to inherit all `ProductionLine` conventions (`antigravity`, `gemini-2.5-pro`, HITL off), or add `.mogra.yaml` to customize models per agent.
