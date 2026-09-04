---
applyTo: "packages/examples/backend/src/interfaces/rest/**"
---

# Designing REST Applications & HTTP Controllers

This file governs everything under `src/interfaces/rest/`. It is the architectural contract for how
`RestApplication`s and `@HttpController`s are structured, named, and versioned in `example-backend`. Read
`az-functions-app-structure.instructions.md` first for the surrounding layout.

Sections build on each other: 1–3 define the building blocks (grouping, layout, naming); 4–5 define the
data shapes (DTOs, mappers); 6 shows how an operation method wires those together (parameters, responses,
errors); 7–8 cover the folder as a published contract and its versioning lifecycle.

## 1. The `RestApplication` is the unit of grouping

A `RestApplication` (`@herrromich/az-functions`) is **one OpenAPI document**: one `name`, one `context`
(URL prefix — the platform builds each route as `context + '/' + controllerPath + operationPath`), one
`openApiConfig` (title, version, tags, security schemes). Everything registered under it shares that
context, that security scheme set, and that published spec.

- One folder per `RestApplication`: `rest/<application>/`, e.g. `rest/orders/`, `rest/console/`,
  `rest/logging/`.
- The application definition lives in its own file: `rest/<application>/<application>-api.application.ts`,
  exporting:
  - a `SCREAMING_SNAKE_CASE` name constant, e.g. `export const ORDERS_API = 'orders-api';` — this is the
    value passed as `application:` to every `@HttpController` in the folder;
  - the `RestApplication` object itself as `<APPLICATION>_REST_APPLICATION`, e.g.
    `ORDERS_REST_APPLICATION`.
- Split into **separate** `RestApplication`s (separate folders) whenever any of these differ, even if the
  domain feels related:
  - target audience / consumer (e.g. internal console vs. customer-facing orders API);
  - security scheme(s) in `openApiConfig.security`/`components.securitySchemes`;
  - release/versioning lifecycle (see §8) — apps that must version independently cannot share one context;
  - the OpenAPI document you want to hand out/generate a client from (each generated Angular/OpenAPI client
    in `example-frontend` targets exactly one `RestApplication`'s spec).
- Keep **related resources of the same audience/lifecycle** in one `RestApplication`, differentiated by
  OpenAPI `tags` (e.g. `Orders` and `Customers` tags both inside `ORDERS_API`), not by splitting the app.

## 2. Folder layout inside a `RestApplication`

Not always flat — pick the shape based on size **and** on whether a resource is nested under another one
in the URL, stay consistent within a folder:

- **Flat** (small app, few resources): files directly under `rest/<application>/`, one
  controller+dto+mapper trio per resource, e.g. `rest/orders/orders.controller.ts`,
  `orders.dto.ts`, `orders.mapper.ts`, plus the sibling `customers.*` trio in the same folder.
- **Resource-scoped subfolders** (larger app): `rest/<application>/<resource>/` holding that resource's
  own `<resource>.controller.ts` / `.dto.ts` / `.mapper.ts`, e.g. `rest/console/trucks/`,
  `rest/logging/log-levels/`.
- **Hierarchical subfolders** (a resource is nested under its parent in the URL path): mirror that URL
  nesting as folder nesting, one level per path segment owning an id, each level keeping its own
  `<resource>.controller.ts`/`.dto.ts`/`.mapper.ts`. A controller at a given level declares only its own
  path segment (`path: '/{customerId}/orders'`, `path: '/{orderId}/items'`, ...) — the platform
  concatenates the ancestors' `path`s, it does not come from the folder nesting itself. For
  `/customers/{customerId}/orders/{orderId}/items/{itemId}`:

  ```
  rest/orders/
  ├── customers.controller.ts        # path: '/customers'
  └── customers/
      ├── orders.controller.ts       # path: '/{customerId}/orders'
      └── orders/
          └── items.controller.ts    # path: '/{orderId}/items'
  ```

Every application folder ends with an `index.ts` barrel that:
- re-exports the `RestApplication` constant from the folder;
- declares and exports an aggregated `<App>Controllers` constant — an array listing every
  `@HttpController` class of the application, e.g.
  `export const OrdersControllers = [OrdersController, CustomersController];` — used to register the
  application's controllers as a single unit;
- declares and exports the feature's `ContainerModule` (`<Application>RestModule`, e.g.
  `OrdersRestModule`, `ConsoleRestModule`) binding its mappers (`bind(<Resource>Mapper).toSelf()`).

