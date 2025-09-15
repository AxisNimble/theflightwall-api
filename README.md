# OpenAPI Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/chanfana-openapi-template)

![OpenAPI Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/91076b39-1f5b-46f6-7f14-536a6f183000/public)

<!-- dash-content-start -->

This is a Cloudflare Worker with OpenAPI 3.1 Auto Generation and Validation using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

This is an example project made to be used as a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

This template includes various endpoints, a D1 database, and integration tests using [Vitest](https://vitest.dev/) as examples. In endpoints, you will find [chanfana D1 AutoEndpoints](https://chanfana.com/endpoints/auto/d1) and a [normal endpoint](https://chanfana.com/endpoints/defining-endpoints) to serve as examples for your projects.

Besides being able to see the OpenAPI schema (openapi.json) in the browser, you can also extract the schema locally no hassle by running this command `npm run schema`.

<!-- dash-content-end -->

> [!IMPORTANT]
> When using C3 to create this project, select "no" when it asks if you want to deploy. You need to follow this project's [setup steps](https://github.com/cloudflare/templates/tree/main/openapi-template#setup-steps) before deploying.

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openapi-template
```

A live public deployment of this template is available at [https://openapi-template.templates.workers.dev](https://openapi-template.templates.workers.dev)

## Setup Steps

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "openapi-template-db":
   ```bash
   npx wrangler d1 create openapi-template-db
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
4. Deploy the project!
   ```bash
   npx wrangler deploy
   ```
5. Monitor your worker
   ```bash
   npx wrangler tail
   ```

## Testing

This template includes integration tests using [Vitest](https://vitest.dev/). To run the tests locally:

```bash
npm run test
```

Test files are located in the `tests/` directory, with examples demonstrating how to test your endpoints and database interactions.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. Integration tests are located in the `tests/` directory.
4. For more information read the [chanfana documentation](https://chanfana.com/), [Hono documentation](https://hono.dev/docs), and [Vitest documentation](https://vitest.dev/guide/).

## Authentication and Rate Limiting

All routes are protected by a global middleware defined in `src/middleware/auth.ts` and wired in `src/index.ts`.

- Expects an API key in the `x-api-key` header
- Verifies the API key exists in the `FLIGHTWALL_API_KEYS` KV (value ignored)
- Applies rate limits using the `FLIGHTWALL_RATE_LIMITER` binding

Failure responses use a consistent envelope:

```json
{ "success": false, "errors": [{ "code": 1101 | 1102 | 1201, "message": string }] }
```

This removes the need for per-endpoint auth/rate checks and ensures uniform behavior.

## Edge caching for nearby flights

The `/flights` and `/test/flights` POST endpoints are edge-cached for 10 seconds per H3 tile using the Workers Cache API.

- **Normalization**: Requests with `radius_request` are normalized to an H3 cell (resolution 6) and a radius bucket.
- **Stable cache key**: We build a stable key `near/h3/<res>/<cell>/r<bucket>` and pair it with the request pathname (so `/flights` and `/test/flights` don't collide).
- **Workers Cache API**: We synthesize a GET request to look up and store responses in `caches.default`.
- **TTL via headers**: Responses include `Cache-Control: public, s-maxage=10, max-age=0` so the edge caches for ~10s and browsers don't cache.

Relevant code:

- `src/cache/nearby.ts` — helpers to normalize, build keys, and read/write the Workers cache
- `src/middleware/nearbyCache.ts` — middleware that serves cache hits and stores successful responses via `ctx.waitUntil`

Notes:

- Only successful `200` JSON responses are cached.
- No `ETag`/`If-None-Match` handling is needed for POST here; freshness is controlled by a short edge TTL.
- If you need purging, consider adding `Cache-Tag` headers keyed by the H3 id.
