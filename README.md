# Sodateru サーバー

## 概要
このリポジトリはSodateruサーバーのコードを含んでいます。


### PostgreSQLの起動
Sodateruを使用する前に、DockerでPostgreSQLを起動する必要があります：



#### 直接Dockerコマンドを使用する方法
```bash
# PostgreSQLコンテナの起動
docker run -d --name sodateru-postgres \
 -p 8989:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e TZ=Asia/Tokyo \
  201610615/sodateru-postgres:v0.0.0
```

**注意**: 
- PostgreSQLコンテナが起動していない場合、サーバーは正常に動作しません。
- 同じ名前のコンテナが既に存在する場合は、以下のコマンドで既存のコンテナを削除してから再度実行してください：
```bash
docker rm -f sodateru-postgres
```


### 設定ファイル
プロジェクトのルートディレクトリに`mcp.json`ファイルを作成することで、サーバー設定を行うこともできます：

```json
{
	"mcpServers": {
		"sodateru-dev": {
			"command": "npx",
			"args": "-y @sodateru",
			"env": {
				"GOOGLE_GENERATIVE_AI_API_KEY": "{YOUR_API_TOKEN}",
				"DATABASE_TYPE": "postgresql",
				"DATABASE_USER": "user",
				"DATABASE_PASSWORD": "password",
				"DATABASE_NAME": "sodateru",
				"DATABASE_HOST": "localhost",
				"DATABASE_PORT": "8989"
			}
		}
	}
}
```

### 環境変数の設定
以下の環境変数を設定する必要があります：

```
GOOGLE_GENERATIVE_AI_API_KEY=あなたのAPIキー
DATABASE_TYPE=postgresql
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_NAME=sodateru
DATABASE_HOST=localhost
DATABASE_PORT=8989
```


## 使用方法

### サーバーの起動
```bash
npx -y @sodateru
```

## サポート
問題やご質問がある場合は、イシューを作成してください。