> **Note:** Only declare/export a `ContainerModule` when the folder has something to bind besides the
> `@HttpController`s themselves (mappers, or any other injectable) — controllers are registered via
> `<App>Controllers`/`HttpControllers`, not via the container module. If the application has no such
> extra bindings, omit `<Application>RestModule` entirely rather than exporting an empty one.

Individual `@HttpController` classes are **not** re-exported from the barrel — they are only ever consumed
in aggregate via `<App>Controllers`/`HttpControllers`, imported directly by the barrel from their own
`<resource>.controller.ts` file and never referenced from outside the folder.

`rest/index.ts` (top-level barrel) aggregates every application: `HttpControllers` (the concatenation of
every application's `<App>Controllers` array), `RestApplications` (all `RestApplication` consts), and
re-exports every `<Application>RestModule`. **Never** register a controller or `RestApplication` directly
in `src/index.ts` — always through this barrel (see
`az-functions-app-init.instructions.md`).

## 3. Naming conventions

| Artifact                     | File                              | Export name                                  |
|-------------------------------|------------------------------------|-----------------------------------------------|
| Application name constant     | `<app>-api.application.ts`         | `<APP>_API` (kebab-case string value)          |
| `RestApplication` object      | `<app>-api.application.ts`         | `<APP>_REST_APPLICATION`                       |
| HTTP controller               | `<resource>.controller.ts`         | `<Resource>Controller`                         |
| Request/response schemas      | `<resource>.dto.ts`                | `<Name>DtoSchema` (Zod schema) + `<Name>Dto` (inferred type via `z.infer`) |
| Enum/value schemas            | `<resource>.dto.ts`                | `<Name>Schema`/`<Name>Scheme` + `<Name>` (inferred type) |
| Domain ⇄ DTO mapper           | `<resource>.mapper.ts`             | `<Resource>Mapper` (`@injectable()`)           |
| Aggregated controllers list   | `index.ts`                         | `<App>Controllers` (array of the app's controller classes) |
| Feature container module      | `index.ts`                         | `<Application>RestModule`                      |

Controller classes are annotated `@HttpController({ application: <APP>_API, path: '/<resource>', tags: [...] })`.
Operation methods use `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/`@Head` with a `directResponse` (success
shape) and, where relevant, `responses` (documented error statuses).

## 4. DTOs: Zod-first, documented, and **never shared**

- Every request/response shape is a Zod schema annotated with `.openapi(...)`
  (`@asteasolutions/zod-to-openapi`, enabled once via `extendZodWithOpenApi(z)` — see
  `az-functions-app-init.instructions.md`). Give every field at least a `description` (add
  `example` where it clarifies the contract), infer the TS type with `z.infer<typeof XxxSchema>` — never
  hand-write a parallel `interface`/`type` — and tag the schema itself with `.openapi('Name')` so it gets a
  named component (not an inline anonymous schema) in the generated document:

  ```ts
  // interfaces/rest/orders/customers.dto.ts
  export const CustomerDtoSchema = z
    .object({
      id: IdDtoSchema.openapi({ description: 'The unique identifier of the customer' }),
      name: z.string().openapi({ description: 'The name of the customer', example: 'Acme Corporation' }),
      email: z.email().openapi({ description: 'The email address of the customer' }),
    })
    .openapi('Customer');
  export type CustomerDto = z.infer<typeof CustomerDtoSchema>;
  ```

  An enum/value schema follows the same pattern — `.openapi('name', { description })` on the schema itself,
  plus the inferred type, e.g. `OrderStatusScheme` / `OrderStatus`.

- **DTOs are local to the controller/resource that defines them.** Never import a DTO from one
  resource/feature into another's DTO or controller, even inside the same `RestApplication`, and even if
  the shape looks identical — duplication is the default, not a smell. Each controller's contract must be
  able to evolve (rename a field, tighten a constraint, add a property) without touching any other
  controller's schema or breaking its consumers:

  ```ts
  // interfaces/rest/orders/orders.dto.ts — CustomerDtoSchema is NEVER imported here
  export const OrderDtoSchema = z
    .object({
      id: IdDtoSchema.openapi({ description: 'Unique identifier of the order' }),
      customer: z // duplicated, inline — not a reference to customers.dto.ts's CustomerDtoSchema
        .object({ id: IdDtoSchema, name: z.string().openapi({ description: 'Name of the customer' }) })
        .openapi({ description: 'Customer information' }),
      status: OrderStatusScheme.openapi({ description: 'Status of the order' }),
    })
    .openapi('Order');
  export type OrderDto = z.infer<typeof OrderDtoSchema>;
  ```

  Note that `customer` here only carries `id`/`name` — a subset of `CustomerDtoSchema`'s fields (which also
  has `email`) — and is free to diverge further without ever touching `customers.dto.ts` or breaking
  `GET /customers`.

- The only place a schema may be genuinely shared is `src/shared/rest/` (`IdDtoSchema`, `GeoJSONPointSchema`,
  `provideListResponseDtoSchema`, …). Reach for this **only** when the shape is a structural/technical
  primitive — an ID format, a generic paging envelope, a well-known geo/format type — that won't
  independently evolve per feature over the application's lifetime. If there's any realistic chance one
  controller's use of the shape diverges from another's later, define it locally instead and accept the
  duplication. When in doubt, duplicate.
- Corollary: input DTOs (request bodies/query/path schemas) and output DTOs (response schemas) are defined
  **per controller** (or, for trivial cross-cutting envelopes only, via `shared/rest` helpers) — never as a
  single "big" DTO module reused across multiple `RestApplication`s.

## 5. Mappers

- One `<Resource>Mapper` per resource, `@injectable()`, bound in the feature's `<Application>RestModule`.
- A mapper exists **exceptionally** — reach for it, don't default to it. Its sole purpose is converting an
  incoming request DTO into the business-logic input structure the application/domain layer expects, and
  converting a business-logic output structure into the outgoing response DTO — only when that conversion
  is too complex to inline directly in the trigger method (§6.5). A trivial 1:1 field mapping can stay
  inline in the controller. Controllers must never construct or return domain entities directly, and must
  never hand-map a non-trivial conversion inline once it belongs in the mapper.
- A mapper is a full service, not a pure-function holder: it may have `shared/**` domain
  services/repositories injected (the same way a controller does), whenever translating a DTO genuinely
  needs to **enrich** the request or response with additional domain data — e.g. resolving a referenced
  entity by id, looking up a denormalized display value the DTO exposes but the domain object doesn't carry
  directly. Don't inject a dependency the mapper doesn't use for this purpose.
- A mapper method may be `async` when it needs to call an injected service/repository — callers
  (`interfaces/rest/**`) must `await` it like any other async mapping call.
- A mapper may throw a `BaseHttpTriggerError` descendant under the same rules as §6.3: when an injected
  domain service/repository call the mapper makes throws (or returns an empty/`undefined` result for) a
  lookup that fails, the mapper may translate that outcome into the appropriate `BadRequestError`/
  `NotFoundError` (or another `BaseHttpTriggerError` descendant) instead of letting a domain error propagate
  or returning an invalid/partial DTO. Use a **specific** `instanceof` check when translating a thrown
  domain error, and always pass it as `cause`; when the failure is an empty lookup result instead (no error
  thrown), throw the `BaseHttpTriggerError` directly for that condition.

  ```ts
  // interfaces/rest/orders/orders.mapper.ts
  @injectable()
  export class OrdersMapper {
    constructor(@inject(CustomersRepository) private readonly customersRepository: CustomersRepository) {}

    async toDto(order: Order): Promise<OrderDto> {
      const customer = await this.customersRepository.getCustomerById(order.customerId);
      if (!customer) {
        throw new NotFoundError(`Customer with id=${order.customerId} not found`);
      }
      return { /* ...order fields..., */ customer: { id: customer.id, name: customer.name } };
    }
  }
  ```

## 6. Operation methods: parameters, responses & errors

Governs how an individual `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/`@Head`-decorated method (the actual HTTP
trigger) is shaped: its parameters, its success response, and its error responses.

