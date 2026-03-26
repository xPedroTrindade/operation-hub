from __future__ import annotations
import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qglgfacpatoxlapkzbky.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbGdmYWNwYXRveGxhcGt6Ymt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1MzcyMCwiZXhwIjoyMDg5MzI5NzIwfQ.LYw6flDnVPUzByGMJz6hTysxh-SufDfVoPmY9ZN5wTk",
)


def get_db() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
