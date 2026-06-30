#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

def main():
    """Run administrative tasks."""
    
    # --- FORCE LOAD .ENV VARIABLES ON STARTUP ---
    # Looks for a file named '.env' in the same folder as manage.py
    env_path = Path(__file__).resolve().parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                # Strip spaces, ignore empty lines and comment lines
                line = line.strip()
                if line and not line.startswith('#'):
                    # Split only on the first '=' in case your key has symbols
                    if '=' in line:
                        key, val = line.split('=', 1)
                        # Clean quotes and whitespace out of the key/value data
                        os.environ[key.strip()] = val.strip().strip('"').strip("'")
    # ---------------------------------------------

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminix.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()