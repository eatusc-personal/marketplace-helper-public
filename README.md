# Marketplace Helper

[![CI](https://github.com/eatusc/marketplace-helper-public/actions/workflows/ci.yml/badge.svg)](https://github.com/eatusc/marketplace-helper-public/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A multi-platform Chrome extension for creating a marketplace listing once and
transferring its fields and photos into Facebook Marketplace, Craigslist, and
Nextdoor forms.

> This is a standalone public demo. It contains no hosted backend credentials,
> production database contents, customer records, or deployable environment
> files. Connect only a Supabase project that you own and have secured.

Marketplace Helper is deliberately user-controlled: it fills the form, shows the result,
and leaves the final review and **Post** action to the seller.

## Engineering highlights

- Manifest V3 extension with a React/TypeScript side panel
- modular content-script adapters for three marketplace DOMs
- Chrome tabs, scripting, side-panel, and message-passing APIs
- authenticated listing and media storage with Supabase
- multi-platform category mapping and condition normalization
- browser-side image compression and photo transfer through `File` and
  `DataTransfer` APIs
- optional location lookup through browser geolocation and OpenStreetMap
- companion React administration dashboard
- optional HEIC-to-JPEG conversion endpoint

## Supported workflows

| Platform | Listing fields | Photos | Navigation assistance | Final submission |
|---|---:|---:|---:|---:|
| Facebook Marketplace | Yes | Yes | Yes | User |
| Craigslist | Yes | Yes | Yes | User |
| Nextdoor | Yes | Yes | Yes | User |

Marketplace DOMs change frequently. The platform adapters use layered selectors
and return field-level results so failures are visible instead of silently
submitting incomplete data.

## Architecture

```text
React side panel
  ├── Supabase Auth
  ├── Listings, categories, conditions, photos
  └── chrome.tabs.sendMessage(...)
                    │
                    v
Generated Manifest V3 content script
  ├── shared DOM and file utilities
  ├── Facebook adapter
  ├── Craigslist adapter
  └── Nextdoor adapter
                    │
                    v
Marketplace form (user reviews and submits)

Companion web dashboard ──> same Supabase project
```

The checked-in source remains modular under [`src/platforms`](src/platforms).
During a build, [`scripts/build-content.js`](scripts/build-content.js) combines
the adapters into `.generated/content.ts`, then TypeScript emits the browser
content script to `dist/content.js`. Generated output is not committed, so a
build does not modify source-controlled files.

## Repository layout

```text
popup/                 React extension side panel
src/platforms/         Facebook, Craigslist, and Nextdoor adapters
src/shared/            shared DOM, platform, and photo utilities
src/background.ts      minimal Manifest V3 service worker
scripts/               deterministic content-script build
Website/               companion React administration dashboard
Website/api/           optional HEIC conversion endpoint and local test server
manifest.json          Chrome permissions and supported host patterns
```

## Local setup

### Prerequisites

- Node.js 20.19 or newer
- Chrome or another Chromium browser with Manifest V3 support
- a Supabase project with authentication, database tables, storage buckets, and
  Row Level Security policies configured

### 1. Install dependencies

```bash
git clone https://github.com/eatusc/marketplace-helper-public.git
cd marketplace-helper-public
npm install
npm install --prefix Website
```

### 2. Configure Supabase

```bash
cp .env.example .env.local
cp Website/.env.example Website/.env.local
```

Set these publishable browser values in both files:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_anon_key
VITE_EMAIL_REDIRECT_URL=https://example.com/verify/email.html
VITE_HEIC_CONVERTER_URL=https://example.com/api/convert-heic
```

Never use a Supabase service-role key in a `VITE_*` variable. Vite embeds those
values into browser code. The publishable key is expected to be visible, so
database and storage access must be protected with Supabase Row Level Security.

The current data model uses:

- `profiles`
- `mb_listings`
- `mb_photos`
- `mb_videos`
- `mb_categories`
- `mb_category_type`
- `mb_conditions`
- `mb_locations`
- `mb_photos` and `mb_videos` storage buckets

At minimum, listing and media policies should restrict writes and private reads
to the authenticated owner. Category, condition, and location reference data can
be read-only for authenticated users.

### 3. Build and load the extension

```bash
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's `dist` directory.

Click the extension icon to open the side panel.

## Development

```bash
npm run dev          # extension UI development
npm test             # platform utility tests
npm run build        # type-check and build the extension
npm run build:web    # type-check and build the companion dashboard
npm run check:all    # tests plus both production builds
```

The project uses Vite 8, TypeScript, React, Vitest, and the Chrome extension type
definitions. CI runs `npm ci`, the tests, both builds, and high-severity npm audit
checks for the extension and dashboard.

## Extension permissions

The manifest requests only the capabilities used by the active product:

| Permission | Reason |
|---|---|
| `activeTab`, `tabs` | detect and navigate the marketplace tab selected by the user |
| `scripting` | recover the declared content script when a marketplace page changes or reloads |
| `sidePanel` | keep the listing manager available beside marketplace forms |
| `geolocation` | optionally suggest the user's city or area |
| host permissions | run only on supported marketplaces, configured Supabase projects, and OpenStreetMap lookup |

The extension does not request Chrome's `cookies` permission, does not collect
marketplace passwords or session tokens, and does not automatically submit a
listing.

## Companion dashboard

[`Website/`](Website/) provides a larger administration interface for listings,
photos, users, and reference data.

```bash
npm run dev --prefix Website
```

The dashboard defaults to [http://localhost:3000](http://localhost:3000). It uses
the same Supabase browser configuration and therefore the same RLS boundary as
the extension.

## Optional HEIC conversion API

The files under [`Website/api`](Website/api) provide an optional conversion
endpoint for browsers that cannot decode a HEIC image directly. It accepts image
data, converts it to JPEG, and does not persist the source file.

```bash
npm run api --prefix Website
```

See [`Website/api/README.md`](Website/api/README.md) for the endpoint contract.

## Known limitations

- marketplace interfaces can change without notice and may require selector
  updates;
- Facebook category selection may still require a final manual choice because
  its category taxonomy is more granular;
- third-party marketplace terms and extension-store policies remain the
  operator's responsibility;
- marketplace and service names are used only to describe compatibility; this
  project is not affiliated with Facebook, Craigslist, Nextdoor, Supabase, or
  Vercel;
- the project does not bypass marketplace authentication, rate limits, or final
  user confirmation.

## Security and privacy

Review [`SECURITY.md`](SECURITY.md) before connecting a Supabase project or
distributing a build. The companion dashboard privacy policy is available at
[`Website/public/privacy.html`](Website/public/privacy.html).

## License

[MIT](LICENSE)
