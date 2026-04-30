import os
import logging
from typing import Dict, Any

def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

def get_env_var(key: str, default: Any = None) -> Any:
    """Get environment variable with optional default value."""
    return os.getenv(key, default)

def validate_file_type(filename: str, allowed_types: list) -> bool:
    """Validate if file type is allowed."""
    file_extension = os.path.splitext(filename)[1].lower()
    return file_extension in allowed_types

def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"
