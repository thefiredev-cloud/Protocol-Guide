import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import { getAccessToken } from "@/lib/token-cache";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  const apiBaseUrl = getApiBaseUrl();
  const trpcUrl = `${apiBaseUrl}/api/trpc`;

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: trpcUrl,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const headers: Record<string, string> = {};

          // Add Authorization header if we have an access token
          const accessToken = await getAccessToken();
          if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
          }

          // Add CSRF token from cookie (double-submit pattern)
          // The CSRF cookie is set with httpOnly:false so JavaScript can read it
          if (typeof document !== "undefined") {
            const csrfToken = document.cookie
              .split("; ")
              .find((row) => row.startsWith("csrf_token="))
              ?.split("=")[1];

            if (csrfToken) {
              headers["x-csrf-token"] = csrfToken;
            }
          }

          return headers;
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
