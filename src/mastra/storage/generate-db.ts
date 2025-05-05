import { Client } from "pg";
import { DATABASE_NAME, dbUrl } from "../config";
export async function ensureDatabase() {
	const dbName = DATABASE_NAME; // Example: newdb
	const adminUrl = dbUrl.replace(`/${dbName}`, "/postgres"); // Connect to postgres DB
	const client = new Client({ connectionString: adminUrl });

	await client.connect();
	const res = await client.query(
		"SELECT 1 FROM pg_database WHERE datname = $1",
		[dbName],
	);
	if (res.rowCount === 0) {
		await client.query(`CREATE DATABASE "${dbName}"`);
		console.log(`✅ Database "${dbName}" created`);
	} else {
		console.log(`ℹ️ Database "${dbName}" already exists`);
	}
	await client.end();
}
