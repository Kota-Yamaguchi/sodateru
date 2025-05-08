import { createTool } from "@mastra/core/tools";
import { MDocument } from "@mastra/rag";
import { embed, embedMany } from "ai";
import { z } from "zod";
import { embeddingModel, google } from "../config";
import { KnowledgeRagStorage } from "../storage/knowledge-rag-storage";

const knowledgeStorage = await KnowledgeRagStorage.initialize();

/**
 * Tool to chunk text data, calculate embeddings, and add/update to knowledge graph
 */
export const upsertKnowledgeTool = createTool({
	id: "upsertKnowledge",
	description:
		"Chunks text data and adds/updates it to the knowledge graph along with vector representations.",
	inputSchema: z.object({
		texts: z.array(z.string()).describe("Array of texts to add to the graph"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
		chunksProcessed: z.number().describe("Number of chunks processed"),
		totalNodes: z.number().describe("Total number of nodes"),
	}),
	execute: async ({ context }) => {
		const { texts } = context;

		const allChunks: {
			id: string;
			text: string;
			metadata: Record<string, unknown>;
		}[] = [];
		const allEmbeddings: { id: string; vector: number[] }[] = [];
		let totalChunksProcessed = 0;

		try {
			// Using Promise.all for parallel processing
			await Promise.all(
				texts.map(async (text, i) => {
					const docIdPrefix = `doc-${Date.now()}-${i}`; // Unique prefix for each document

					const { chunks, embeddings, chunkCount } = await chunkAndEmbedText(
						text,
						docIdPrefix,
					);

					allChunks.push(...chunks);
					allEmbeddings.push(...embeddings);
					totalChunksProcessed += chunkCount; // Using chunkCount
				}),
			);
			console.log(allChunks);
			console.log(allChunks[0].metadata);
			await knowledgeStorage.upsert(allChunks, allEmbeddings);

			// Get node count after upsert (logged in saveGraph, but also retrieved here)
			const listResult = await knowledgeStorage.list();

			return {
				success: true,
				message: `Added/updated ${allChunks.length} chunks to the knowledge graph.`,
				chunksProcessed: totalChunksProcessed,
				totalNodes: listResult.nodeCount,
			};
		} catch (error) {
			// Improved error logging
			console.error(
				"❌ upsertKnowledgeTool: Error occurred during processing",
				error,
			);
			return {
				success: false,
				message: `Error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
				chunksProcessed: totalChunksProcessed, // Return the number processed at error point
				totalNodes: 0, // 0 for error
			};
		}
	},
});

/**
 * Tool to query knowledge graph and retrieve related information
 */
export const queryKnowledgeTool = createTool({
	id: "queryKnowledge",
	description: "Queries the knowledge graph and retrieves related information.",
	inputSchema: z.object({
		query: z.string().describe("Search query"),
		topK: z
			.number()
			.optional()
			.default(10)
			.describe("Maximum number of search results to retrieve"),
		randomWalkSteps: z
			.number()
			.optional()
			.default(100)
			.describe("Number of steps in random walk"),
		restartProb: z
			.number()
			.optional()
			.default(0.15)
			.describe("Probability of restarting walk from query node"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
		results: z
			.array(
				z.object({
					id: z.string(),
					content: z.string(),
					score: z.number(),
					metadata: z.record(z.unknown()),
				}),
			)
			.describe("Array of search results"),
	}),
	execute: async ({ context }) => {
		const { query, topK, randomWalkSteps, restartProb } = context;

		try {
			// ★★★ Debug log addition ★★★
			console.log("🔍 queryKnowledgeTool: Getting node count at start time...");
			const listResultBeforeQuery = await knowledgeStorage.list();
			console.log(
				`📊 queryKnowledgeTool: Current node count: ${listResultBeforeQuery.nodeCount}`,
			);
			// ★★★ Debug log addition ★★★

			// Get embedding for query
			const { embedding } = await embed({
				model: embeddingModel,
				value: query,
			});
			console.log(
				`🔍 queryKnowledgeTool: Query execution in progress... topK=${topK}, randomWalkSteps=${randomWalkSteps}, restartProb=${restartProb}`,
			); // Query parameters also logged
			const searchResults = await knowledgeStorage.query(
				embedding,
				topK,
				randomWalkSteps,
				restartProb,
			);
			console.log(
				`📊 queryKnowledgeTool: Search results ${searchResults.length} found`,
			); // Search result count also logged

			const formattedResults = searchResults.map(
				(result: {
					id: string;
					score: number;
					content: string;
					metadata?: Record<string, unknown>;
				}) => ({
					id: result.id,
					content: result.content,
					score: result.score,
					metadata: result.metadata || {}, // Consideration for null/undefined metadata
				}),
			);
			// console.log("📊 queryKnowledgeTool: Formatted search results:", formattedResults); // Output results content if needed

			return {
				success: true,
				message: `Retrieved ${formattedResults.length} results matching query.`,
				results: formattedResults,
			};
		} catch (error) {
			console.error(
				"❌ queryKnowledgeTool: Error occurred during query execution",
				error,
			);
			return {
				success: false,
				message: `Query execution error: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				results: [],
			};
		}
	},
});

// --- Helper functions ---

/**
 * Helper function to chunk text and calculate embeddings
 */
async function chunkAndEmbedText(
	text: string,
	docIdPrefix: string,
): Promise<{
	chunks: { id: string; text: string; metadata: Record<string, unknown> }[];
	embeddings: { id: string; vector: number[] }[];
	chunkCount: number;
}> {
	// RAG chunk creation
	const doc = MDocument.fromText(text);
	console.log("🔍 Metadata extraction in progress...");
	const metadata = (
		await doc.extractMetadata({
			keywords: {
				llm: google("gemini-1.5-pro-latest"),
			},
			summary: {
				llm: google("gemini-1.5-pro-latest"),
			},
		})
	).getMetadata();
	console.log("🔍 Chunking in progress...");

	const chunks = await doc.chunk({
		strategy: "recursive",
		size: 512,
		overlap: 50,
		separator: "\n",
	});
	console.log("🔍 Embedding calculation in progress...");

	const { embeddings: rawEmbeddings } = await embedMany({
		model: embeddingModel,
		values: chunks.map((chunk) => chunk.text),
	});

	if (rawEmbeddings.length !== chunks.length) {
		throw new Error(
			`❌ Chunk count (${chunks.length}) and embedding count (${rawEmbeddings.length}) do not match.`,
		);
	}

	const formattedChunks: {
		id: string;
		text: string;
		metadata: Record<string, unknown>;
	}[] = [];
	const formattedEmbeddings: { id: string; vector: number[] }[] = [];

	chunks.forEach((chunk, index) => {
		const chunkId = `${docIdPrefix}-chunk-${index}`;
		formattedChunks.push({
			id: chunkId,
			text: chunk.text,
			metadata: { ...metadata, chunkIndex: index, docIdPrefix: docIdPrefix },
		});
		formattedEmbeddings.push({
			id: chunkId,
			vector: rawEmbeddings[index],
		});
	});

	return {
		chunks: formattedChunks,
		embeddings: formattedEmbeddings,
		chunkCount: chunks.length,
	};
}

export const knowledgeTools = [upsertKnowledgeTool, queryKnowledgeTool];
