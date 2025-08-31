# tiny-node-api

A lightweight, configurable static API server that turns files in text-based data serialization formats (JSON, YAML) into HTTP endpoints. It can serve files directly from the **filesystem**, expose **declarative endpoints**, optionally run **filter functions** over the data, and secure requests with **OAuth2/JWT** validation. It allows **merging** multiple files into a **single file**, e.g., to split configuration files into manageable chunks and serve them as a single file. Logging is split into **HTTP access logs** and **application logs**.

# How it works

## Locations

The server has different "locations" to handle requests:

- The `heartbeat` location provides a health probe.
- The `endpoints` location exposes configurable endpoints which can be mapped to specific files (`http://myserver/api/v1/users` might provide the content of `/public/users.json`). The server can optionally run filter functions before providing the content; named parameters (`http://myserver/api/v1/users/{id}/{email}`) can be used to specify the behaviour of the filter.
- The `filesystem` location just serves files in the server's `SERVER_PATH_PUBLIC`. However a modifier can be used to transform files, e.g. in order to merge multiple files into one single file.

The server will check the locations in the following order

```
Heartbeat → [Authentication] → Endpoints → Filesystem
```

If authentication is enabled, a request to the `endpoints` or `filesystem` location needs a valid JSON web token (JWT). Requests to the `heartbeat` location never need authentication.

## Processing requests

A request to a `filesystem` or `endpoints` location will be processed by different modules in the following order:

- Parse file (currently `JSON` and `YAML`)
- Apply modifiers (currently `include` modifier to merge the content of separate files in order to create a single response from files)
- Run a JavaScript filter function (only available for `endpoint` location)
- Format output (currently `JSON`, `YAML` or `JS`)

```
Parser → Modifier → Filters (optional; only endpoints) → Formatter
```

# Getting Started

To get started, you might want to clone and manual build the app or you can use the provided `Dockerfile` to create and run a Docker image.

## Git clone and manual build

Clone, install, build, and run the server directly with Node.js.

**Prerequisites**

- Node.js 20 or newer with npm

**Install**

```bash
# Clone this repository
git clone https://github.com/borispulyer/tiny-node-api.git
cd tiny-node-api

# Install dependencies
npm ci

# Build TypeScript to ./dist
npm run build:prod

# Copy and modify your environment file
cp .env.example .env
# ...then edit .env to your needs (start with the example below)

# Run the compiled server
npm start:prod
```

Minimal `.env` example:

```env
# Endpoints
ENDPOINTS='[{"enable":true,"path":"/api/v1/users","file":"./data/users.yaml","format":"json"},{"enable":true,"path":"/api/v1/users/{id}","file":"data/users.yaml","format":"json","filter":"./userById.js"}]'
```

## Docker Compose

You can use the provided `Dockerfile` to build and run a Docker image.

**Prerequisites**

- Docker 24+ and Docker Compose v2

Minimal `docker-compose.yml` example:

```yaml
services:
  tiny-node-api:
    build:
      context: 'https://github.com/borispulyer/tiny-node-api.git'
      # ... or build from local
      #context: .
      dockerfile: './Dockerfile'
    container_name: 'tiny-node-api'
    restart: 'unless-stopped'
    security_opt:
      - 'no-new-privileges:true'
    healthcheck:
      test:
        - CMD-SHELL
        - >
          node -e "const http=require('http');
          const port=process.env.SERVER_PORT||'3000';
          const req=http.get({host:'127.0.0.1',port:port,path:'/_heartbeat'},res=>process.exit(res.statusCode===200?0:1));
          req.on('error',()=>process.exit(1));
          setTimeout(()=>{try{req.destroy();}catch{} process.exit(1)},2000);"
      interval: 30s
      timeout: 3s
      retries: 5
      start_period: 10s
    ports:
      - '3000:3000'
    volumes:
      - './public:/app/public:ro'
      - './filter:/app/filter:ro'
      - './logs:/app/logs'
    environment:
      ENDPOINTS: '[{"enable":true,"path":"/api/v1/users","file":"./data/users.yaml","format":"json"},{"enable":true,"path":"/api/v1/users/{id}","file":"data/users.yaml","format":"json","filter":"./userById.js"}]'
```

**Build and run**

```bash
docker compose up --build
```

## Verifying your deployment

- Health check (if `SERVER_LOCATIONS_HEARTBEAT=true`), for example:

  ```
  GET http://<host>:3000/_heartbeat
  ```

- Filesystem serving:

  ```
  GET http://<host>:3000/data/users        # resolves extension if enabled
  GET http://<host>:3000/data/users.yaml   # explicit
  ```

- Endpoint serving (from `ENDPOINTS`):

  ```
  GET http://<host>:3000/api/v1/users
  GET http://<host>:3000/api/v1/users/1
  ```

# Configuration

Below you’ll find an overview of every environment variable consumed by the current codebase, grouped by topic and shown with its default values. Paths marked `/project-root` are resolved relative to the repository root. Please find a detailed explanation of the configuration properties afterwards.

**Overview**