### 6.1 Declare the request shape with parameter decorators, not decorator-level OpenAPI

The verb decorator's config object (`ControllerOperationConfig`/`ControllerRequestBodyOperationConfig`,
from `@herrromich/az-functions`) can also carry a raw OpenAPI `parameters` array and, for
`@Post`/`@Put`/`@Patch`, a raw `requestBody`. **Prefer declaring every path parameter, query parameter,
header, and request body with a parameter decorator on the method signature** — `@PathParam`,
`@QueryParam`, `@HeaderParam`, `@Body` — over hand-writing the equivalent entry under
`parameters`/`requestBody` in the operation decorator. A parameter decorator does two things at once: it
binds/validates the runtime value against its Zod `schema` **and** documents that same parameter in the
generated OpenAPI operation, so the contract and the implementation can't drift apart. The raw
`parameters`/`requestBody` config only documents — it does nothing at runtime — so a hand-written entry
there is an accepted equivalent (e.g. for the rare part of an operation that genuinely has no
parameter-decorator equivalent), it's just **not preferable**: reach for it only when a parameter decorator
doesn't cover what you need, not as a shortcut for something it already covers.

Everything else about the operation — `description`, `summary`, `tags`, `security`, `operationId` — stays
in the verb decorator's config object; only the request-shape parts move onto the method signature.

