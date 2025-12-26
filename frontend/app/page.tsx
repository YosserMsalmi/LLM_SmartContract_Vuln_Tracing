"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { ShieldCheck, AlertTriangle, Terminal, Wallet, Lock, FileCode, CheckCircle, FileJson, Eye, Link as LinkIcon, ExternalLink, Database } from "lucide-react";

export default function Home() {
  const [code, setCode] = useState("");
  const [report, setReport] = useState<any>(null);
  const [rawOutput, setRawOutput] = useState(""); 
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  
  // Traceability State
  const [ipfsCid, setIpfsCid] = useState("");
  const [txHash, setTxHash] = useState("");
  
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (err) {
        console.error(err);
        alert("Erreur de connexion Wallet");
      }
    } else {
      alert("⚠️ Installe MetaMask !");
    }
  };

  const handleScan = async () => {
    if (!code) return;
    if (!walletAddress) return alert("Connecte ton wallet !");

    setLoading(true);
    setReport(null);
    setRawOutput("");
    setIpfsCid("");
    setTxHash("");
    setStatus("🔐 Signature cryptographique...");

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const message = `Audit request at ${new Date().toISOString()}`;
      const sig = await signer.signMessage(message);
      setSignature(sig);
      
      setStatus("🤖 Analyse IA en cours...");

      const response = await fetch("http://127.0.0.1:8000/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: code,
          wallet: walletAddress, 
          signature: sig 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setReport(data.report);
        setRawOutput(data.raw_output);
        setIpfsCid(data.ipfs_cid);
        setTxHash(data.tx_hash);
        setStatus("✅ Terminé !");
      } else {
        alert("Erreur: " + data.detail);
        setStatus("❌ Erreur");
      }

    } catch (error) {
      console.error(error);
      setStatus("❌ Échec");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes("critical") || s.includes("high")) return "text-red-400 border-red-500/50 bg-red-900/20";
    if (s.includes("medium")) return "text-amber-400 border-amber-500/50 bg-amber-900/20";
    return "text-blue-400 border-blue-500/50 bg-blue-900/20";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Smart Auditor AI</h1>
              <p className="text-slate-400 text-sm">Secured by DID & Ethereum Signatures</p>
            </div>
          </div>
          <button 
            onClick={connectWallet}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm border transition-all ${
              walletAddress 
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                : "bg-blue-600 hover:bg-blue-500 border-transparent text-white"
            }`}
          >
            <Wallet size={16} />
            {walletAddress ? `${walletAddress.substring(0, 6)}...` : "Connect Wallet"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: INPUT */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                <Terminal size={14} /> Solidity Input
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Paste Solidity code here..."
                className="w-full h-[600px] bg-slate-950 text-slate-300 p-4 focus:outline-none font-mono text-sm resize-none"
                spellCheck={false}
              />
            </div>
            
            <button
              onClick={handleScan}
              disabled={loading || !code || !walletAddress}
              className={`py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                loading ? "bg-slate-800 text-slate-500" : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
              }`}
            >
              {loading ? status : <><Lock size={20} /> Sign & Audit</>}
            </button>
          </div>

          {/* RIGHT: REPORT DISPLAY */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col h-[600px] shadow-xl overflow-hidden">
            
            {/* Header with Toggles */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className={report ? "text-amber-400" : "text-slate-600"} size={20} />
                <h2 className="font-semibold text-white">Audit Report</h2>
              </div>
              
              {report && (
                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                  <button 
                    onClick={() => setShowRaw(false)}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${!showRaw ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Eye size={12}/> Visual
                  </button>
                  <button 
                    onClick={() => setShowRaw(true)}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${showRaw ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <FileJson size={12}/> Raw Data
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6 flex-1 overflow-auto bg-slate-950/50">
              {!report ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                  <ShieldCheck size={64} className="opacity-10" />
                  <p className="text-sm">Waiting for scan...</p>
                </div>
              ) : (
                <>
                  {/* VIEW 1: RAW OUTPUT */}
                  {showRaw ? (
                    <div className="prose prose-invert max-w-none">
                      <h3 className="text-blue-400 text-sm font-bold mb-2 uppercase tracking-wider">Raw LLM Response</h3>
                      <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {rawOutput}
                      </div>
                    </div>
                  ) : (
                    /* VIEW 2: VISUAL CARDS */
                    <div className="space-y-6">
                      
                      {/* Contract Info */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileCode size={20} className="text-blue-400"/> {report.name || "Unknown Contract"}
                          </h3>
                          <p className="text-slate-500 text-sm">Pragma: {report.pragma}</p>
                        </div>
                      </div>

                      {/* --- TRACEABILITY SECTION (NEW) --- */}
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-sm">
                        <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-3">
                            <Database size={16}/> Blockchain Traceability
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-2">
                            {/* IPFS Link */}
                            <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                                <span className="text-slate-500">IPFS CID:</span>
                                {ipfsCid && ipfsCid !== "N/A" ? (
                                    <a href={`https://gateway.pinata.cloud/ipfs/${ipfsCid}`} target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                                        {ipfsCid.substring(0, 10)}... <ExternalLink size={12}/>
                                    </a>
                                ) : <span className="text-slate-600 italic">Processing / N/A</span>}
                            </div>

                            {/* Transaction Hash */}
                            <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                                <span className="text-slate-500">Tx Hash:</span>
                                {txHash && txHash.startsWith("0x") ? (
                                    <span className="text-emerald-400 font-mono text-xs">{txHash.substring(0, 12)}...</span>
                                ) : <span className="text-slate-600 italic text-xs">Waiting for Block...</span>}
                            </div>
                        </div>
                      </div>
                      {/* ---------------------------------- */}

                      <div className="space-y-4">
                        {report.vulnerabilities?.map((vuln: any, index: number) => (
                          <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(vuln.severity)}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold uppercase tracking-wider text-xs border px-2 py-0.5 rounded">
                                {vuln.severity}
                              </span>
                              <span className="text-xs opacity-70 uppercase tracking-widest">{vuln.category}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-300">{vuln.explanation}</p>
                          </div>
                        ))}
                        
                        {report.vulnerabilities?.length === 0 && (
                          <div className="text-center py-10 text-emerald-400 border border-emerald-500/20 bg-emerald-900/10 rounded-lg">
                            <CheckCircle className="mx-auto mb-2" size={32} />
                            No vulnerabilities detected.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}