import {
  createPublicKey,
  verify as verifySignature,
  type JsonWebKey,
} from "node:crypto";

export interface AdminJwtClaims {
  iss?: string;
  sub?: string;
  exp?: number;
  nbf?: number;
  token_use?: string;
  client_id?: string;
}
interface JwkSet {
  keys: Array<JsonWebKey & { kid?: string; use?: string }>;
}
const jwksCache = new Map<string, { keys: JwkSet; fetchedAt: number }>();
const JWKS_TTL_MS = 60 * 60 * 1000;

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function getSigningKey(
  kid: string,
  issuer: string,
  forceRefresh = false,
) {
  const cached = jwksCache.get(issuer);
  if (forceRefresh || !cached || Date.now() - cached.fetchedAt > JWKS_TTL_MS) {
    const response = await fetch(
      `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok)
      throw new Error("Unable to load admin identity signing keys");
    const keys = (await response.json()) as JwkSet;
    if (!Array.isArray(keys.keys))
      throw new Error("Invalid admin identity signing key set");
    jwksCache.set(issuer, { keys, fetchedAt: Date.now() });
  }
  const jwk = jwksCache
    .get(issuer)
    ?.keys.keys.find((key) => key.kid === kid && key.use !== "enc");
  if (!jwk) {
    if (!forceRefresh) return getSigningKey(kid, issuer, true);
    throw new Error(
      "Signing key ID was not found in the identity provider key set",
    );
  }
  return createPublicKey({ key: jwk as never, format: "jwk" });
}

export async function verifyAdminAccessToken(
  token: string,
): Promise<AdminJwtClaims> {
  const issuer = process.env.ADMIN_OIDC_ISSUER;
  const audience = process.env.ADMIN_OIDC_AUDIENCE;
  if (!issuer || !audience)
    throw new Error("Admin identity provider is not configured");
  if (!issuer.startsWith("https://"))
    throw new Error("Admin identity issuer must use HTTPS");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part))
    throw new Error("Malformed access token");
  const header = decodePart<{ alg?: string; kid?: string }>(parts[0]!);
  if (header.alg !== "RS256" || !header.kid)
    throw new Error("Unsupported access token");
  const claims = decodePart<AdminJwtClaims>(parts[1]!);
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== issuer || claims.token_use !== "access")
    throw new Error("Invalid access token issuer or type");
  if (!claims.sub || !claims.exp || claims.exp <= now)
    throw new Error("Expired or incomplete access token");
  if (claims.nbf !== undefined && claims.nbf > now)
    throw new Error("Access token is not active yet");
  if (claims.client_id !== audience)
    throw new Error("Access token was issued to another client");
  const key = await getSigningKey(header.kid, issuer);
  const valid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    Buffer.from(parts[2]!, "base64url"),
  );
  if (!valid) throw new Error("Invalid access token signature");
  return claims;
}
