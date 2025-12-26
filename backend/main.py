import json
import os
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from web3 import Web3
from eth_hash.auto import keccak
from dotenv import load_dotenv

# 1. LOAD CONFIGURATION
load_dotenv()
NODE_URL = os.getenv("NODE_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
REGISTRY_ADDRESS = os.getenv("REGISTRY_ADDRESS")
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

# 2. SETUP BLOCKCHAIN & AI
w3 = Web3(Web3.HTTPProvider(NODE_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)

# Load ABI
try:
    with open("ReportRegistryABI.json") as f:
        REGISTRY_ABI = json.load(f)
    contract = w3.eth.contract(address=REGISTRY_ADDRESS, abi=REGISTRY_ABI)
    print("✅ Blockchain System: Connected")
except Exception as e:
    print(f"⚠️ Warning: Could not load Blockchain config: {e}")

# Initialize AI
llm = OllamaLLM(model="qwen2.5:latest", temperature=0, timeout=120)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuditRequest(BaseModel):
    code: str
    wallet: str
    signature: str

# 3. HELPER FUNCTIONS

def upload_to_ipfs(json_string):
    """Uploads JSON content to Pinata IPFS"""
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    files = {"file": ("audit_report.json", json_string)}
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }
    response = requests.post(url, files=files, headers=headers)
    if response.status_code == 200:
        return response.json()["IpfsHash"]
    else:
        raise Exception(f"IPFS Upload Failed: {response.text}")

# 4. THE PROMPT
template = """
You are a professional smart contract auditor.
Detect vulnerabilities in Solidity code.

Output MUST be a valid JSON object with the following structure:
{{
    "name": "<contract_name.sol>",
    "pragma": "<solidity_version>",
    "vulnerabilities": [
        {{
            "category": "<vulnerability_category>",
            "severity": "<low|medium|high|critical>",
            "explanation": "<short description>"
        }}
    ]
}}

Analyze this code:
{code}

Return ONLY the JSON object.
"""
prompt = PromptTemplate.from_template(template)
audit_chain = prompt | llm | StrOutputParser()

# 5. THE MAIN ENDPOINT
@app.post("/scan")
async def scan_contract(request: AuditRequest):
    print(f"📥 New Request from: {request.wallet}")
    
    try:
        # --- PHASE A: AI AUDIT ---
        print("🤖 AI Analysis started...")
        llm_result = audit_chain.invoke({"code": request.code})
        
        # Extract JSON robustly
        start_index = llm_result.find("{")
        end_index = llm_result.rfind("}") + 1
        if start_index == -1: raise ValueError("AI did not return JSON")
        
        json_part = llm_result[start_index:end_index]
        report_dict = json.loads(json_part)
        print("✅ AI Analysis done.")

        # --- PHASE B: TRACEABILITY (IPFS + BLOCKCHAIN) ---
        tx_hash_hex = "N/A" # Default if blockchain fails
        ipfs_cid = "N/A"

        try:
            print("🔗 Starting Traceability...")
            
            # 1. Canonical Hash
            canonical = json.dumps(report_dict, separators=(',', ':'), sort_keys=True)
            report_hash_bytes = keccak(canonical.encode())
            
            # 2. Upload to IPFS
            ipfs_cid = upload_to_ipfs(canonical)
            print(f"☁️ Uploaded to IPFS: {ipfs_cid}")

            # 3. Register on Blockchain
            tx = contract.functions.registerReport(
                report_hash_bytes,
                ipfs_cid
            ).build_transaction({
                "from": account.address,
                "nonce": w3.eth.get_transaction_count(account.address),
                "gas": 500_000,
                "gasPrice": w3.eth.gas_price
            })
            
            signed_tx = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash_hex = tx_hash.hex()
            
            print(f"⛓️ Transaction sent: {tx_hash_hex}")
            
            # Wait for receipt (Optional: Remove if too slow)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            print("✅ Transaction Confirmed")

        except Exception as bc_error:
            print(f"⚠️ Traceability Error: {bc_error}")
            # We don't stop the request, we just return the report with error note
            tx_hash_hex = f"Failed: {str(bc_error)}"

        # --- RETURN EVERYTHING TO FRONTEND ---
        return {
            "report": report_dict,
            "raw_output": llm_result,
            "ipfs_cid": ipfs_cid,
            "tx_hash": tx_hash_hex
        }

    except Exception as e:
        print(f"❌ Critical Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)