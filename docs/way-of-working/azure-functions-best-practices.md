# Azure Functions Best Practices

- Each function should be single-responsibility and stateless.
- Use environment variables for configuration, never hard-code secrets.
- Structure function code for testability (e.g., separate logic from triggers).
- Prefer async/await for all I/O operations.

