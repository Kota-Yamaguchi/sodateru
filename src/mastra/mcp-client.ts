import { MCPClient } from "@mastra/mcp";

// Load MCP server settings from environment variables
const getServersFromEnv = () => {
	try {
		// If the environment variable mcp is set, attempt to parse it
		if (process.env.mcp) {
			try {
				// Extract JSON object from the environment variable string
				const mcpValue = process.env.mcp.trim();
				// Try direct JSON parsing
				const parsedValue = JSON.parse(mcpValue);
				return parsedValue;
			} catch (parseError) {
				// If direct parsing fails, try the traditional method
				try {
					// Remove extra quotes or backticks
					const cleanedValue = process.env.mcp
						.trim()
						.replace(/^[`'"]\s*|\s*['"`]$/g, "");
					const result = JSON.parse(`{${cleanedValue}}`);
					return result;
				} catch (fallbackError) {
					console.error(
						"Error parsing MCP server settings (both methods):",
						fallbackError,
					);
					throw fallbackError;
				}
			}
		}
	} catch (error) {
		console.error("Error parsing MCP server settings:", error);
	}
};

// Initialize MCP client
export const mcp = new MCPClient({
	servers: getServersFromEnv(),
});
