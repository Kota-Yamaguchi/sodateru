import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { cleanEnv, num, str, testOnly } from "envalid";

const env = cleanEnv(process.env, {
	GOOGLE_GENERATIVE_AI_API_KEY: str({
		desc: "Google Generative AI APIキー",
		devDefault: testOnly("test-api-key"),
	}),

	DATABASE_TYPE: str({
		devDefault: testOnly("postgresql"),
	}),
	DATABASE_USER: str({
		devDefault: testOnly("user"),
	}),
	DATABASE_PASSWORD: str({
		devDefault: testOnly("password"),
	}),
	DATABASE_HOST: str({
		devDefault: testOnly("localhost"),
	}),
	DATABASE_PORT: num({
		devDefault: testOnly(8989),
	}),
	DATABASE_NAME: str({
		devDefault: testOnly("sodateru"),
	}),
});

export const google = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});
export const DATABASE_NAME = env.DATABASE_NAME;

// 埋め込みモデル
export const embeddingModel = google.textEmbeddingModel(
	"gemini-embedding-exp-03-07",
	{
		taskType: "RETRIEVAL_DOCUMENT",
	},
);
export const dbUrl = `${env.DATABASE_TYPE}://${env.DATABASE_USER}:${env.DATABASE_PASSWORD}@${env.DATABASE_HOST}:${env.DATABASE_PORT}/${env.DATABASE_NAME}`;

export const embeddingDimension = 3072 as const;
