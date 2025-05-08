import { GraphRAG } from "@mastra/rag";
import { Pool, type PoolClient, type QueryResult } from "pg";
import { dbUrl, embeddingDimension } from "../config";
import { ensureDatabase } from "./generate-db";

// Chunk and embedding types for GraphRAG (provisional, may need adjustment based on actual types)
type GraphChunk = {
	id: string;
	text: string;
	metadata: Record<string, unknown>;
};
type GraphEmbedding = { id: string; vector: number[] };

/**
 * Storage class for GraphRAG persistence (PostgreSQL version)
 * Please use initialize method to construct.
 */
export class KnowledgeRagStorage {
	private pool: Pool;
	private graphRag: GraphRAG | null = null; // null in initial state
	private isInitialized = false;

	/**
	 * Please use initialize method to construct.
	 */
	private constructor() {
		// Get connection info from environment variables (example)
		// DATABASE_URL="postgresql://user:password@localhost:5432/graphrag_db"
		const connectionString = dbUrl;
		if (!connectionString) {
			throw new Error(
				"DATABASE_URL environment variable is not set for KnowledgeRagStorage",
			);
		}
		this.pool = new Pool({
			connectionString: connectionString,
		});

		this.pool.on("error", (err) => {
			console.error("❌ PostgreSQL Pool Error:", err);
		});
		// GraphRAG instance is created at load time
	}

	/**
	 * Initialize an instance of this class.
	 * Creates tables if they don't exist and loads data.
	 * @returns The initialized instance
	 */
	public static async initialize() {
		const storage = new KnowledgeRagStorage();
		if (!storage.isInitialized) {
			console.log("✅ GraphRagStorage: Initialization started");
			await ensureDatabase();
			await storage.initTable();
			await storage.load();
			storage.isInitialized = true;
			console.log("✅ GraphRagStorage: Initialization completed");
		}
		return storage;
	}

	private async initTable() {
		console.log("✅ GraphRagStorage: Table initialization check/creation");
		// Create nodes table (JSONB type recommended for embedding and metadata)
		await this.pool.query(
			`CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY NOT NULL,
        content TEXT NOT NULL,
        embedding JSONB, -- JSONB for efficiency
        metadata JSONB    -- JSONB for efficiency
      )`,
		);

		// Create edges table
		await this.pool.query(
			`CREATE TABLE IF NOT EXISTS edges (
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        weight REAL NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY (source, target, type),
        FOREIGN KEY (source) REFERENCES nodes(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (target) REFERENCES nodes(id) ON DELETE CASCADE ON UPDATE CASCADE
      )`,
		);

		// Create indexes (IF NOT EXISTS is included in CREATE INDEX)
		await this.pool.query(
			"CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source)",
		);
		await this.pool.query(
			"CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target)",
		);
		await this.pool.query(
			"CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type)",
		);
	}

	/** Load graph from DB */
	async load(): Promise<{
		success: boolean;
		graph: GraphRAG | null; // null on initialization failure
	}> {
		try {
			console.log("✅ GraphRagStorage: Started loading graph from DB");
			const nodeRes: QueryResult = await this.pool.query(
				"SELECT id, content, embedding, metadata FROM nodes",
			);
			const edgeRes: QueryResult = await this.pool.query(
				"SELECT source, target, weight, type FROM edges",
			);
			console.log(
				`📄 Loaded from DB: ${nodeRes.rowCount} nodes, ${edgeRes.rowCount} edges`,
			);

			const nodes = nodeRes.rows.map((row) => ({
				id: row.id as string,
				content: row.content as string,
				embedding: (row.embedding ?? []) as number[], // embedding should be retrievable as array directly (JSONB)
				metadata: (row.metadata ?? {}) as Record<string, unknown>, // similarly for metadata (JSONB)
			}));

			const edges = edgeRes.rows.map((row) => ({
				source: row.source as string,
				target: row.target as string,
				weight: row.weight as number,
				type: "semantic" as const, // use DB values as needed
			}));

			// Generate/restore GraphRAG instance
			const graphRag = new GraphRAG(embeddingDimension, 100); // adjust parameters according to settings
			if (nodes.length > 0) {
				for (const node of nodes) {
					graphRag.addNode({
						id: node.id,
						content: node.content,
						embedding: node.embedding,
						metadata: node.metadata,
					});
				}
			}
			if (edges.length > 0) {
				for (const edge of edges) {
					graphRag.addEdge(edge);
				}
			}

			if (nodes.length === 0 && edges.length === 0) {
				console.log("ℹ️ GraphRagStorage: No data in DB. Created empty graph.");
			}

			this.graphRag = graphRag;
			console.log("✅ GraphRagStorage: Graph loading completed");
			return {
				success: true,
				graph: this.graphRag,
			};
		} catch (error) {
			console.error("❌ GraphRagStorage: Failed to load graph", error);
			this.graphRag = null; // set to null on failure
			return {
				success: false,
				graph: null,
			};
		}
	}

	/** Get the number of stored nodes */
	async list(): Promise<{
		// Return type remains unchanged
		success: boolean;
		message: string;
		nodeCount: number;
	}> {
		try {
			const result: QueryResult = await this.pool.query(
				"SELECT COUNT(*) as count FROM nodes",
			);
			const count = Number.parseInt(result.rows[0]?.count ?? "0", 10);
			return {
				success: true,
				message: `Currently ${count} nodes are stored.`,
				nodeCount: count,
			};
		} catch (error) {
			console.error("❌ GraphRagStorage: Failed to get node count", error);
			return {
				success: false,
				message: "Failed to get node count.",
				nodeCount: -1,
			};
		}
	}

