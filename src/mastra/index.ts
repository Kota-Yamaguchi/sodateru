import { Mastra } from "@mastra/core";
import { knowledgeAgent } from "./agents";
import { knowledgeTools } from "./tool";

export { knowledgeAgent, knowledgeTools };
export const mastra = new Mastra({
	agents: { knowledgeAgent },
});
