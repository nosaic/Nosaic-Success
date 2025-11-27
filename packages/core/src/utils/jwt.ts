import * as jose from "jose";

export interface JWTPayload {
	userId: string;
	email: string;
	iat?: number;
	exp?: number;
}

/**
 * Sign JWT access token (15 min expiry)
 */
export async function signAccessToken(
	payload: { userId: string; email: string },
	secret: string,
): Promise<string> {
		const secretKey = new TextEncoder().encode(secret) as Uint8Array;

	return await new jose.SignJWT({
		userId: payload.userId,
		email: payload.email,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(secretKey);
}

/**
 * Verify and decode JWT
 */
export async function verifyToken(
	token: string,
	secret: string,
): Promise<JWTPayload | null> {
	try {
	const secretKey = new TextEncoder().encode(secret) as Uint8Array;
		const { payload } = await jose.jwtVerify(token, secretKey);

		return {
			userId: payload.userId as string,
			email: payload.email as string,
			iat: payload.iat,
			exp: payload.exp,
		};
	} catch {
		return null;
	}
}
