# Introduction

This is a fork of the `source-map-support` package, which provides source map support for stack traces in Node.js. 
It enhances the debugging experience by mapping stack traces back to the original source code, even when using transpiled languages like TypeScript or Babel.
The forked version fixes the output of file names in stack traces to be relative to the current working directory, rather than absolute paths. 
This makes stack traces more readable and easier to work with in different environments.