> **Note:** `path` on both `@HttpController` and the verb decorators must start with a leading slash, as
> required by the [OpenAPI Specification's Paths Object](https://spec.openapis.org/oas/v3.1.0#paths-object)
> ("The field name MUST begin with a forward slash"), and must never have a trailing slash. Prefer
> `path: '/<resource>'`, `path: '/{customerId}/orders'` rather than omitting the leading slash or adding a
> trailing one (e.g. never `'<resource>'` or `'/<resource>/'`).

```ts
// interfaces/rest/orders/orders.controller.ts
@Get({
  path: '/{orderId}',
  description: 'Get order by ID',
  directResponse: {
    status: 200,
    description: 'Get order by ID response',
    jsonContent: { schema: OrderDtoSchema },
  },
  responses: {
    '404': { description: 'Order not found error' },
  },
})
async getOrderById(
  @AuthCtx() authContext: AuthContext,
  @PathParam({ name: 'orderId', schema: IdDtoSchema.openapi({ description: 'Unique identifier of the order' }) })
  orderId: string,
): Promise<OrderDto> {
  const order = await this.ordersRepository.getOrderById(orderId);
  if (!order) {
    throw new NotFoundError(`Order with id=${orderId} not found`);
  }
  return this.ordersMapper.toDto(order);
}
```

### 6.2 Standard success response: `directResponse` + a plain `return`

For the common case — a single documented success shape with a fixed or near-fixed status code — declare
it once via `directResponse` (`status`, `description`, `jsonContent: { schema }`, and `headers` when the
response has statically-known header names) on the operation decorator, type the method's return type as
the DTO (or `void`/nothing for a bodyless `204`), and simply `return` the mapped DTO. Do not construct a
response object by hand for this case — the platform serializes the returned value as the operation's
JSON body using the declared shape.

```ts
// interfaces/rest/console/trucks/trucks.controller.ts
@Delete({
  path: '/{truckId}',
  description: 'Delete a truck by ID',
  directResponse: { description: 'Truck deleted successfully', status: 204 },
  responses: { 404: { description: 'Truck not found' } },
})
async deleteTruck(@PathParam({ name: 'truckId', schema: IdDtoSchema }) truckId: string): Promise<void> {
  const truck = await this.trucksRepository.getTruckById(truckId);
  if (truck === undefined) {
    throw new NotFoundError('Truck not found.', { details: { id: truckId } });
  }
  await this.trucksRepository.deleteTruckById(truckId);
}
```

### 6.3 Errors: throw a `BaseHttpTriggerError`, don't hand-build an error response

`interfaces/rest/**` — a controller method or a mapper the application folder owns — is the **only** place
in the whole app allowed to throw a `BaseHttpTriggerError` descendant (`BadRequestError`,
`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `InternalServerError`, `CommonHttpTriggerError`, all
from `@herrromich/az-functions`), rather than returning an error-shaped `HttpResponseInit`/DTO or
constructing a response object by hand — the platform translates the thrown error into the response for you
(status + body). Full rules, including the `shared/**` domain-error hierarchy these get translated from,
live in `az-functions-app-errors.instructions.md`.

Throwing one is **optional**, not mandatory, for every failure a controller/mapper can encounter: if a
domain error (from `shared/applications/<feature>/<feature>.errors.ts`, `shared/persistence/**`, etc.)
propagates uncaught, the caller just gets a generic 500 — an accepted outcome when a more specific status
code wouldn't help the consumer. When it does help (malformed input → `BadRequestError`; a missing
referenced resource → `NotFoundError`; etc.), catch the domain error with a **specific** `instanceof` check
(never a blanket `catch (e)`), throw the matching `BaseHttpTriggerError` subclass, and pass the original
error as `cause` so it isn't lost from logs. Document the resulting status under `responses` on the
operation decorator so it shows up in the generated OpenAPI spec.

```ts
// interfaces/rest/orders/orders.mapper.ts
fromCreateDto(createOrderRequestDto: OrderCreateRequestDto): CreateOrder {
  try {
    return { /* ... */ sourcePoint: geoJsonPointToPoint(createOrderRequestDto.sourcePoint) };
  } catch (e) {
    if (e instanceof GeoJsonConversionError) {
      throw new BadRequestError(e.message, { cause: e });
    }
    throw e; // unrelated/unexpected — let it propagate to the default 500
  }
}
```

```ts
// interfaces/rest/orders/orders.controller.ts
const order = await this.ordersRepository.getOrderById(orderId);
if (!order) {
  throw new NotFoundError(`Order with id=${orderId} not found`);
}
```

Never construct a `BaseHttpTriggerError` in a `<resource>.dto.ts` schema or a mapper's pure `toDto(...)`
direction — those layers only produce/consume DTOs and domain objects, they don't know about HTTP status
codes.

### 6.4 Complex responses: return `HttpResponseInit`, prefer `HttpDirectResponseBuilder`

Only when the response genuinely needs more than `directResponse` can express statically — a header whose
*value* is only known at runtime (e.g. a `Location` URL built from the created resource's id), a cookie, or
a runtime-decided status — change the method's return type to `HttpResponseInit` (`@azure/functions`) and
build it with `HttpDirectResponseBuilder.builder<T>()` (`@herrromich/az-functions`) instead of a raw object
literal: `.status(...)`, `.header(name, value)`, `.addCookie(...)`, `.jsonBody(dto)`, then `.build()`. Keep
declaring the shape via `directResponse` (status, `jsonContent`, and the header's *name*/schema) so the
contract stays documented — the builder only supplies the runtime values for that declared shape. Reach
for a raw `HttpResponseInit` object literal only when the builder doesn't cover a specific need (e.g.
`enableContentNegotiation`).

```ts
// interfaces/rest/orders/orders.controller.ts
@Post({
  description: 'Create a new order',
  directResponse: {
    status: 201,
    description: 'Order created successfully',
    jsonContent: { schema: OrderDtoSchema },
    headers: z.object({ Location: z.url().openapi({ description: 'URL of the created order' }) }),
  },
  responses: { '400': { description: 'Bad request error' } },
})
async createOrder(
  @AuthCtx() authContext: AuthContext,
  @Body({ description: 'Order create request', schema: OrderCreateRequestDtoSchema })
  createOrderRequestDto: OrderCreateRequestDto,
): Promise<HttpResponseInit> {
  // ...validate, throw BadRequestError on failure, create the order...
  const responseDto = this.ordersMapper.toDto(createdOrder);
  return HttpDirectResponseBuilder.builder<OrderDto>()
    .header('Location', `/orders/${responseDto.id}`)
    .jsonBody(responseDto)
    .build();
}
```

### 6.5 Trigger methods, mappers, and the DTO ⇄ domain boundary

An operation (trigger) method is free to call mapper methods and/or methods on any injected domain
service/repository directly, in whatever order the operation needs — there is no fixed sequence between
"map, then call the service" vs. "call the repository, then map". When a trigger method's own logic starts
getting too complex — assembling a business-logic input structure out of several DTO fields, or shaping a
response DTO out of several domain results — relocate that part of the work into the mapper (§5): the
mapper's job is to produce the business-logic-shaped input (or the outgoing DTO), and the trigger method
calls the application-layer service with that already-translated structure.

This DTO ⇄ domain boundary is a hard rule, not a style preference:
- An application-layer/domain service or repository **must never** be called with a raw DTO (request
  body/query/path parameter DTO) as its input — always translate the DTO into the business-logic structure
  the service expects first, whether that translation happens inline in the trigger method or via a
  mapper call.
- A response DTO **must never** expose a business-logic/domain structure unconverted — always translate
  the domain result into the DTO shape (again, inline or via a mapper) before returning it or handing it to
  `HttpDirectResponseBuilder`.

Respecting this boundary is what keeps the REST contract (DTOs) independent from business-logic changes: a
domain type can be renamed or restructured without forcing every consumer of the generated OpenAPI spec to
change, as long as the controller/mapper layer keeps translating between the two instead of leaking one
into the other.

## 7. A `RestApplication` folder is a contract

Treat `rest/<application>/` as the published contract for that API: its generated OpenAPI document is
consumed by external clients and by `example-frontend`'s generated API client
(`api:generate:console`). Consequences:
- Only the folder's `index.ts` barrel is a valid integration point from outside the folder (the
  `RestApplication` const, the aggregated `<App>Controllers` array, the `ContainerModule`). Nothing outside
  the folder should import a `.controller.ts`/`.dto.ts`/`.mapper.ts` file directly.
- Changing a schema, route, status code, or security requirement inside the folder is a contract change —
  update `openApiConfig` (`info.version`, `description`) and re-check consumers (frontend generated client)
  accordingly.

## 8. Major versioning for external consumers

When a `RestApplication` is (or becomes) consumed by external/third-party clients and needs a breaking
change, introduce a **new major version as a fully parallel application**, never mutate the existing one
in place:
- **Folder**: create `rest/<application>/v<N>/` (or rename the existing folder to `v1/` when introducing
  `v2` for the first time) holding its own controllers/dto/mapper/index, independent from other versions.
- **Context**: give the versioned app its own `context`, e.g. `context: 'orders-api/v2'` (previous version
  keeps `'orders-api/v1'`, never bare `'orders-api'` once versioning starts) — this is the literal URL
  prefix, so mismatched/overlapping contexts between versions is a routing collision, not just a style
  issue.
- **Documentation**: give the versioned app its own `name` constant (e.g. `ORDERS_API_V2`) and its own
  `openApiConfig.info.version`/`title` (or a version suffix in the title) so each version publishes a
  distinct OpenAPI document.
- **No overlap, ever**: two versions of the same logical application must not share a `context`, a `name`,
  or a folder — each is registered as its own independent `RestApplication` entry in `RestApplications`
  (via the top-level `rest/index.ts` barrel) and contributes its own `<App>Controllers` constant (e.g.
  `OrdersControllersV2`) to `HttpControllers`. Retiring an old version means removing its
  folder/registration, not overwriting it in place.
- DTOs are **not** shared across versions either, for the same reasons as §4 — a v2 DTO evolving away from
  its v1 counterpart is expected, not a bug.

