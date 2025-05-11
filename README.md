# Sodateru Server

[English](#english) | [日本語](#japanese)

<a id="english"></a>
# English Documentation

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

### Support
If you have any issues or questions, please create an issue.

---

<a id="japanese"></a>
# 日本語ドキュメント

## 概要
Sodateruは自己更新型Agentic GraphRAGを備えたMCPサーバーです。

中規模から大規模なコードを単一のLLMエージェントで生成する際には、まだ課題があります：
- PRDに明示的に含まれていない重要な背景情報が失われたり、コードに埋もれたりします。
- 長いコンテキストでは、PRDが期待通りにコードを生成しません。LLMの「中間部分の喪失」問題が依然として存在します。
- 大きなコンテキストを継続的に処理することでコストとレイテンシーが増加します。Cursorを使用する場合、コストと使用制限が懸念事項となります。
Cursorはすぐに「遅いリクエスト」になります。

必要なのは「必要な情報を必要なときに持つこと」です。
この目的のために、自己更新型Agentic GraphRAGが必要だと考えています。
私たちはAgentic GraphRAGを使用して、必要なときに必要な情報を取得します。
さらに、自動更新機能は必要な情報を保存するのに役立ちます。

### 開発予定の機能

- Obsidianインポート機能
- Notionインポート機能

### PostgreSQLの起動
Sodateruを使用する前に、DockerでPostgreSQLを起動する必要があります：

#### Dockerコマンドを直接使用する場合
```bash
# PostgreSQLコンテナを起動
docker run -d --name sodateru-postgres \
 -p 8989:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e TZ=Asia/Tokyo \
  201610615/sodateru-postgres:v0.0.0
```

**注意**:
- PostgreSQLコンテナが実行されていないと、サーバーは正常に機能しません。
- 同じ名前のコンテナがすでに存在する場合は、再度実行する前に次のコマンドで既存のコンテナを削除してください：
```bash
docker rm -f sodateru-postgres
```

### 設定ファイル
プロジェクトのルートディレクトリに`mcp.json`ファイルを作成してサーバーを設定できます：

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

#### MCP設定の分離

`MCP_CONFIG_FILE`環境変数を使用すると、MCP設定を別ファイルに分離できます。これにより以下の利点があります：

- 複雑なJSON設定の簡単な管理
- 異なる環境間での設定切り替えが容易
- エスケープ文字や改行の問題を回避

例えば、`/path/to/your/mcp-config.json`に次のような設定ファイルを作成できます：

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

この設定ファイルはSodateruサーバーの起動時に自動的に読み込まれ、内部的に文字列に変換して使用されます。

### 環境変数の設定
以下の環境変数を設定する必要があります：

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
DATABASE_TYPE=postgresql
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_NAME=sodateru
DATABASE_HOST=localhost
DATABASE_PORT=8989
```

### サポート
問題や質問がある場合は、issueを作成してください。

