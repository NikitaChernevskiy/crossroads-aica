"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    # Cosmos DB
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_database: str = "emotional-partner"
    cosmos_container: str = "states"

    # Use in-memory storage when Cosmos DB is not configured (local dev)
    use_in_memory: bool = True

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = "gpt-4-1-nano"
    azure_openai_api_version: str = "2025-03-01-preview"  # Assistants API v2 support

    # Key Vault (optional — used in production)
    keyvault_url: str = ""

    # MCP / API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # State freshness threshold in seconds
    state_freshness_seconds: int = 300  # 5 minutes

    # CORS origins
    cors_origins: str = "*"

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}


settings = Settings()
