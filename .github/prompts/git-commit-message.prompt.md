---
name: git-commit-message
---
Analyze the staged files and currently selected branch and generate a commit message according to the instructions, listed in the file #git-naming-conventions.instructions.md.
The commit message should follow the Conventional Commits format, including the appropriate type, scope, and description. If applicable, include a footer for breaking changes or references to issues.
Ensure the message is concise, clear, and accurately reflects the changes made in the commit.
DON'T commit changes, only propose the commit message.

If there should be multiple commits, ask user to choose which one to select or provide messages for all of them, including the list of staged files for each commit. 
Each commit message should be separated by a line containing only `---`.

Try to hold the body of commit message as precise and small as possible. It should contain not more than 100 characters, preferable less than 50.
If the branch name doesn't suit the changes show a warning and suggest a better branch name.


