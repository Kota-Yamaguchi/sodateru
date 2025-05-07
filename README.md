# Sodateru Server

## Overview
Sodateru is an MCP server equipped with self-updating Agentic GraphRAG.

There are still issues when generating medium to large-scale code with a single LLM agent:
- Important background information that isn't specifically included in the PRD gets lost or ends up buried in code.
- PRDs don't generate code as expected in long contexts. LLM's "lost in the middle" problem persists.
- Handling large contexts continuously increases costs and latency. When using Cursor, costs and usage limits become concerns.
Cursor quickly becomes a "Slow Request."

What's needed is "having the necessary information when it's needed."
For this purpose, we believe a self-updating Agentic GraphRAG is necessary.
We use Agentic GraphRAG to retrieve the required information when needed.
Additionally, the auto-update feature helps store necessary information.

### Features Planned for Development

- Obsidian import functionality
- Notion import functionality

### Starting PostgreSQL
Before using Sodateru, you need to start PostgreSQL with Docker:

#### Using Docker Commands Directly
```bash
# Start PostgreSQL container
docker run -d --name sodateru-postgres \
 -p 8989:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e TZ=Asia/Tokyo \
  201610615/sodateru-postgres:v0.0.0
```

**Note**: 
- The server will not function properly if the PostgreSQL container is not running.
- If a container with the same name already exists, delete the existing container with the following command before running again:
```bash
docker rm -f sodateru-postgres
```

### Configuration File
You can configure the server by creating an `mcp.json` file in the project's root directory:

```json
{
	"mcpServers": {
		"sodateru": {
			"command": "npx",
			"args": ["-y", "sodateru"],
			"env": {
				"GOOGLE_GENERATIVE_AI_API_KEY": "{YOUR_API_TOKEN}",
				"DATABASE_TYPE": "postgresql",
				"DATABASE_USER": "user",
				"DATABASE_PASSWORD": "password",
				"DATABASE_NAME": "sodateru",
				"DATABASE_HOST": "localhost",
				"DATABASE_PORT": "8989",
                "MCP_CONFIG_FILE": "/path/to/your/mcp-config.json"
			}
		}
	}
}
```

#### Separating MCP Configuration

Using the `MCP_CONFIG_FILE` environment variable allows you to separate MCP server settings into a separate file. This provides the following benefits:

- Easier management of complex JSON configurations
- Simpler switching between configurations for different environments
- Avoidance of issues with escape characters and line breaks

For example, you can create a configuration file at `/path/to/your/mcp-config.json` with settings like:

```json
{
  "mastra": {
    "command": "npx",
    "args": ["-y", "@mastra/mcp-docs-server@latest"]
  },
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
    }
  }
}
```

This configuration file is automatically loaded when the Sodateru server starts and is internally converted to a string for use.


### Setting Environment Variables
You need to set the following environment variables:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
DATABASE_TYPE=postgresql
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_NAME=sodateru
DATABASE_HOST=localhost
DATABASE_PORT=8989
```

## Support
If you have any issues or questions, please create an issue.

