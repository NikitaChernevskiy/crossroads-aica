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

    # Microsoft Foundry Agent Service
    foundry_project_endpoint: str = ""  # https://<resource>.services.ai.azure.com/api/projects/<project>
    foundry_model_deployment: str = "gpt-5-nano"
    mcp_server_url: str = ""  # Public URL of this backend's /mcp endpoint

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
