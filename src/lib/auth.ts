import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function signAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret);
}
export async function verifyAdminToken(token?: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}
