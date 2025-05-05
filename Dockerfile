FROM postgres:16-alpine

# 環境変数の設定
ENV POSTGRES_USER=user
ENV POSTGRES_PASSWORD=password
# タイムゾーンの設定
ENV TZ=Asia/Tokyo

# メタデータの追加
LABEL maintainer="kota.yamaguchi@gmail.com"
LABEL version="1.0"
LABEL description="Sodateru PostgreSQL カスタムイメージ"

# ヘルスチェックの追加
HEALTHCHECK --interval=30s --timeout=3s \
  CMD pg_isready -U user || exit 1

# データディレクトリの定義
VOLUME ["/var/lib/postgresql/data"]

# コンテナが使用するポート
EXPOSE 5432 