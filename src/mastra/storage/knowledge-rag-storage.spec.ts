import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { embeddingDimension } from "../config";
import { KnowledgeRagStorage } from "./knowledge-rag-storage";

describe("KnowledgeRagStorage", () => {
	beforeEach(() => {
		// Set dummy environment variables before test execution
		vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-api-key");
	});

	afterEach(async () => {
		// Remove environment variable stubs after test execution
		vi.unstubAllEnvs();
		const storage = await KnowledgeRagStorage.initialize();
		const result = await storage.delete();
		if (result.success) {
			console.log("GraphRagStorage: Test data deleted");
		} else {
			console.error("GraphRagStorage: Failed to delete test data");
		}
	});

	it("should be able to add after add", async () => {
		const storage = await KnowledgeRagStorage.initialize();
		const chunks = [
			{
				id: "1",
				text: "test",
				metadata: {
					"0": {
						sectionSummary:
							'No information was provided to summarize.  The only word present is "korekara," which is Japanese and translates roughly to "from now on" or "after this."  Therefore, no meaningful summary can be created beyond noting the presence of this word.',
						excerptKeywords:
							"KEYWORDS: korekara, Japanese, translates, from now on, after this",
					},
					chunkIndex: 0,
					docIdPrefix: "doc-1746152389686-0",
				},
			},
			{
				id: "2",
				text: "test2",
				metadata: {
					"0": {
						sectionSummary:
							'No information was provided to summarize.  The only word present is "korekara," which is Japanese and translates roughly to "from now on" or "after this."  Therefore, no meaningful summary can be created beyond noting the presence of this word.',
						excerptKeywords:
							"KEYWORDS: korekara, Japanese, translates, from now on, after this",
					},
					chunkIndex: 0,
					docIdPrefix: "doc-1746152389686-0",
				},
			},
		];
		const embeddings = [
			{
				id: "1",
				vector: Array(embeddingDimension).fill(1),
			},
			{
				id: "2",
				vector: Array(embeddingDimension).fill(2),
			},
		];
		await storage.upsert(chunks, embeddings);
		const graphlist = await storage.list();
		const nodeCount = graphlist.nodeCount;
		expect(graphlist.success).toBe(true);
		expect(nodeCount).toBe(2);

		const newChunks = [
			{
				id: "3",
				text: "test3",
				metadata: { source: "test3" },
			},
		];
		const newEmbeddings = [
			{
				id: "3",
				vector: Array(embeddingDimension).fill(3),
			},
		];
		await storage.upsert(newChunks, newEmbeddings);
		const newGraphlist = await storage.list();
		expect(newGraphlist.success).toBe(true);
		expect(newGraphlist.nodeCount - nodeCount).toBe(1);
	});
});
