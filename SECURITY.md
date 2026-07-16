# Security policy

## Browser configuration

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are bundled into the extension
and dashboard. Only use Supabase's publishable browser key. Never use a
service-role key, database password, marketplace credential, or other secret in
a `VITE_*` variable.

Supabase Row Level Security is the actual authorization boundary. Before using
the project:

- enable RLS on every application table;
- restrict listing and media access to the authenticated owner;
- add equivalent policies to the `mb_photos` and `mb_videos` storage buckets;
- keep administrative profile operations behind explicit admin policies; and
- test policies with two separate non-admin accounts.

## Extension permissions

The production manifest does not request Chrome's `cookies` permission and the
extension does not need marketplace passwords or session tokens. Content scripts
run only on the marketplace host patterns declared in `manifest.json`.

Marketplace Helper fills forms but does not click the final Post button. Do not modify or
distribute it as an unattended posting bot without reviewing platform rules,
abuse controls, and user-consent requirements.

The optional HEIC conversion endpoint accepts unauthenticated image-processing
requests. Add deployment-level authentication, rate limiting, monitoring, and a
restricted CORS policy before operating it as a public service.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature for this repository. Include
the affected extension version, browser, reproduction steps, and impact. Do not
include real marketplace credentials, Supabase service keys, or customer data in
the report.
