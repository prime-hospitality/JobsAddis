let depth = 0;

export function isSilentFetch() {
  return depth > 0;
}

function headerNames(headers: HeadersInit): string[] {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return [...headers.keys()];
  }
  if (Array.isArray(headers)) return headers.map(([name]) => name);
  return Object.keys(headers);
}

/**
 * Next.js client navigations and route prefetches are plain `fetch` calls, so
 * they trip GlobalFetchInterceptor exactly like a data request would — which
 * meant a full-screen overlay on every sidebar click of a route-based dashboard
 * (every employer route takes >300ms to render, so it fired every time). They
 * carry an `rsc` header and a `?_rsc=` cache-busting param; route segments have
 * their own loading.tsx for this, so leave navigation alone.
 *
 * Server actions carry `next-action` instead and are deliberately NOT matched —
 * those are the real user-triggered waits the overlay exists for.
 */
export function isRouteNavigation(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  if (headers) {
    for (const name of headerNames(headers)) {
      const lower = name.toLowerCase();
      if (lower === "rsc" || lower === "next-router-prefetch") return true;
    }
  }

  const url =
    typeof input === "string" ? input
    : input instanceof URL ? input.href
    : input instanceof Request ? input.url
    : "";
  return url.includes("_rsc=");
}

export async function runSilently<T>(fn: () => Promise<T>): Promise<T> {
  depth++;
  try {
    return await fn();
  } finally {
    depth--;
  }
}
