export async function getUserById(db: D1Database, userId: string): Promise<Record<string, unknown> | null> {
	return await db
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(userId)
		.first();
}

export async function getWorkflowConfig(db: D1Database, userId: string): Promise<Record<string, unknown> | null> {
	return await db
		.prepare("SELECT * FROM workflow_configs WHERE user_id = ?")
		.bind(userId)
		.first();
}

export async function cleanExpiredSessions(db: D1Database) {
	return await db
		.prepare("DELETE FROM sessions WHERE expires_at < ?")
		.bind(Date.now())
		.run();
}