```bash
#	Example environment configuration

###
#	Server configuration
###
#	Port for the HTTP server (default: 3000)
SERVER_PORT=3000
#	Absolute or relative path to static configuration files (./public)
SERVER_PATH_PUBLIC=./public
#	Absolute or relative path where filter functions are located (./filter)
SERVER_PATH_FILTER=./filter
#	Enable the built-in heartbeat endpoint (true)
SERVER_LOCATIONS_HEARTBEAT=true
#	Enable custom endpoints defined in ENDPOINTS (true)
SERVER_LOCATIONS_ENDPOINTS=true
#	Enable direct filesystem access (true)
SERVER_LOCATIONS_FILESYSTEM=true
#	Cache-Control Header without authentication
SERVER_CACHE_HEADER='stale-while-revalidate=300, stale-if-error=3600'
#	Cache-Control Header with authentication
SERVER_CACHE_HEADER_AUTH='private, no-cache'
#	Socket timeout in milliseconds (5000 ms)
SERVER_TIMEOUTS_SOCKET=5000
#	Keep-alive timeout in milliseconds (75000 ms)
SERVER_TIMEOUTS_KEEPALIVE=75000
#	Headers timeout in milliseconds (80000 ms)
SERVER_TIMEOUTS_HEADERS=80000
#	Request timeout in milliseconds (60000 ms)
SERVER_TIMEOUTS_REQUEST=60000
#	Maximum number of requests per socket (1000 requests)
SERVER_MAX_REQUESTS=1000

###
#	Filesystem behaviour
###
#	Resolve file extensions automatically (true)
FILESYSTEM_RESOLVE_EXT=true

###
#	Endpoint definitions
###
#	JSON array with endpoints ([]):
ENDPOINTS='
	[
		{
			"enable": true,
			"path": "/api/v1/users",
			"file": "data/users.yaml",
			"format": "json"
		}, {
			"enable": true,
			"path": "/api/v1/users/{id}",
			"file": "data/users.yaml",
			"format": "json",
			"filter": "userById.js"
		}
	]'

###
#	Authentication
###
#	Enable OAuth2 authentication (false)
AUTH_ENABLE=false
#	OAuth2 issuer URI
AUTH_OAUTH2_ISSUER=https://issuer.example.com
#	JWKS endpoint providing public keys
AUTH_OAUTH2_JWKS=https://issuer.example.com/.well-known/jwks.json
#	Expected audience value
AUTH_OAUTH2_AUDIENCE=my-audience

###
#	Modifier modules
###
#	Enable modifier pipeline (true)
MODIFIER_ENABLE=true
#	Enable modifier for merging files (true)
MODIFIER_INCLUDE_ENABLE=true

###
#	Default formatter
###
#	Output format used when it is not specified (via file extensions e.g. http://example.com/file.json) or extension is not valid
FORMATTER_DEFAULT=json

###
#	HTTP request logging
###
#	Enable HTTP access logs (true)
LOGGING_HTTP_ENABLE=true
#	Stream HTTP logs to stdout (false)
LOGGING_HTTP_STDOUT_ENABLE=false
#	Log level for HTTP stdout logging (options: silent|fatal|error|warn|info|debug|trace; default: info)
LOGGING_HTTP_STDOUT_LEVEL=info
#	Write HTTP logs to filesystem (true)
LOGGING_HTTP_FILE_ENABLE=true
#	File path prefix for HTTP logs (./logs/access)
LOGGING_HTTP_FILE=./logs/access
#	Log level for HTTP file logging (options: silent|fatal|error|warn|info|debug|trace; default: info)
LOGGING_HTTP_FILE_LEVEL=info
#	Maximum size of each HTTP log before rotation (10M bytes)
LOGGING_HTTP_LOGROTATION_SIZE=10M
#	How often HTTP logs rotate (options: daily|weekly; default: daily)
LOGGING_HTTP_LOGROTATION_FREQUENCY=daily
#	Number of rotated HTTP logs to keep (180 files)
LOGGING_HTTP_LOGROTATION_LIMIT=180
#	File extension for rotated HTTP logs (log)
LOGGING_HTTP_LOGROTATION_EXTENSION=log
#	Date format in rotated HTTP log names (yyyy-MM-dd)
LOGGING_HTTP_LOGROTATION_DATEFORMAT=yyyy-MM-dd
#	Create symlink to latest HTTP log (false)
LOGGING_HTTP_LOGROTATION_SYMLINK=false

###
#	Application logging
###
#	Enable application logs (true)
LOGGING_APP_ENABLE=true
#	Stream application logs to stdout (true)
LOGGING_APP_STDOUT_ENABLE=true
#	Log level for application stdout logging (options: silent|fatal|error|warn|info|debug|trace; default: warn)
LOGGING_APP_STDOUT_LEVEL=warn
#	Write application logs to filesystem (true)
LOGGING_APP_FILE_ENABLE=true
#	File path prefix for application logs (./logs/app)
LOGGING_APP_FILE=./logs/app
#	Log level for application file logging (options: silent|fatal|error|warn|info|debug|trace; default: info)
LOGGING_APP_FILE_LEVEL=info
#	Maximum size of each application log before rotation (10M bytes)
LOGGING_APP_LOGROTATION_SIZE=10M
#	How often application logs rotate (options: daily|weekly; default: daily)
LOGGING_APP_LOGROTATION_FREQUENCY=daily
#	Number of rotated application logs to keep (180 files)
LOGGING_APP_LOGROTATION_LIMIT=180
#	File extension for rotated application logs (log)
LOGGING_APP_LOGROTATION_EXTENSION=log
#	Date format in rotated application log names (yyyy-MM-dd)
LOGGING_APP_LOGROTATION_DATEFORMAT=yyyy-MM-dd
#	Create symlink to latest application log (false)
LOGGING_APP_LOGROTATION_SYMLINK=false
```

## Server

| Variable                      | Purpose                                                                                              | Default                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `SERVER_PORT`                 | Port for the HTTP server.                                                                            | `3000`                                            |
| `SERVER_PATH_PUBLIC`          | Root directory for serving files and resolving `endpoints[].file`.                                   | `project-root/public`                             |
| `SERVER_PATH_FILTER`          | Root directory where filter function files live; `endpoints[].filter` is resolved under this folder. | `project-root/filter`                             |
| `SERVER_LOCATIONS_HEARTBEAT`  | Enable the heartbeat location.                                                                       | `true`                                            |
| `SERVER_LOCATIONS_ENDPOINTS`  | Enable endpoint-based serving.                                                                       | `true`                                            |
| `SERVER_LOCATIONS_FILESYSTEM` | Enable direct filesystem serving.                                                                    | `true`                                            |
| `SERVER_CACHE_HEADER`         | Set the "Cache-Control" HTTP header.                                                                 | `stale-while-revalidate=300, stale-if-error=3600` |
| `SERVER_CACHE_HEADER_AUTH`    | Set the "Cache-Control" HTTP header if a user is authenticated.                                      | `private, no-cache`                               |
| `SERVER_TIMEOUTS_SOCKET`      | Idle socket timeout (ms).                                                                            | `5_000`                                           |
| `SERVER_TIMEOUTS_KEEPALIVE`   | Keep-alive timeout (ms).                                                                             | `75_000`                                          |
| `SERVER_TIMEOUTS_HEADERS`     | Headers timeout (ms).                                                                                | `80_000`                                          |
| `SERVER_TIMEOUTS_REQUEST`     | Request timeout (ms).                                                                                | `60_000`                                          |
| `SERVER_MAX_REQUESTS`         | Max requests per TCP socket. Helps against slow-loris style connections.                             | `1000`                                            |

