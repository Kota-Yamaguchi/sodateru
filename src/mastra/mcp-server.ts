import * as dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "node:url";
import { MCPServer } from "@mastra/mcp";
import { knowledgeAgentTool } from "./agents";
import { upsertKnowledgeTool } from "./tool";
const __filename = fileURLToPath(import.meta.url);
const isDirectlyExecuted = process.argv[1] === __filename;

const server = new MCPServer({
	name: "@sodateru",
	version: "1.0.0",
	tools: {
		upsertKnowledgeTool,
		knowledgeAgentTool,
	},
});

async function main() {
	try {
		console.log("📡 Starting MCP server...");
		await server.startStdio();
		console.log("✅ MCP server started");
	} catch (error) {
		console.error("❌ Error starting MCP server:", error);
		process.exit(1);
	}
}

if (isDirectlyExecuted) {
	main();
}

export { server };
