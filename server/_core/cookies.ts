import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Extract parent domain for cookie sharing across subdomains.
 * e.g., "3000-xxx.manuspre.computer" -> ".manuspre.computer"
 * This allows cookies set by 3000-xxx to be read by 8081-xxx
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // Need at least 3 parts for a subdomain (e.g., "3000-xxx.manuspre.computer")
  // For "manuspre.computer", we can't set a parent domain
  if (parts.length < 3) {
    return undefined;
  }

  // Return parent domain with leading dot (e.g., ".manuspre.computer")
  // This allows cookie to be shared across all subdomains
  return "." + parts.slice(-2).join(".");
}

/**
 * Configuration for subdomain cookie sharing
 * Set ENABLE_SUBDOMAIN_COOKIES=true to share cookies across subdomains in production
 * WARNING: Only enable this if you control all subdomains (e.g., api.example.com and app.example.com)
 */
const ENABLE_SUBDOMAIN_COOKIES = process.env.ENABLE_SUBDOMAIN_COOKIES === "true";

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;

  // Determine if we should use parent domain for subdomain sharing
  // In development: Always enable for convenience (e.g., 3000-xxx.manuspre.computer <-> 8081-xxx.manuspre.computer)
  // In production: Only if explicitly enabled AND hostname has subdomains
  const shouldShareSubdomains =
    process.env.NODE_ENV === "development" || ENABLE_SUBDOMAIN_COOKIES;

  const domain = shouldShareSubdomains
    ? getParentDomain(hostname)
    : undefined;

  // Use strict sameSite policy to prevent CSRF attacks
  // This is critical when domain attribute is set
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: isSecureRequest(req),
  };
}
