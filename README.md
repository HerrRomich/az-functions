# az-functions
**az-functions**  extends the Azure Functions programming model for Node.js (v4) by introducing a powerful structure for building scalable and maintainable serverless applications. It integrates several key concepts:

 * **Inversion of Control (IoC) Container:** Using InversifyJS, a lightweight and flexible IoC container, to manage dependencies and ensure proper decoupling of components.
 * **TypeScript Decorators:** Making use of TypeScript decorators to declaratively define Azure Function components and services.
 * **Input Validation:** Integrating the Zod validation library to ensure that all inputs (e.g., HTTP request bodies, Message Broker messages) are properly validated before processing.
 * **OpenAPI Code-First Definition Generation:** Automatically generating OpenAPI (Swagger) definitions based on the Azure Function code, following the code-first approach.

This package aims to provide a more structured approach to Azure Functions development, focusing on best practices such as dependency injection, separation of concerns, and input validation.

# Installation
```bash
npm install @@herrromich/az-functions inversify reflect-metadata zod --save
yarn add @@herrromich/az-functions inversify reflect-metadata zod
pnpm add @@herrromich/az-functions inversify reflect-metadata zod
```