**Notes**

- Relative paths in environment variables (e.g., `SERVER_PATH_PUBLIC`, `SERVER_PATH_FILTER`) are resolved relative to the project root.
- All timeouts are **milliseconds**.
- Filesystem requests resolve the requested path under `SERVER_PATH_PUBLIC`. If it falls outside, it is rejected. **Please note**, that the server does not check the real path of symlinks.
- Filter function files are resolved under `SERVER_PATH_FILTER`. If it falls outside, it is rejected. **Please note**, that the server does not check the real path of symlinks.

**Caching and conditional requests**

- For file-backed responses the server sets:
  - `ETag: W/"<mtimeMs>-<size>"`
  - `Last-Modified`
- If the request includes `If-None-Match` or `If-Modified-Since` that matches, the server responds with **304 Not Modified**.

## Locations

A request is handled by one of the location modules in the following order.

```
Heartbeat → Endpoints → Filesystem
```

### Heartbeat location

Requesting `http://myserver/_heartbeat`will return a `200 OK` HTTP status code.

**Note**: No Authentication is needed for a request to the heartbeat location.

### Endpoints location

Expose files as user defined endpoints and optionally run custom JavaScript filter functions.

| Variable    | Purpose                                                       | Default |
| ----------- | ------------------------------------------------------------- | ------- |
| `ENDPOINTS` | JSON (array or single object) describing endpoints to expose. | `[]`    |

#### Endpoint scheme

```jsonc
[
  {
    // MUST be true to activate (if omitted, treated as disabled)
    "enable": true,
    // Request path; named params allowed via {param}
    "path": "/api/v1/users/{id}",
    // File to serve as the endpoint. Resolved under SERVER_PATH_PUBLIC. Might be outside of SERVER_PATH_PUBLIC.
    "file": "./users.yaml",
    // Optional: "json" | "yaml" | "js". If omitted, taken from file extension of the server request; if unknown, fallback to FORMATTER_DEFAULT.
    "format": "json",
    // Optional: path to a JavaScript filter file. Throws an error, if the file is not within SERVER_PATH_FILTER; relative locations are resolved under SERVER_PATH_FILTER
    "filter": "./userById.js",
  },
  {
    // ...
  },
]
```

**Examples**

- Minimal list (array):

```json
[{ "enable": true, "path": "/api/v1/users", "file": "./data/users.json" }]
```

- With format override and filter:

```json
[
  {
    "enable": true,
    "path": "/api/v1/user/{id}",
    "file": "./data/users.yaml",
    "format": "json",
    "filter": "./userById.js"
  }
]
```

#### Filter functions

