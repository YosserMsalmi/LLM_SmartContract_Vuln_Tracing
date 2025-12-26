import json
import requests
from web3 import Web3
from eth_hash.auto import keccak
import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------------
# CONFIG
# -------------------------------
NODE_URL = os.getenv("NODE_URL")  # Ganache URL
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
REGISTRY_ADDRESS = Web3.to_checksum_address(os.getenv("REGISTRY_ADDRESS"))

# ABI (from Remix compilation)
with open("ReportRegistryABI.json") as f:
    REGISTRY_ABI = json.load(f)


w3 = Web3(Web3.HTTPProvider(NODE_URL))
acct = w3.eth.account.from_key(PRIVATE_KEY)
contract = w3.eth.contract(address=REGISTRY_ADDRESS, abi=REGISTRY_ABI)

# -------------------------------
# 1) Create report JSON
# -------------------------------

#
url = "http://localhost:3000/scan"
response = requests.post(url)
report = response.json()
print(report)

canonical = json.dumps(report, separators=(',', ':'), sort_keys=True)
report_hash_bytes = keccak(canonical.encode())
print("Report Hash:", report_hash_bytes.hex())

# -------------------------------
# 2) Upload to IPFS via Pinata
# -------------------------------
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def upload_to_ipfs(data_bytes):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    files = {"file": ("report.json", data_bytes)}
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }
    response = requests.post(url, files=files, headers=headers)
    if response.status_code == 200:
        return response.json()["IpfsHash"]
    else:
        raise Exception(f"IPFS upload failed: {response.text}")

ipfs_cid = upload_to_ipfs(canonical.encode())
print("IPFS CID:", ipfs_cid)

# -------------------------------
# 3) Register on smart contract
# -------------------------------
tx = contract.functions.registerReport(
    report_hash_bytes,
    ipfs_cid,  # pass as string (no encode needed)
).build_transaction({
    "from": acct.address,
    "nonce": w3.eth.get_transaction_count(acct.address),
    "gas": 500_000,
    "gasPrice": w3.eth.gas_price
})

signed = acct.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
print("Transaction hash:", tx_hash.hex())

receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print("Transaction status:", receipt.status)
print("Total reports:", contract.functions.totalReports().call())



def get_report_from_cid(cid: str) -> dict:
    """
    Fetch a JSON report from IPFS given its CID.

    Args:
        cid (str): IPFS CID of the report

    Returns:
        dict: Parsed JSON report
    """
    url = f"https://gateway.pinata.cloud/ipfs/{cid}"
    response = requests.get(url)

    if response.status_code == 200:
        try:
            report = response.json()  # parse JSON content
            return report
        except json.JSONDecodeError:
            raise ValueError("Failed to decode JSON from IPFS content")
    else:
        raise Exception(f"Failed to fetch report from IPFS: {response.status_code}, {response.text}")

# report_on_chain is a tuple corresponding to the struct:
# (reportHash, ipfsCid, high, medium, low)

# Get all past ReportRegistered events
events = contract.events.ReportRegistered.create_filter(from_block=0).get_all_entries()
for e in events:
    print({
        "index": e['args']['index'],
        "reportHash": e['args']['reportHash'].hex(),
        "ipfsCid": e['args']['ipfsCid'],
    })


events = contract.events.ReportRegistered.get_logs(from_block=0)
for e in events:
    print(e['args']['ipfsCid'])
    cid = e['args']['ipfsCid']
# Example usage

report = get_report_from_cid(cid)
print(json.dumps(report, indent=4))