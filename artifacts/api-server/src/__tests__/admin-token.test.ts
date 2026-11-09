import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyAdminAccessToken } from "../lib/admin-token.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "kiosk-admin-test-key",
  use: "sig",
};
let issuerSequence = 0;

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeToken(
  overrides: Record<string, unknown> = {},
  signingKey = privateKey,
) {
  const issuer = `https://cognito-test-${++issuerSequence}.example.com`;
  process.env.ADMIN_OIDC_ISSUER = issuer;
  process.env.ADMIN_OIDC_AUDIENCE = "kiosk-admin-client";
  const header = encode({ alg: "RS256", kid: jwk.kid, typ: "JWT" });
  const payload = encode({
    iss: issuer,
    sub: "admin-subject-123",
    exp: Math.floor(Date.now() / 1000) + 300,
    token_use: "access",
    client_id: "kiosk-admin-client",
    ...overrides,
  });
  const input = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(input), signingKey).toString(
    "base64url",
  );
  return { issuer, token: `${input}.${signature}` };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cognito admin access-token verification", () => {
  it("accepts a valid RS256 access token issued to the configured app client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ keys: [jwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const { token } = makeToken();
    await expect(verifyAdminAccessToken(token)).resolves.toMatchObject({
      sub: "admin-subject-123",
      token_use: "access",
      client_id: "kiosk-admin-client",
    });
  });

  it("rejects a token with the wrong issuer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
    );
    const { token } = makeToken({ iss: "https://attacker.example.com" });
    await expect(verifyAdminAccessToken(token)).rejects.toThrow(
      "issuer or type",
    );
  });

  it("rejects an ID token or other token type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
    );
    const { token } = makeToken({ token_use: "id" });
    await expect(verifyAdminAccessToken(token)).rejects.toThrow(
      "issuer or type",
    );
  });

  it("rejects a token issued to a different Cognito app client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
    );
    const { token } = makeToken({ client_id: "another-client" });
    await expect(verifyAdminAccessToken(token)).rejects.toThrow(
      "another client",
    );
  });

  it("rejects expired and not-yet-active tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
    );
    const expired = makeToken({ exp: Math.floor(Date.now() / 1000) - 1 });
    await expect(verifyAdminAccessToken(expired.token)).rejects.toThrow(
      "Expired",
    );
    const inactive = makeToken({ nbf: Math.floor(Date.now() / 1000) + 60 });
    await expect(verifyAdminAccessToken(inactive.token)).rejects.toThrow(
      "not active",
    );
  });

  it("rejects a token with an invalid signature", async () => {
    const other = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    }).privateKey;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
    );
    const { token } = makeToken({}, other);
    await expect(verifyAdminAccessToken(token)).rejects.toThrow("signature");
  });

  it("refreshes the JWKS once when a key ID is not in the cached key set", async () => {
    const calls = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls();
        return new Response(
          JSON.stringify({ keys: calls.mock.calls.length === 1 ? [] : [jwk] }),
          { status: 200 },
        );
      }),
    );
    const { token } = makeToken();
    await expect(verifyAdminAccessToken(token)).resolves.toMatchObject({
      sub: "admin-subject-123",
    });
    expect(calls).toHaveBeenCalledTimes(2);
  });
});
