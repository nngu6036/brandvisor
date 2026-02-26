"""Environment variable validation on app startup."""
import os
import sys
from typing import List, Tuple


class EnvValidationError(Exception):
    """Raised when environment validation fails."""
    pass


def validate_environment_variables(
    required_vars: List[str] | None = None,
    optional_vars: List[str] | None = None
) -> Tuple[bool, List[str]]:
    """
    Validate that required and optional environment variables are set.
    
    Args:
        required_vars: List of required environment variable names.
                      Defaults to common app variables.
        optional_vars: List of optional environment variable names to warn about.
                      Defaults to common optional variables.
    
    Returns:
        Tuple of (is_valid, missing_vars_list)
        - is_valid: True if all required vars are set
        - missing_vars_list: List of missing required variables
    
    Raises:
        EnvValidationError: If any required variables are missing.
    """
    if required_vars is None:
        required_vars = [
            "SECRET_KEY",
            "MONGO_URI",
            "OPENAI_API_KEY",
            "REDIS_URL",
            "CELERY_BROKER_URL",
            "CELERY_RESULT_BACKEND",
            "PUBLIC_BASE_URL",
        ]
    
    if optional_vars is None:
        optional_vars = [
            "CORS_ORIGINS",
            "LLM_MODEL",
            "LLM_TEMPERATURE",
            "LLM_TIMEOUT",
        ]
    
    # Check required variables
    missing_required = [var for var in required_vars if not os.getenv(var)]
    
    if missing_required:
        error_msg = (
            "Missing required environment variables:\n"
            + "\n".join(f"  - {var}" for var in missing_required)
            + "\nPlease set these environment variables before starting the application."
        )
        raise EnvValidationError(error_msg)
    
    # Check optional variables and warn
    missing_optional = [var for var in optional_vars if not os.getenv(var)]
    if missing_optional:
        print(
            "⚠️  Warning: Optional environment variables not set (using defaults):\n"
            + "\n".join(f"  - {var}" for var in missing_optional)
        )
    
    return True, []


def validate_and_convert_llm_config() -> dict:
    """
    Validate and convert LLM configuration variables to proper types.
    
    Returns:
        dict with keys: openai_api_key, model_name, temperature, timeout
    
    Raises:
        EnvValidationError: If OpenAI key is missing or conversion fails.
    """
    openai_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_KEY")
    if not openai_key:
        raise EnvValidationError(
            "Missing OpenAI API key. Set OPENAI_API_KEY (preferred) or OPENAI_KEY."
        )
    
    model_name = os.getenv("LLM_MODEL", "gpt-5.2-2025-12-11")
    
    try:
        temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    except ValueError:
        raise EnvValidationError(
            f"Invalid LLM_TEMPERATURE: '{os.getenv('LLM_TEMPERATURE')}'. Must be a valid float."
        )
    
    try:
        timeout = int(os.getenv("LLM_TIMEOUT", "60"))
    except ValueError:
        raise EnvValidationError(
            f"Invalid LLM_TIMEOUT: '{os.getenv('LLM_TIMEOUT')}'. Must be a valid integer."
        )
    
    return {
        "openai_api_key": openai_key,
        "model_name": model_name,
        "temperature": temperature,
        "timeout": timeout,
    }


def check_env_on_startup() -> None:
    """
    Check environment variables on app startup.
    Raises EnvValidationError if required variables are missing.
    """
    try:
        validate_environment_variables()
        print("✓ Environment variables validated successfully.")
    except EnvValidationError as e:
        print(f"❌ Environment validation failed:\n{e}")
        sys.exit(1)
