import { Mastra } from "@mastra/core";
import { knowledgeAgent } from "./agents";
import { knowledgeTools } from "./tool";

export { knowledgeAgent, knowledgeTools };
export const mastra: Mastra = new Mastra({
	agents: { knowledge: await knowledgeAgent() },
});
