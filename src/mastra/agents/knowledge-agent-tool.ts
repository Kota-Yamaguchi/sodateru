import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { knowledgeAgent } from "./knowledge-agent";

// Tool using Knowledge Agent
export const knowledgeAgentTool = createTool({
	id: "knowledgeAgent",
	description: `
	this tool is used to answer questions using the knowledge agent.
	IMPORTANT: This tool MUST be used whenever domain-specific knowledge is required. It functions as the primary repository for accumulating and storing LLM knowledge that can be accessed and updated over time.
	`,
	inputSchema: z.object({
		query: z.string().describe("Question for the agent"),
	}),
	outputSchema: z.object({
		response: z.string(),
	}),
	execute: async ({ context }) => {
		try {
			console.log(`🔍 Query to Knowledge Agent: ${context.query}`);

			// Create agent with MCP tools
			const agent = await knowledgeAgent();

			// Generate response using the agent
			const result = await agent.generate(context.query, {
				maxSteps: 25,
			});

			console.log("✅ Received response from Knowledge Agent with MCP tools");

			return {
				response: result.text,
			};
		} catch (error) {
			console.error("❌ Error executing query in Knowledge Agent:", error);
			return {
				response: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	},
});
