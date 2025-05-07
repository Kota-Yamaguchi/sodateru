#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Finding server file with a relative path from project root
// Note: This path resolution needs to consider behavior when installed as a package
const serverScriptPathStdio = path.resolve(
	__dirname,
	"src/mastra/mcp-server.ts",
);
const serverScriptPathSse = path.resolve(
	__dirname,
	"src/mastra/mcp-server-sse.ts",
);
const argv = yargs(hideBin(process.argv))
	.option("apiKey", {
		// Example: API key argument
		alias: "k",
		type: "string",
		description: "API Key for authentication",
		// Use API_KEY from .env if available
		default: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
	})
	.option("mode", {
		alias: "m",
		type: "string",
		choices: ["stdio", "sse"],
		description: "Server mode (stdio or sse)",
		default: "stdio", // Default is stdio mode
	})
	.option("database", {
		alias: "d",
		type: "string",
		description: "Database type (postgresql or sqlite)",
		default: "postgresql",
	})
	.option("databasePort", {
		alias: "dp",
		type: "number",
		description: "Database port",
		default: 8989,
	})
	.option("databaseUser", {
		alias: "du",
		type: "string",
		description: "Database user",
		default: "user",
	})
	.option("databasePassword", {
		alias: "dpw",
		type: "string",
		description: "Database password",
		default: "password",
	})
	.option("databaseHost", {
		alias: "dh",
		type: "string",
		description: "Database host",
		default: "localhost",
	})
	.option("databaseName", {
		alias: "dn",
		type: "string",
		description: "Database name",
		default: "sodateru",
	})
	.option("mcpConfigFile", {
		alias: "mcf",
		type: "string",
		description: "Path to MCP servers configuration JSON file",
		default: path.join(__dirname, "config/mcp-servers.json"),
	})
	// Add other necessary options as needed
	.env("MCP") // Allow configuration via environment variables like MCP_PORT or MCP_API_KEY
	.help()
	.alias("help", "h")
	.parseSync(); // Parse synchronously
console.log(`Starting MCP server in ${argv.mode} mode...`);
const serverScriptPath =
	argv.mode === "sse" ? serverScriptPathSse : serverScriptPathStdio;
// Pass values from arguments as environment variables to child process
// Prioritize settings via arguments/environment variables over dotenv
const env = {
	...process.env, // Inherit current environment variables
	GOOGLE_GENERATIVE_AI_API_KEY: argv.apiKey || "", // API key and other necessary settings
	DATABASE_TYPE: argv.database,
	DATABASE_PORT: argv.databasePort,
	DATABASE_USER: argv.databaseUser,
	DATABASE_PASSWORD: argv.databasePassword,
	DATABASE_NAME: argv.databaseName,
	DATABASE_HOST: argv.databaseHost,
	// Add other necessary environment variables similarly
	NODE_ENV: process.env.NODE_ENV || "production", // Default is production
};

// MCP設定ファイルの読み込み
const configPath = process.env.MCP_CONFIG_FILE || argv.mcpConfigFile;
try {
	console.log(`Loading MCP configuration from ${configPath}`);
	const json = JSON.parse(fs.readFileSync(configPath, "utf8"));
	env.mcp = JSON.stringify(json); // JSON文字列に変換（改行やエスケープ不要）
	console.log("Loaded MCP configuration successfully");
} catch (err) {
	console.error("Failed to load MCP configuration:", err);
}

// Start tsx command as a child process
const tsxArgs = [
	// '-r', 'dotenv/config', // dotenv might not be needed if we read in cli.ts or pass via args
	serverScriptPath,
	// Add arguments to pass to server-side script if needed
];
const child = spawn("tsx", tsxArgs, {
	stdio: "inherit", // Use parent process's standard I/O
	env: env, // Pass configured environment variables
});
child.on("error", (error) => {
	console.error(`Failed to start server: ${error.message}`);
	process.exit(1);
});
child.on("exit", (code, signal) => {
	if (signal) {
		console.log(`Server process killed with signal: ${signal}`);
	} else if (code !== null) {
		console.log(`Server process exited with code: ${code}`);
	} else {
		console.log("Server process exited.");
	}
	process.exit(code ?? 1); // Exit with child process's exit code
});
