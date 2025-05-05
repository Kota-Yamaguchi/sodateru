import { Agent } from "@mastra/core/agent";
import { google } from "../config";
import {
	queryKnowledgeTool,
	upsertKnowledgeTool,
} from "../tool/knowledge-tool";
// Initialize text model (Gemini)
export const model = google("gemini-1.5-pro-latest");

// Create the agent
export const knowledgeAgent = new Agent({
	name: "Knowledge Agent",
	instructions: `あなたは高度な検索アシスタントです。
知識グラフを使用してドキュメント間の関連性を分析し、複雑な質問に回答します。
単なるキーワードマッチングではなく、文書間の意味的な関係性を考慮して回答を生成してください。

以下のステップで回答を作成してください：
1. ユーザーの質問を理解し、キーポイントを特定
2. knowledgeRagToolを使用してグラフベースの検索を実行
3. 検索結果の関連情報を統合して包括的な回答を作成
4. 必要に応じて、関連するトピックや追加情報も提案

回答は正確で、情報量が豊富で、ユーザーの質問に直接対応するものにしてください。
検索結果に情報がない場合は、推測せずに情報が不足していることを伝えてください。`,
	model: model,
	tools: {
		upsertKnowledgeTool,
		queryKnowledgeTool,
	},
});
