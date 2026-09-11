---
name: git-commit-message
---
Analyze the staged files and currently selected branch and generate a commit message according to the instructions, listed in the file #git-naming-conventions.instructions.md.
The commit message should follow the Conventional Commits format, including the appropriate type, scope, and description. If applicable, include a footer for breaking changes or references to issues.
Ensure the message is concise, clear, and accurately reflects the changes made in the commit.
DON'T commit changes, only propose the commit message.

Keep the commit header itself compact: no more than 100 characters, ideally under 50, imperative mood,
no trailing period. A short body (1-3 lines explaining *why*, not *what*) is welcome when it adds real
context beyond the header — don't omit it just to save space, only omit it when the header alone is
already self-explanatory. Add a footer only when actually needed (breaking change, issue reference).

If there should be multiple commits, ask user to choose which one to select or provide messages for all of them,
including the list of staged files for each commit, AND a proposed branch name for each commit (per
`git-naming-conventions.instructions.md` §2 branch naming rules — one branch per commit/scope).
Each commit proposal should be separated by a line containing only `---`.

If the current branch name doesn't suit the changes (single-commit case), show a warning and suggest a
better branch name using the same §2 rules.


