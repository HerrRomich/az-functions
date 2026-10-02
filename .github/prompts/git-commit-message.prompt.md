---
name: git-commit-message
---
Delegate git inspection (staged files, diffs, current branch, history) to the `git-inspector` agent
(`.github/agents/git-inspector.agent.md`), which prefers the IntelliJ MCP server over shell git commands.

Analyze the staged files and current branch, then propose a commit message following
#git-naming-conventions.instructions.md (Conventional Commits: type, scope, description).

Format rules:
- Header: imperative, no trailing period, max 100 characters (ideally under 50).
- Body: optional, **max 500 characters**, 1-3 lines explaining *why*, not *what*. Include it when it adds
  context beyond the header; omit it when the header is self-explanatory.
- Footer: only when needed (breaking change, issue reference).

Multiple commits: if the changes should be split, propose a message for each, with its staged file list and a
proposed branch name (per §2 of the naming conventions, one branch per commit/scope). Separate proposals with
a line containing only `---`.

Branch check (single-commit case): if the current branch name doesn't suit the changes, show a warning and
suggest a better name per §2.

DON'T commit changes, only propose the commit message.