You can find additional information about filter functions and ready-to-use examples in [4. Filter functions](#4-filter-functions).

### Filesystem location

Serve files from `SERVER_PATH_PUBLIC` with a file format known to the available parsers. If a request falls outside, it is rejected. Please note that the server does not check the real path of symlinks.

| Variable                 | Purpose                                                                                                                     | Default |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------- |
| `FILESYSTEM_RESOLVE_EXT` | If the URL omits an extension or the extension is not valid, try every registered parser extension to find a matching file. | `true`  |

**Example:** Requesting `/data/users` will probe `/data/users.json`, `/data/users.yaml`, etc., in the order of registered parsers.

## Modifiers

Modifiers run after parsing and before filtering and formatting.

```
Parser → Modifier → Endpoint Filters (optional) → Formatter
```

This server supports **file inclusion** during the _modifier_ stage. The `include` modifier is enabled by default and replaces any object shaped like `{"__include__": "<relative-path>"}` with the parsed contents of the referenced file. In YAML you can use a custom tag `!include` that expands to the same directive.

| Variable                  | Purpose                                       | Default |
| ------------------------- | --------------------------------------------- | ------- |
| `MODIFIER_ENABLE`         | Globally enable/disable the modifier stage.   | `true`  |
| `MODIFIER_INCLUDE_ENABLE` | Enable/disable the `include` modifier module. | `true`  |

### Syntax

#### YAML

Use the `!include` tag anywhere a value is expected. The path is resolved **relative to the file that contains the directive**.

```yaml
# public/config/app.yaml
name: tiny-node-api
version: 1

# Merge an object from another file into this branch
database: !include ./partials/database.yaml

# Include inside arrays
features:
  - name: core
  - !include ./partials/feature-logging.yaml
  - !include ./partials/feature-auth.yaml
```

Example partials:

```yaml
# public/config/partials/database.yaml
driver: postgres
host: db.example.local
port: 5432
```

```yaml
# public/config/partials/feature-logging.yaml
name: logging
level: info
```

#### JSON

Use an object with an `__include__` property whose value is a string path. The path is resolved **relative to the file that contains the directive**.

```json
{
  "name": "tiny-node-api",
  "version": 1,
  "database": { "__include__": "./partials/database.json" },
  "features": [{ "name": "core" }, { "__include__": "./partials/feature-logging.json" }]
}
```

### Resolution rules

- **Relative paths** are resolved from the directory of the file that contains the directive; included files may themselves contain further includes, and the base directory updates at each step.
- **Security boundary**: The target must resolve **inside** `SERVER_PATH_PUBLIC`. If not, the server responds with **403 Forbidden**.
- **Duplicate includes**: The same file may not be included more than once within a single request. Re-including the same file raises a **500 Syntax Error**.
- **Unparsable/unsupported files**: If the included file cannot be parsed by a registered parser or its content has syntax issues, it is treated as a syntax error and results in an **HTTP 500**.
- **Merging/flattening**: Includes are **pure replacement** of the node where they appear. The server does not merge objects or flatten arrays for you. If you include an array inside an array, you will get a nested array.

### Errors and their meaning

- Outside of `SERVER_PATH_PUBLIC` → **403 Forbidden** (file access error).
- Re-including the same file (even from different locations) → **500 Syntax error in file**.
- I/O error during include (file not found) → **404 File not found**.
- Unsupported or unparsable include target → **500 Syntax error in file**.

## Formatters

Formatters run at the end of the pipeline before sending the file to the client. They convert the JavaScript object to the request output format. For a detailed explanation on how to select the desired format see [URL structure and format selection](#3-url-structure-and-format-selection)

```
Parser → Modifier → Endpoint Filters (optional) → Formatter
```

| Variable            | Purpose                                                                                                     | Default  |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| `FORMATTER_DEFAULT` | Fallback output format if a given endpoint has neither `format` nor a requested file has a known extension. | `"json"` |

Registered formatters: `json`, `yaml`, `js`.

## Authentication (OAuth2/JWT)

Authentication is done by providing a JSON Web Token (JWT) in the authentication header. The server checks if the token is valid and authenticates the user.

| Variable               | Purpose                                     | Default |
| ---------------------- | ------------------------------------------- | ------- |
| `AUTH_ENABLE`          | Enable/disable authentication.              | `false` |
| `AUTH_OAUTH2_ISSUER`   | Issuer (Authorization Server) base URL.     | `null`  |
| `AUTH_OAUTH2_JWKS`     | JWKS URL for verifying JWT signatures.      | `null`  |
| `AUTH_OAUTH2_AUDIENCE` | Expected `aud` claim (your API identifier). | `null`  |

### How auth works

- To authenticate the client must provide a JSON Web Token (JWT) in its Authorization header. The server expects the following header: `Authorization: Bearer <JWT>`.
- It fetches the JWKS (public keys) from `AUTH_OAUTH2_JWKS` and validates the token’s signature and standard claims. It enforces the `aud` claim if configured.
- On failure, it returns `401 Unauthorized` and sets `WWW-Authenticate` with details (realm and error code/message).
- If `AUTH_ENABLE=false`, requests are not authenticated. Requests to the [heartbeat location](#heartbeat-location) are never authenticated.
- Under the hood, [jose](https://www.npmjs.com/package/jose) is performing the token validation.

### Glossary

- **JSON Web Tokens (JWT)**: JWTs are self-contained, stateless tokens that carry all the necessary information for authentication and authorization within the token itself. They are digitally signed, which verifies the token's origin and integrity.
- **Issuer**: Your OAuth2/OpenID Provider (e.g., Zitadel, Keycloak, Auth0).
- **JWKS**: JSON Web Key Set. A URL where the provider publishes the public keys used to sign JWTs.
- **Audience (`aud`)**: Intended recipient of the token — usually the identifier of your API.
- **Realm**: A descriptive name of the protection space, added to the `WWW-Authenticate` header.

## Logging

Logging uses two channels:

- **HTTP access logs**: request/response summaries.
- **Application logs**: module-level diagnostics from parser/modifier/formatter/server/auth.

### HTTP access logging

| Variable                              | Purpose                                       | Default                    |
| ------------------------------------- | --------------------------------------------- | -------------------------- |
| `LOGGING_HTTP_ENABLE`                 | Enable/disable HTTP access logging pipeline.  | `true`                     |
| `LOGGING_HTTP_STDOUT_ENABLE`          | Enable stdout target for access logs.         | `false`                    |
| `LOGGING_HTTP_STDOUT_LEVEL`           | Min level for stdout target.                  | `"info"`                   |
| `LOGGING_HTTP_FILE_ENABLE`            | Enable file target for access logs.           | `true`                     |
| `LOGGING_HTTP_FILE`                   | File path prefix (rotated file base path).    | `project-root/logs/access` |
| `LOGGING_HTTP_FILE_LEVEL`             | Min level for file target.                    | `"info"`                   |
| `LOGGING_HTTP_LOGROTATION_SIZE`       | Rotate after size.                            | `"10M"`                    |
| `LOGGING_HTTP_LOGROTATION_FREQUENCY`  | Rotation cadence.                             | `"daily"`                  |
| `LOGGING_HTTP_LOGROTATION_LIMIT`      | Keep up to N rotations.                       | `180`                      |
| `LOGGING_HTTP_LOGROTATION_EXTENSION`  | File extension.                               | `"log"`                    |
| `LOGGING_HTTP_LOGROTATION_DATEFORMAT` | Date format used in filenames.                | `"yyyy-MM-dd"`             |
| `LOGGING_HTTP_LOGROTATION_SYMLINK`    | Maintain a stable symlink to the latest file. | `false`                    |

### Application logging

| Variable                             | Purpose                                       | Default                 |
| ------------------------------------ | --------------------------------------------- | ----------------------- |
| `LOGGING_APP_ENABLE`                 | Enable/disable application logging pipeline.  | `true`                  |
| `LOGGING_APP_STDOUT_ENABLE`          | Enable stdout target for app logs.            | `true`                  |
| `LOGGING_APP_STDOUT_LEVEL`           | Min level for stdout target.                  | `"warn"`                |
| `LOGGING_APP_FILE_ENABLE`            | Enable file target for app logs.              | `true`                  |
| `LOGGING_APP_FILE`                   | File path prefix (rotated file base path).    | `project-root/logs/app` |
| `LOGGING_APP_FILE_LEVEL`             | Min level for file target.                    | `"info"`                |
| `LOGGING_APP_LOGROTATION_SIZE`       | Rotate after size.                            | `"10M"`                 |
| `LOGGING_APP_LOGROTATION_FREQUENCY`  | Rotation cadence.                             | `"daily"`               |
| `LOGGING_APP_LOGROTATION_LIMIT`      | Keep up to N rotations.                       | `180`                   |
| `LOGGING_APP_LOGROTATION_EXTENSION`  | File extension.                               | `"log"`                 |
| `LOGGING_APP_LOGROTATION_DATEFORMAT` | Date format used in filenames.                | `"yyyy-MM-dd"`          |
| `LOGGING_APP_LOGROTATION_SYMLINK`    | Maintain a stable symlink to the latest file. | `false`                 |

# URL structure and request handling

The server has two “locations” that can handle a request: **filesystem** and **endpoints**. How the **output format** is chosen differs slightly between them.

## Filesystem location

### File resolving for filesystem requests

- The requested **URL path** is mapped to a file under `SERVER_PATH_PUBLIC`. Path traversal outside this root is rejected.
- If the URL **includes an file extension**, the server tries that exact file first (e.g. `http://myserver/data/users.json` → `public/data/users.json`).
- If `FILESYSTEM_RESOLVE_EXT=true` and the URL **has no file extension**, uses an **unknown extension** or the file with the given extension is **not existing**, the server will **probe** files with the same basename using each registered parser extension, in registration order. By default:
  - parsers: YAML then JSON
  - extensions tried: `yaml`, `yml`, `json`, `jsonc`
  - example: `http://myserver/data/users` will resolve to the first existing file among `/data/users.yaml`, `/data/users.yml`, `/data/users.json`, `/data/users.jsonc`.

### Output format for filesystem location requests

- The output formatter is selected from the **URL’s extension**:
  - `http://myserver/data/users.json` → JSON formatter
  - `http://myserver/data/users.yaml` → YAML formatter
  - `http://myserver/data/users.js` → JS formatter (ES module: `export default <data>;`)
- If the URL **has no file extension** or uses an **unknown extension**, the server falls back to `FORMATTER_DEFAULT` (default: `json`) regardless of the source file’s extension. Hence, if you want the filesystem to always return a specific format when extensions are omitted, set `FORMATTER_DEFAULT` accordingly.
- Example: with `FORMATTER_DEFAULT=json`, a request to `http://myserver/data/users` will return a **JSON** formatted file, even if the probed source is `users.yaml`.

### MIME types

- JSON → `application/json; charset=utf-8`
- YAML → `application/x-yaml; charset=utf-8`
- JS (ES module) → `application/javascript; charset=utf-8`

### Examples

Assume that a file `public/config/app.yaml` is available on the server:

- `GET http://myserver/config/app.yaml` → parses `public/config/app.yaml`, returns **YAML**.
- `GET http://myserver/config/app` with `FILESYSTEM_RESOLVE_EXT=true` and `FORMATTER_DEFAULT=json` → resolves `public/config/app.yaml` and returns **JSON**.

## Endpoints location

Endpoints are configured via the [`ENDPOINTS` JSON array](#endpoints-location). Matching uses literal paths with optional named parameters (`{id}`, `{path}`, …).

### File resolving for endpoint location requests

Only the file specified in `endpoint.file` will be processed for the response.

### Output format for endpoint location requests

- The output formatter is chosen from:
  1. `endpoint.format` if present, otherwise
  2. the **extension of `endpoint.file`**, otherwise
  3. the server falls back to `FORMATTER_DEFAULT` (default: `json`)
- The URL’s own extension (if any) **does not affect** the formatter for endpoints.
- If you want deterministic output formats for endpoints, set the `format` field explicitly.

### Examples

- Endpoint `{ "path": "/api/v1/users", "file": "data/users.yaml", "format": "json" }` → returns **always JSON**, independent of the request URL.
- Endpoint `{ "path": "/api/v1/users/{id}", "file": "data/users.json" }` → format inferred from the file (`json`) if `format` is omitted.

# Filter functions

Filter functions can be configured within an endpoint location. The filesystem location is intended to just serve static files and does not provide any filter function.

Filter functions run after the parser and the modifier in the pipeline and allow you to programmatically transform the parsed data **per endpoint** before formatting.

```
Parser → Modifier → Endpoint Filters (optional) → Formatter
```

## Where filters live

- Root folder: **`SERVER_PATH_FILTER`**, default `project-root/filter`.
- In each endpoint: set `"filter": "<file.js>"`. The code resolves the file as `path.resolve(SERVER_PATH_FILTER, <file>)`.

## Shape of a filter function

Each file must **default-export** a JavaScript function with the following signature:

```ts
// (TypeScript signature for reference, function must be JavaScript)
type FilterFn = (data: any, params?: Record<string, string>) => any | Promise<any>
```

- `data` contains the raw data after handled by Parser → Modifier
- `params` contains the **named placeholders** extracted from your endpoint path, e.g. for `/api/v1/users/{id}`, a request to `/api/v1/users/123` passes `{ id: "123" }`. Multiple placholders are valid.

**Notes:**

- **File location:** Place these files under the directory configured by `SERVER_PATH_FILTER` (default `project-root/filter`). In `ENDPOINTS`, reference them by filename (e.g., `"filter": "./userById.js"`). The server resolves them with `path.resolve(SERVER_PATH_FILTER, <file>)`.
- The **module cache** is kept; subsequent requests reuse the loaded filter function. If you modify a filter which has already been in use, you need to restart the server.
- **Parameters:** Only **path parameters** (from `{...}` segments) are passed in `params`. If you need query parameters, encode them into the path or implement a custom location stage.
- **Return values:** Return any JSON-serializable value. Returning `null` for “not found” is a common, API-friendly pattern (it avoids 500 errors).
- **Errors:** Throwing an error will surface as a 5xx response. If you need semantic 404/400 responses, prefer returning `null`/an error object in the payload unless your deployment wraps filters with custom error handling. If the module doesn’t default-export a function, configuration fails with a **ConfigurationError**
- **Async filters:** You can `await` I/O (e.g., read another file).
- **TypeScript filters:** If you prefer `.ts` filters, compile them to `.js` in your build pipeline and reference the compiled file in `ENDPOINTS`, or ensure your runtime can import TypeScript directly.

## Examples of filter functions

Below are ready-to-use filter function examples you can drop into your `filter` directory (the path is controlled by `SERVER_PATH_FILTER`, default `project-root/filter`).

### Example: `filter/userById.js` — Select a single item by `{id}`

**Use when:** Your data is an array of objects (e.g., users), and you want to return the one with a matching `id`.

```js
// filter/userById.js
export default function userById(data, params) {
  // Validation
  if (!Array.isArray(data) || !params || !('id' in params)) return data

  const id = String(params.id)

  // Accept numeric or string ids, perform a string comparison.
  const item = data.find((x) => String(x?.id) === id)

  // Return null if not found (client gets `null` as JSON).
  return item ?? null
}
```

**Endpoint example**

```json
[
  {
    "enable": true,
    "path": "/api/v1/users/{id}",
    "file": "./data/users.json",
    "format": "json",
    "filter": "./userById.js"
  }
]
```

### Example: `filter/sectionByPath.js` — Pick a nested branch via `{path}` (dot-notation)

**Use when:** Your data is a nested object and you want to extract a branch, e.g. `/api/v1/config/{path}` with `{path}` like `database.pool` or `features.myFeature`.

```js
// filter/sectionByPath.js
export default function sectionByPath(data, params) {
  const path = params?.path
  if (!path || typeof data !== 'object' || data === null) return data

  // Support dot-notation: "a.b.c"
  const keys = String(path).split('.').filter(Boolean)

  let current = data
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k]
    } else {
      return null // branch not found
    }
  }
  return current
}
```

**Endpoint example**

```json
[
  {
    "enable": true,
    "path": "/api/v1/config/{path}",
    "file": "./config/settings.yaml",
    "format": "json",
    "filter": "./sectionByPath.js"
  }
]
```

### Example: `filter/activeDevices.js` — Filter + project a collection

**Use when:** Your data is an array and you want to filter by a property (e.g., `active === true`) and return a reduced shape.

```js
// filter/activeDevices.js
export default function activeDevices(data, _params) {
  if (!Array.isArray(data)) return data

  return data
    .filter((d) => d && d.active === true)
    .map((d) => ({
      id: d.id,
      name: d.name,
      lastSeen: d.lastSeen ?? null,
    }))
}
```

**Endpoint example**

```json
[
  {
    "enable": true,
    "path": "/api/v1/devices/active",
    "file": "./data/devices.yaml",
    "format": "json",
    "filter": "./activeDevices.js"
  }
]
```

### Example: `filter/itemsByTag.js` — Match one or multiple tags via `{tag}`

**Use when:** Items have a `tags` array and you want to return items that include one or more requested tags. Supports comma-separated tags in `{tag}`.

```js
// filter/itemsByTag.js
export default function itemsByTag(data, params) {
  if (!Array.isArray(data)) return data

  const raw = params?.tag
  if (!raw) return data

  const wanted = String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (wanted.length === 0) return data

  return data.filter((item) => {
    const tags = Array.isArray(item?.tags) ? item.tags : []
    const lower = tags.map((t) => String(t).toLowerCase())
    return wanted.some((w) => lower.includes(w))
  })
}
```

**Endpoint example**

```json
[
  {
    "enable": true,
    "path": "/api/v1/items/by-tag/{tag}",
    "file": "./data/items.json",
    "format": "json",
    "filter": "./itemsByTag.js"
  }
]
```

### Example: `filter/paginate.js` — Paginate with `{offset}` and `{limit}`

**Use when:** You need simple pagination on array data and you encode both values in the path.

```js
// filter/paginate.js
function toInt(value, fallback) {
  const n = Number.parseInt(String(value), 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export default function paginate(data, params) {
  if (!Array.isArray(data)) return data

  const offset = toInt(params?.offset, 0)
  const limit = toInt(params?.limit, 20)

  const slice = data.slice(offset, offset + limit)
  return {
    offset,
    limit,
    total: data.length,
    items: slice,
  }
}
```

**Endpoint example**

```json
[
  {
    "enable": true,
    "path": "/api/v1/users/page/{offset}/{limit}",
    "file": "data/users.json",
    "format": "json",
    "filter": "./paginate.js"
  }
]
```

# NGINX reverse-proxy configurations

The tiny-node-api server might run behind a reverse-proxy like NGINX. The following NGINX example configurations proxy to a local instance on `localhost:3000`. Adjust as needed.

## Forward everything under `/api`

```nginx
server {
	listen 80;
	server_name example.com;

	location /api/ {
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_pass http://127.0.0.1:3000;
	}
}
```

## Forward only JSON/YAML requests (any path ending with .json/.yaml/.yml)

```nginx
server {
	listen 80;
	server_name example.com;

	location ~* \.(json|yaml|yml)$ {
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_pass http://127.0.0.1:3000;
	}
}
```

## TLS, Caching

- Terminate TLS in NGINX (`listen 443 ssl;`) and pass to Node over HTTP.
- By default, the server sets `ETag`/`Last-Modified` for file-backed responses. Ensure `proxy_set_header If-None-Match $http_if_none_match;` and `proxy_set_header If-Modified-Since $http_if_modified_since;` are **not** stripped if you rely on conditional GETs.

# Docker Compose

## General

You can use the provided `Dockerfile` to build and run a Docker image.

```yaml
services:
  tiny-node-api:
    build:
      context: 'https://github.com/borispulyer/tiny-node-api.git'
      # ... or build from local
      #context: .
      dockerfile: './Dockerfile'
    container_name: 'tiny-node-api'
    restart: 'unless-stopped'
    security_opt:
      - 'no-new-privileges:true'
    healthcheck:
      test:
        - CMD-SHELL
        - >
          node -e "const http=require('http');
          const port=process.env.SERVER_PORT||'3000';
          const req=http.get({host:'127.0.0.1',port:port,path:'/_heartbeat'},res=>process.exit(res.statusCode===200?0:1));
          req.on('error',()=>process.exit(1));
          setTimeout(()=>{try{req.destroy();}catch{} process.exit(1)},2000);"
      interval: 30s
      timeout: 3s
      retries: 5
      start_period: 10s
    ports:
      - '3000:3000'
    volumes:
      - './public:/app/public:ro'
      - './filter:/app/filter:ro'
      - './logs:/app/logs'
    #env_file: ".env"
    environment:
      ###
      #	Server configuration
      ###
      #	Port for the HTTP server (default: 3000)
      #SERVER_PORT: 3000
      #	Absolute or relative path to static configuration files (./public)
      #SERVER_PATH_PUBLIC: "./public"
      #	Absolute or relative path where filter functions are located (./filter)
      #SERVER_PATH_FILTER: "./filter"
      #	Enable the built-in heartbeat endpoint (true)
      #SERVER_LOCATIONS_HEARTBEAT: true
      #	Enable custom endpoints defined in ENDPOINTS (true)
      #SERVER_LOCATIONS_ENDPOINTS: true
      #	Enable direct filesystem access (true)
      #SERVER_LOCATIONS_FILESYSTEM: true
      #	Cache-Control Header without authentication
      #SERVER_CACHE_HEADER: 'stale-while-revalidate=300, stale-if-error=3600'
      #	Cache-Control Header with authentication
      #SERVER_CACHE_HEADER_AUTH: 'private, no-cache'
      #	Socket timeout in milliseconds (5000 ms)
      #SERVER_TIMEOUTS_SOCKET: 5000
      #	Keep-alive timeout in milliseconds (75000 ms)
      #SERVER_TIMEOUTS_KEEPALIVE: 75000
      #	Headers timeout in milliseconds (80000 ms)
      #SERVER_TIMEOUTS_HEADERS: 80000
      #	Request timeout in milliseconds (60000 ms)
      #SERVER_TIMEOUTS_REQUEST: 60000
      #	Maximum number of requests per socket (1000 requests)
      #SERVER_MAX_REQUESTS: 1000
      ###
      #	Filesystem behaviour
      ###
      #	Resolve file extensions automatically (true)
      #FILESYSTEM_RESOLVE_EXT: true

      ###
      #	Endpoint definitions
      ###
      #	JSON array with endpoints ([]):
      #ENDPOINTS:
      #  '[
      #  	{
      #  		"enable": true,
      #  		"path": "/api/v1/users",
      #  		"file": "data/users.yaml",
      #  		"format": "json"
      #  	}, {
      #  		"enable": true,
      #  		"path": "/api/v1/users/{id}",
      #  		"file": "data/users.yaml",
      #  		"format": "json",
      #  		"filter": "userById.js"
      #  	}
      #  ]'
      ###
      #	Authentication
      ###
      #	Enable OAuth2 authentication (false)
      #AUTH_ENABLE: false
      #	OAuth2 issuer URI
      #AUTH_OAUTH2_ISSUER: https://issuer.example.com
      #	JWKS endpoint providing public keys
      #AUTH_OAUTH2_JWKS: https://issuer.example.com/.well-known/jwks.json
      #	Expected audience value
      #AUTH_OAUTH2_AUDIENCE: my-audience
      ###
      #	Modifier modules
      ###
      #	Enable modifier pipeline (true)
      #MODIFIER_ENABLE: true
      #	Enable modifier for merging files (true)
      #MODIFIER_INCLUDE_ENABLE: true
      ###
      #	Default formatter
      ###
      #	Output format used when it is not specified (via file extensions e.g. http://example.com/file.json) or extension is not valid
      #FORMATTER_DEFAULT: json
      ###
      #	HTTP request logging
      ###
      #	Enable HTTP access logs (true)
      #LOGGING_HTTP_ENABLE: true
      #	Stream HTTP logs to stdout (false)
      #LOGGING_HTTP_STDOUT_ENABLE: false
      #	Log level for HTTP stdout logging (options: silent|fatal|error|warn|info|debug|trace; default: info)
      #LOGGING_HTTP_STDOUT_LEVEL: info
      #	Write HTTP logs to filesystem (true)
      #LOGGING_HTTP_FILE_ENABLE: true
      #	File path prefix for HTTP logs (./logs/access)
      #LOGGING_HTTP_FILE: ./logs/access
      #	Log level for HTTP file logging (options: silent|fatal|error|warn|info|debug|trace; default: info)
      #LOGGING_HTTP_FILE_LEVEL: info
      #	Maximum size of each HTTP log before rotation (10M bytes)
      #LOGGING_HTTP_LOGROTATION_SIZE: 10M
      #	How often HTTP logs rotate (options: daily|weekly; default: daily)
      #LOGGING_HTTP_LOGROTATION_FREQUENCY: daily
      #	Number of rotated HTTP logs to keep (180 files)
      #LOGGING_HTTP_LOGROTATION_LIMIT: 180
      #	File extension for rotated HTTP logs (log)
      #LOGGING_HTTP_LOGROTATION_EXTENSION: log
      #	Date format in rotated HTTP log names (yyyy-MM-dd)
      #LOGGING_HTTP_LOGROTATION_DATEFORMAT: yyyy-MM-dd
      #	Create symlink to latest HTTP log (false)
      #LOGGING_HTTP_LOGROTATION_SYMLINK: false
      ###
      #	Application logging
      ###
      #	Enable application logs (true)
      #LOGGING_APP_ENABLE: true
      #	Stream application logs to stdout (true)
      #LOGGING_APP_STDOUT_ENABLE: true
      #	Log level for application stdout logging (options: silent|fatal|error|warn|info|debug|trace; default: warn)
      #LOGGING_APP_STDOUT_LEVEL: warn
      #	Write application logs to filesystem (true)
      #LOGGING_APP_FILE_ENABLE: true
      #	File path prefix for application logs (./logs/app)
      #LOGGING_APP_FILE: ./logs/app
      #	Log level for application file logging (options: silent|fatal|error|warn|info|debug|trace; default: info)
      #LOGGING_APP_FILE_LEVEL: info
      #	Maximum size of each application log before rotation (10M bytes)
      #LOGGING_APP_LOGROTATION_SIZE: 10M
      #	How often application logs rotate (options: daily|weekly; default: daily)
      #LOGGING_APP_LOGROTATION_FREQUENCY: daily
      #	Number of rotated application logs to keep (180 files)
      #LOGGING_APP_LOGROTATION_LIMIT: 180
      #	File extension for rotated application logs (log)
      #LOGGING_APP_LOGROTATION_EXTENSION: log
      #	Date format in rotated application log names (yyyy-MM-dd)
      #LOGGING_APP_LOGROTATION_DATEFORMAT: yyyy-MM-dd
      #	Create symlink to latest application log (false)
      #LOGGING_APP_LOGROTATION_SYMLINK: false
```

## With NGINX

You can deploy the tiny-node-api with NGINX in a single `docker-compose.yaml`:

```yaml
services:
  # Nginx
  nginx:
    image: 'docker.io/nginx:latest'
    container_name: 'nginx'
    restart: 'unless-stopped'
    depends_on:
      tiny-node-api:
        condition: 'service_healthy'
    security_opt:
      - 'no-new-privileges:true'
    networks:
      - 'wan'
    ports:
      #- "80:80"
    volumes:
      - './public:/usr/share/nginx/html:ro'
      - './nginx/config:/etc/nginx:ro'

  # tiny-node-api
  tiny-node-api:
    build:
      context: 'https://github.com/borispulyer/tiny-node-api.git'
      # ... or build from local
      #context: .
      dockerfile: './Dockerfile'
    container_name: 'tiny-node-api'
    restart: 'unless-stopped'
    security_opt:
      - 'no-new-privileges:true'
    healthcheck:
      test:
        - CMD-SHELL
        - >
          node -e "const http=require('http');
          const port=process.env.SERVER_PORT||'3000';
          const req=http.get({host:'127.0.0.1',port:port,path:'/_heartbeat'},res=>process.exit(res.statusCode===200?0:1));
          req.on('error',()=>process.exit(1));
          setTimeout(()=>{try{req.destroy();}catch{} process.exit(1)},2000);"
      interval: 30s
      timeout: 3s
      retries: 5
      start_period: 10s
    volumes:
      - './public:/app/public:ro'
      - './filter:/app/filter:ro'
      - './logs:/app/logs'
    #env_file: ".env"
    environment:
      # Example endpoints (optional):
      ENDPOINTS: >-
        [
          {"enable":true,"path":"/api/v1/users","file":"data/users.yaml","format":"json"},
          {"enable":true,"path":"/api/v1/users/{id}","file":"data/users.yaml","format":"json","filter":"userById.js"}
        ]

networks:
  wan:
    driver: bridge
```

Edit the `nginx.conf`

```nginx
server {
  listen 80;
  server_name _;

  location /api {
    proxy_pass         http://tiny-node-api:3000;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_connect_timeout   5s;
    proxy_send_timeout      60s;
    proxy_read_timeout      60s;
  }
}
```

# Module overview (and how to extend)

This section is for developers who want to extend or maintain the codebase.

## Layout

- **`src/server/`**
  - `server.ts` – HTTP server lifecycle; applies authentication and routes through locations; sets `ETag`/`Last-Modified` where possible.
  - `modules/`
    - `auth.ts` – Auth wrapper around the auth subsystem.
    - `endpoints.ts` – Indexes and matches `ENDPOINTS`; resolves files; runs parser → modifiers → filter → formatter.
    - `filesystem.ts` – Serves files under `SERVER_PATH_PUBLIC`; safe root checking; optional extension resolution.
    - `heartbeat.ts` – Health endpoint.

- **`src/parser/`**
  - `modules/` – `yaml.ts`, `json.ts` with a common `Parser` shape.
  - `parser.ts` – Registry and dispatch; error mapping; helper for supported extensions.

- **`src/modifier/`**
  - `modules/` – `include.ts` (resolves `__include__`/`!include`).
  - `modifier.ts` – Registry and dispatch.

- **`src/formatter/`**
  - `modules/` – `json.ts`, `yaml.ts`, `js.ts`.
  - `formatter.ts` – Registry and dispatch.

- **`src/auth/`**
  - `auth.ts` – JWT verification using JWKS.
  - `errors.ts` – Auth-specific error classes and `WWW-Authenticate` helpers.

- **`src/core/`**
  - `config/` – Types, defaults, env merge, validation.
  - `logger/` – Application/access log setup.
  - `utilities/` – Helpers (`files.ts`, `imports.ts`, `parsers.ts`, `url.ts`, etc.).

## Parsers: shape and extension

**Parser module shape**

```ts
export type Parser = {
  extensions: string[]
  fn: (file: string) => Promise<any>
}
```

**Example: Add TOML support**

1. Install a TOML library (e.g., `toml`).
2. Create `src/parser/modules/toml.ts`:

   ```ts
   import fs from 'node:fs/promises'
   import * as toml from 'toml' // or your chosen lib
   import type { Parser } from '.'

   export default {
     extensions: ['toml'],
     fn: async (file: string) => toml.parse(await fs.readFile(file, 'utf8')),
   } satisfies Parser
   ```

3. Export it from `src/parser/modules/index.ts`:

   ```ts
   export { default as toml } from './toml'
   ```

The registry auto-discovers everything exported from `modules/index.ts`.

**Errors you may see**

- `ParserMissingError` – No parser registered for the file extension.
- `ParserFilereadError` – Read error (e.g., ENOENT).
- `ParserSyntaxError` – Parse exception (JSON.parse, YAML parse, etc.).

## Modifiers: shape and extension

**Modifier module shape**

```ts
export type Modifier = {
  selector: string
  fn: (data: any, options?: any) => Promise<any>
}
```

- The pipeline activates a modifier by name (e.g., `"include"`) when it’s enabled in config.

**Add a new modifier**
Create `src/modifier/modules/myModifier.ts` with the shape above and export it in `src/modifier/modules/index.ts`.

**Errors you may see**

- `ModifierMissingError` – You referenced a modifier that isn’t registered.
- `ModifierFileAccesError` – File access during modification failed.
- `ModifierSyntaxError` – Your modifier created invalid structure or failed on input.
- `ModifierError` – Generic modifier error.

## Formatters: shape and extension

**Formatter module shape**

```ts
export type Formatter = {
  selectors: string[]
  mime: string
  fn: (data: any) => Promise<string>
}
```

**Add a custom output**
Create `src/formatter/modules/toml.ts` and export it. `selectors` are the names you can put into `endpoints[].format` or choose via file extension.

**Errors you may see**

- `FormatterMissingError` – No formatter for the requested output.

## Core utilities worth noting

- **Safe root check**: `isFileWithinRoot(file, id='public')` rejects files outside configured roots. It uses `path.relative` checks. _Note:_ it **does not** dereference symlinks; treat symlink policies carefully at deployment time.
- **Dynamic imports for filters**: `imports.getFilterFn(file)` loads and caches a default-exported function from a filter file (`pathToFileURL` is used to avoid bundling or resolution issues).
- **Env parsers**: flexible boolean/number/port/log-level parsing (strings like `true`, `yes`, `on` are supported).
- **Global error types**
  - `HttpError` – Carries optional `status` and headers for controlled responses.
  - `ConfigurationError` – Thrown when config is invalid (e.g., a formatter/parsers/modifier/auth misconfiguration).
