import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { knowledgeAgent } from "./knowledge-agent";

// Tool using Knowledge Agent
export const knowledgeAgentTool = createTool({
	id: "knowledgeAgent",
	description: "Explores related information using knowledge graph to answer complex questions",
	inputSchema: z.object({
		query: z.string().describe("Question for the agent"),
	}),
	outputSchema: z.object({
		response: z.string(),
	}),
	execute: async ({ context }) => {
		try {
			console.log(`🔍 Query to Knowledge Agent: ${context.query}`);

			// Generate response using Knowledge Agent
			const result = await knowledgeAgent.generate(context.query);

			console.log("✅ Received response from Knowledge Agent");

			return {
				response: result.text,
			};
		} catch (error) {
			console.error(
				"❌ Error executing query in Knowledge Agent:",
				error,
			);
			throw error;
		}
	},
});