	async query(
		query: number[],
		topK = 10,
		randomWalkSteps = 10,
		restartProb = 0.5,
	): Promise<
		{
			id: string;
			score: number;
			content: string;
			metadata?: Record<string, unknown>;
		}[]
	> {
		if (this.graphRag) {
			const result = this.graphRag.query({
				query,
				topK,
				randomWalkSteps,
				restartProb,
			});
			return result;
		}
		throw new Error("GraphRAG is not initialized.");
	}

	async upsert(chunks: GraphChunk[], embeddings: GraphEmbedding[]) {
		if (!this.graphRag) {
			// First time or load failure
			console.log("✅ GraphRagStorage: Creating new GraphRAG instance");
			this.graphRag = new GraphRAG(embeddingDimension, 100);
			this.graphRag.createGraph(chunks, embeddings);
		} else {
			// Add/update to existing graph
			console.log("✅ GraphRagStorage: Updating existing graph");
			// Note: If the current GraphRAG library doesn't have incremental update functionality,
			//      you might need to merge existing nodes/edges with new data
			//      and re-execute createGraph.
			//      The implementation below is a simple addition example.
			//      Need to check how createGraph handles duplicate IDs.
			for (const chunk of chunks) {
				const embedding = embeddings.find((e) => e.id === chunk.id);
				this.graphRag?.addNode({
					id: chunk.id,
					content: chunk.text,
					embedding: embedding?.vector,
					metadata: chunk.metadata,
				});
			}
			// Update edges as needed
			// this.graphRag.createGraph(...) // Or recalculate the entire graph
		}

		await this.saveGraph(this.graphRag); // Save updated/created graph to DB
		console.log("✅ GraphRagStorage: upsert completed");
	}

	// Save graph to DB (using transaction)
	private async saveGraph(graphRag: GraphRAG) {
		const nodes = graphRag.getNodes();
		const edges = graphRag.getEdges();

		if (!nodes || nodes.length === 0) {
			console.warn("⚠️ GraphRagStorage: Node data to save is empty");
			// return; // Often edges are not saved when there are no nodes
		}
		if (!edges || edges.length === 0) {
			console.warn("⚠️ GraphRagStorage: Edge data to save is empty");
		}

		const client: PoolClient = await this.pool.connect();
		try {
			await client.query("BEGIN");
			console.log("✅ GraphRagStorage: Started DB save transaction");

			// Consider deleting existing data for performance
			// await client.query('TRUNCATE TABLE nodes CASCADE'); // edges also deleted
			// Or use UPSERT (ON CONFLICT DO UPDATE)
			// Differential deletion is also possible with DELETE FROM nodes WHERE id = ANY($1::text[]) etc.

			// Node insertion/replacement (using ON CONFLICT)
			if (nodes && nodes.length > 0) {
				const nodeSql = `
          INSERT INTO nodes (id, content, embedding, metadata)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata
        `;
				for (const node of nodes) {
					await client.query(nodeSql, [
						node.id,
						node.content,
						JSON.stringify(node.embedding ?? []), // String conversion needed even for JSONB
						JSON.stringify(node.metadata ?? {}),
					]);
				}
			}

			// Edge insertion/replacement (using ON CONFLICT)
			if (edges && edges.length > 0) {
				// Sometimes it's easier to delete old edges before inserting new ones
				// await client.query('DELETE FROM edges WHERE source = ANY($1::text[]) OR target = ANY($1::text[])', [nodes.map(n => n.id)]);
				await client.query("DELETE FROM edges"); // Delete all first (may be inefficient in some cases)

				const edgeSql = `
          INSERT INTO edges (source, target, weight, type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (source, target, type) DO UPDATE SET
            weight = EXCLUDED.weight
        `; // ON CONFLICT based on primary key
				for (const edge of edges) {
					await client.query(edgeSql, [
						edge.source,
						edge.target,
						edge.weight,
						edge.type,
					]);
				}
			}

			await client.query("COMMIT");
			console.log(
				`✅ GraphRagStorage: Saved ${nodes?.length ?? 0} nodes and ${
					edges?.length ?? 0
				} edges to DB.`,
			);
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("❌ GraphRagStorage: Failed to save graph to DB", error);
			throw error; // Re-throw error
		} finally {
			client.release(); // Return connection to pool
		}
	}

	/** Delete all graph data (clear nodes and edges tables) */
	async delete(): Promise<{ success: boolean; message: string }> {
		const client: PoolClient = await this.pool.connect();
		try {
			await client.query("BEGIN");
			// Due to foreign key constraint (ON DELETE CASCADE), edges are also deleted when nodes are deleted
			await client.query("TRUNCATE TABLE nodes CASCADE");
			// Or delete individually:
			// await client.query('DELETE FROM edges');
			// await client.query('DELETE FROM nodes');
			await client.query("COMMIT");

			// Reset in-memory graph too
			if (this.graphRag) {
				this.graphRag = new GraphRAG(embeddingDimension, 100);
				console.log("ℹ️ GraphRagStorage: Reset in-memory graph.");
			}

			console.log("✅ GraphRagStorage: Deleted graph data from DB.");
			return {
				success: true,
				message: "Deleted GraphRAG data (nodes, edges)",
			};
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("❌ GraphRagStorage: Failed to delete graph data", error);
			throw error; // Re-throw error
		} finally {
			client.release();
		}
	}

	/**
	 * Release the pool. Call this when the application terminates.
	 */
	async close(): Promise<void> {
		console.log("ℹ️ GraphRagStorage: Closing PostgreSQL connection pool...");
		await this.pool.end();
		console.log("✅ GraphRagStorage: PostgreSQL connection pool closed.");
	}
}
