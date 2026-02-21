import json
import os
from openai import OpenAI
from supabase import create_client, Client

# --- CONFIGURATION ---
# Load credentials from environment variables — never hardcode secrets.
# Set these in your shell before running:
#   export SUPABASE_URL="https://ftsvpdkfpxjnfmdcbmfk.supabase.co"
#   export SUPABASE_SERVICE_ROLE_KEY="<your service role key from Supabase dashboard>"
#   export OPENAI_API_KEY="<your OpenAI key>"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # Must be service role key to bypass RLS
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# Load your verified JSON file
with open('tangerine_chunks.json', 'r') as f:
    data = json.load(f)

chunks = data if isinstance(data, list) else data.get('chunks', [])

print(f"Starting ingestion of {len(chunks)} chunks...")

# --- THE UPLOAD LOOP ---
for i, chunk in enumerate(chunks):
    text_content = chunk['content']
    metadata = chunk['metadata']

    # 1. Generate Embedding
    response = client.embeddings.create(
        input=text_content,
        model="text-embedding-3-small"
    )
    embedding = response.data[0].embedding

    # 2. Prepare Data
    data_to_insert = {
        "content": text_content,
        "metadata": metadata,
        "embedding": embedding
    }

    # 3. Insert into Supabase
    try:
        supabase.table("documents").insert(data_to_insert).execute()
        if (i + 1) % 5 == 0:
            print(f"Uploaded {i + 1}/{len(chunks)}...")
    except Exception as e:
        print(f"Error uploading chunk {i}: {e}")

print("Ingestion Complete!")
