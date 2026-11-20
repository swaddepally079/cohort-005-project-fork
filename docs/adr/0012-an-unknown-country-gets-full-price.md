# An unknown country gets full price, and no page waits on a geo lookup

Purchasing-power prices depend on the buyer's country. `resolveCountry` takes it only from what the request already carries (the `CF-IPCountry` header, or the dev override), and when it is missing the buyer pays full price. We used to look the address up on ip-api.com instead (ADR-0008), but that put a network call in front of the course list, the purchase page and every lesson page for a discounted purchase, over plain HTTP and capped at 45 requests a minute.

## Considered Options

- **Look the address up on ip-api.com.** Rejected: page latency, an unencrypted endpoint, and a rate limit we would hit under load.
- **Bundle a MaxMind GeoLite2 database.** Rejected: it needs a licence key, a download of tens of megabytes, and an update every month.

## Consequences

A Student whose request does not come through Cloudflare is charged full price even when they live somewhere purchasing-power pricing is for. Do not add a lookup back to `resolveCountry` without revisiting this.
