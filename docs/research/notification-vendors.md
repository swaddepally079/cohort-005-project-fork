# In-app notification vendors for Cadence

Research for [#7](https://github.com/swaddepally079/cohort-005-project-fork/issues/7). Gathered 2026-11-20 from vendor docs, pricing pages and the npm registry. This surfaces facts for the decision and does not pick a vendor.

Cadence's stack: React 19.2, React Router 8.3, Tailwind 4, shadcn/ui components in `app/components/ui/`. Email already has an offline path: `app/lib/mailer.server.ts` writes each message to `.outbox/` as JSON when `POSTMARK_SERVER_TOKEN` is unset.

## Summary

| | Knock | Novu | MagicBell | Courier | SuprSend |
|---|---|---|---|---|---|
| React package (latest) | `@knocklabs/react` 0.15.1 | `@novu/react` 3.20.0 | `@magicbell/react` 1.14.0 | `@trycourier/courier-react` 9.3.5 | `@suprsend/react` 1.6.0 |
| React 19 in peer deps | Yes (`^17 \|\| ^18 \|\| ^19`) | Yes (`^18 \|\| ^19`) | No peer deps declared | `>=18.0.0` (docs say "React 18+") | `>= 16.8.0` |
| Headless hooks (to render with shadcn) | Yes | Yes | None documented | Yes (`useCourier()`) | Yes (documented as "headless implementation") |
| Prebuilt UI accepts Tailwind classes | No; `--rnf-` CSS vars and `rnf-` classes | Yes; `appearance.elements` takes Tailwind class strings | No; `--magicbell-` CSS vars and classes | Theme objects; CSS/Tailwind not documented | Not documented |
| Node trigger SDK | `@knocklabs/node` | `@novu/api` (`serverURL` option) | `magicbell-js` | `@trycourier/courier` | `@suprsend/node-sdk` |
| Recipient = your user ID, upserted on trigger | Yes (inline identification) | Yes (`subscriberId`, created "just in time") | Yes (`external_id` or email, upsert) | Yes (user ID you choose) | Yes (`distinct_id`) |
| Client auth | Public key + `user.id`; `userToken` JWT in enhanced security mode | `subscriberId` + `subscriberHash` (HMAC-SHA256) | User JWT from your backend | JWT minted by `POST /auth/issue-token` | Signed JWT user token |
| Free tier | 10,000 messages/mo | 10,000 workflow runs/mo | 1,000 deliveries/mo | 10,000 sends/mo | 10,000 notifications/mo |
| First paid tier | Starter $250/mo | Pro from $30/mo (30k runs) | Startup $249/mo (50k) | $0.005/send, pay as you go | Essentials $100/mo (50k) |
| **Offline dev/tests with no vendor account or network** | **Fail** | **Pass, with caveats** (self-host the MIT community edition in Docker) | **Fail** | **Fail** | **Fail** (self-hosting is Enterprise-only and needs Kubernetes) |

## Hard criterion: dev and tests without a vendor account or network

Only Novu offers a way to run the whole system with no vendor account or network.

- **Novu: passes, with caveats.** The core is MIT-licensed; only the `enterprise` folder is under a commercial licence ([repo README](https://github.com/novuhq/novu)). The community Docker setup runs the API, worker, WebSocket service and dashboard, plus MongoDB and Redis, on `localhost:4000` ([self-hosting docs](https://docs.novu.co/community/self-hosting-novu/deploy-with-docker)). Both SDKs can point at it: the Node SDK takes `serverURL` and `<Inbox>` takes `backendUrl` and `socketUrl`. Caveats from the same page:
  - Dev and CI would need Docker running MongoDB and Redis. That is much heavier than `.outbox/`.
  - Attachments need an object-storage bucket. The community compose file does not start one.
  - Workflows still have to be created inside that local instance.
  - Novu's pricing page lists self-hosting under Enterprise. That refers to the supported on-prem offering ([pricing](https://novu.co/pricing)), not the community edition.
- **Knock: fails.** Testing runs only on Knock's hosted service. The docs offer a dashboard test runner, a "sandbox mode" that previews without delivering ("Knock still runs the workflow"), `settings.sandbox_mode` and `skip_delay` on the trigger API, and `knock workflow run` in the CLI. They describe no emulator or mock mode ([testing workflows](https://docs.knock.app/send-notifications/testing-workflows.md)). Two partial aids:
  - `KnockProvider` has `enabled={false}`, which keeps the client idle with no requests or websocket.
  - `KnockProvider` also has a `host` prop to override the API URL ([KnockProvider](https://docs.knock.app/in-app-ui/react/sdk/components/knock-provider.md)).
  - Neither gives you a working local feed.
- **Courier: fails.** It offers per-environment keys and recommends starting with the Test environment. Both are hosted, and the docs mention no mock mode ([inbox auth](https://www.courier.com/docs/platform/inbox/authentication)). `signIn` accepts `apiUrls`, but its shape is not documented ([React SDK](https://www.courier.com/docs/sdk-libraries/courier-react-web)).
- **MagicBell: fails.** The docs show no offline mode, self-hosting or custom server URL ([React library](https://www.magicbell.com/docs/libraries/react)).
- **SuprSend: fails.** Self-hosting is "supported under the Enterprise plan" with a licence. It requires Kubernetes 1.29+, PostgreSQL 17+, ClickHouse, two Redis stores and NATS, and the docs describe no local Docker setup ([self-hosted intro](https://docs.suprsend.com/docs/self-hosted/introduction.md)). The free plan does not stop processing over its limit, but it is still hosted ([pricing](https://www.suprsend.com/pricing)).

**What this means for vendors that fail.** Cadence could match the email pattern by writing triggers to a local transport, such as `.outbox/` or a SQLite table, whenever no key is set. That makes the server side testable for any vendor. The client side is the harder part, because the vendors' prebuilt feeds read from the vendor's API. Rendering a feed offline would mean building the UI on Cadence's own components and swapping the data source. Knock, Novu, Courier and SuprSend document headless hooks for that. MagicBell's React docs list only prebuilt components.

## React feed and inbox fit (shadcn/ui, Tailwind, React 19)

- **Knock.** `@knocklabs/react` ships `NotificationFeedPopover`, `NotificationFeed` and `NotificationIconButton`, plus headless hooks ([overview](https://docs.knock.app/in-app-ui/react/overview)):
  - `KnockProvider` creates the client.
  - `useKnockClient` returns that client.
  - `useNotifications(client, channelId)` creates the feed.
  - `useNotificationStore(feed)` exposes `items` and `metadata.unread_count`.
  - The hooks do not mark items as seen; you call `markAllAsSeen` or `markAsSeen` yourself ([custom UI](https://docs.knock.app/in-app-ui/react/custom-notifications-ui)).
  - Prebuilt styling uses `--rnf-` CSS variables and `rnf-` classes, and the docs do not mention Tailwind ([styling](https://docs.knock.app/in-app-ui/feeds/styling.md)).
  - Peer deps allow React 19 and list optional `next` and `@tanstack/react-router`; React Router is not among them (npm registry).
- **Novu.** `@novu/react` ships the prebuilt `<Inbox />` plus hooks; `@novu/js` is framework-agnostic ([inbox overview](https://docs.novu.co/platform/inbox/overview)).
  - The `appearance` prop takes `baseTheme`, `variables`, `elements`, `icons` and `animations`.
  - `elements` values can be Tailwind class strings or callbacks that return class strings ([styling](https://docs.novu.co/platform/inbox/configuration/styling)).
  - Of the five, this is the closest prebuilt fit for Tailwind and shadcn tokens.
  - Peer deps: React `^18 || ^19`.
- **MagicBell.** `@magicbell/react` ships `Inbox`, `FloatingInbox`, `InlineNotification`, `ToastContainer`, `UserPreferences` and others.
  - Styling is an importable stylesheet with `--magicbell-*` variables and `.magicbell--*` classes, and the docs mention no headless hooks ([React library](https://www.magicbell.com/docs/libraries/react)).
  - The package declares no React peer dependency.
- **Courier.** `@trycourier/courier-react` covers React 18+, with `@trycourier/courier-react-17` for React 17.
  - Theming is through `CourierInboxTheme` objects shared with the web components.
  - `useCourier()` exposes `auth`, `inbox`, `toast` and `preferences` for a headless build ([React SDK](https://www.courier.com/docs/sdk-libraries/courier-react-web)).
  - React 19 is not stated in the docs, but the peer range `>=18.0.0` allows it.
- **SuprSend.** `@suprsend/react` replaces the end-of-support `@suprsend/react-inbox` and offers both drop-in components and a headless implementation ([inbox React](https://docs.suprsend.com/docs/inbox-react)).
  - The page does not cover theming or Tailwind.

## Triggering from a Node server (loader or action)

Every vendor has a Node SDK that runs inside a React Router `action`:

- `@knocklabs/node` (Apache-2.0)
- `@novu/api`, which accepts `serverURL` for a self-hosted instance
- `magicbell-js`, generated from MagicBell's OpenAPI spec
- `@trycourier/courier` (Apache-2.0), with `client.send.message`
- `@suprsend/node-sdk` (MIT), with `POST /trigger/` ([trigger API](https://docs.suprsend.com/reference/trigger-workflow-api.md))

All except MagicBell model a dashboard-defined "workflow" or template that the server triggers by key. Versions and licences come from the npm registry.

## Mapping Cadence users to recipients (and DevUI user switching)

All five vendors key recipients on an ID that Cadence chooses, so `users.id` can map one-to-one:

- **Knock:** recommends "your internal identifier" as the user `id`, which cannot change once set ([users](https://docs.knock.app/concepts/users)). Inline identification upserts `{ id, name, email }` recipients on trigger. Recipients must be objects, not ID strings ([identifying recipients](https://docs.knock.app/managing-recipients/identifying-recipients.md)).
- **Novu:** "Use your application's internal user ID as the `subscriberId`". Subscribers are created "just in time" from the trigger's `to` ([subscribers](https://docs.novu.co/platform/concepts/subscribers)). The Inbox authenticates with `subscriberHash = HMAC-SHA256(secretKey, subscriberId)` ([production guide](https://docs.novu.co/platform/inbox/prepare-for-production)).
- **MagicBell:** uses `external_id` or email, and recommends `external_id`, which cannot be changed once set. Users are upserted ([user primitive](https://www.magicbell.com/docs/primitive/user)). The React SDK needs a user JWT passed as `token`, generated on your backend from the project API key and secret ([auth](https://www.magicbell.com/docs/api/authentication)).
- **Courier:** "Use whatever your app already calls this user". Your backend mints a JWT scoped `user_id:<id> inbox:read:messages inbox:write:events`, and the client calls `signIn({ userId, jwt })`. Without `expires_in`, the token never expires ([inbox auth](https://www.courier.com/docs/platform/inbox/authentication)).
- **SuprSend:** inbox auth moved from HMAC to "signed JWT user tokens" ([inbox React](https://docs.suprsend.com/docs/inbox-react)).

**Switching test users in the DevUI panel.** Every vendor derives client auth (HMAC or JWT) from the server session's user ID. A user switch therefore means re-issuing the hash or token in the root loader and remounting the provider with the new user. No vendor documents a special mechanism for impersonation or test users.

## Pricing at small volume

| Vendor | Free | Next step | Unit |
|---|---|---|---|
| Knock | 10,000/mo | Starter $250/mo + usage | message = one user on one channel; in-app + email from one trigger counts as 2 ([pricing](https://knock.app/pricing)) |
| Novu | 10,000/mo; 5 workflows, 3 team members, 24h activity retention | Pro from $30/mo (30k), $1.20 per 1K over | workflow run ([pricing](https://novu.co/pricing)) |
| MagicBell | 1,000/mo, 1 project | Startup $249/mo (50k), $0.0025 per extra | delivery, counted per channel ([pricing](https://www.magicbell.com/pricing)) |
| Courier | 10,000/mo | Business $0.005/send from the first send (50k = $250) | send ([pricing](https://www.courier.com/pricing)) |
| SuprSend | 10,000/mo, no card, not cut off over the limit | Essentials $100/mo (50k), $2 per 1K over | notification ([pricing](https://www.suprsend.com/pricing)) |

## Open questions

- The Knock and Courier docs do not show whether their `host` and `apiUrls` overrides could point at a local fake server.
- Whether Novu's `npx novu dev` local Studio works without a Novu Cloud account is not confirmed. The self-hosting page calls it a dev tunnel.
- The current MagicBell v2 JWT claim spec is not on the pages fetched.
