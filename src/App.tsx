import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DownloadCloud, 
  Link2, 
  Clipboard, 
  ArrowRight, 
  AlertCircle, 
  Zap, 
  Youtube, 
  Instagram, 
  ShieldCheck, 
  User, 
  Clock, 
  ChevronDown, 
  ExternalLink,
  RefreshCw,
  Sparkles
} from "lucide-react";

interface VideoFormat {
  format_id: string;
  extension: string;
  resolution: string;
  quality_label: string;
  url: string;
  filesize_approx_mb: number | null;
}

interface ExtractionResponse {
  title: string;
  source: string;
  thumbnail: string | null;
  duration: number | null;
  duration_string: string | null;
  author: string | null;
  download_url: string;
  formats: VideoFormat[];
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [selectedFormatUrl, setSelectedFormatUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Quick helper to read from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("Failed to read clipboard:", err);
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to extract metadata. Check URL.");
      }

      setResult(data);
      if (data.formats && data.formats.length > 0) {
        setSelectedFormatUrl(data.formats[0].url);
      } else {
        setSelectedFormatUrl(data.download_url);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please check your link and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#090d16] text-slate-100 font-sans min-h-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
              <DownloadCloud className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                StreamSlink
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Fast & Unlimited</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              Live Sandbox Engine
            </span>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-2xl">
          
          {/* Header Title with Badges */}
          <div className="text-center mb-8">
            <motion.span 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Full-Stack Sandbox active</span>
            </motion.span>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3"
            >
              Extract & Download Video Streams
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-slate-400 max-w-md mx-auto text-sm sm:text-base"
            >
              Supports YouTube Videos, YouTube Shorts, and Instagram Reels. Extract high-quality streams directly in real time.
            </motion.p>
          </div>

          {/* Form and Interaction Area */}
          <div className="bg-[#111827] border border-slate-800/85 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 relative overflow-hidden">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <form onSubmit={handleExtract} className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube or Instagram link..."
                    className="w-full bg-[#1f2937] border border-slate-700/60 rounded-xl pl-12 pr-24 py-4 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
                  />
                  
                  {/* Paste button */}
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>{copied ? "Copied!" : "Paste"}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 disabled:opacity-50 text-[#0a0f1d] font-bold px-6 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2 flex-shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract Video</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skeleton Loader */}
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-8 space-y-6 animate-pulse"
                >
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-1/3 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-48 h-32 bg-slate-800 rounded-xl flex-shrink-0"></div>
                    <div className="flex-grow space-y-3 py-1">
                      <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                    </div>
                  </div>
                  <div className="h-12 bg-slate-800 rounded-xl"></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Display */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="mt-8 border-t border-slate-800/80 pt-6"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Thumbnail Card */}
                    <div className="relative w-full sm:w-48 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group">
                      <img 
                        src={result.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60"} 
                        alt="Video Thumbnail" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {result.duration_string && (
                        <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-slate-100 px-2 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span>{result.duration_string}</span>
                        </span>
                      )}
                      
                      <span className="absolute top-2 left-2 bg-emerald-500/95 text-[#0a0f1d] px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase">
                        {result.source}
                      </span>
                    </div>

                    {/* Metadata details */}
                    <div className="flex-grow flex flex-col justify-between py-0.5">
                      <div className="space-y-2">
                        <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                          {result.title}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center">
                          <User className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          <span>{result.author}</span>
                        </p>
                      </div>

                      {/* Quality Format Selector */}
                      {result.formats && result.formats.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Select Quality & Format
                          </label>
                          <div className="relative">
                            <select 
                              value={selectedFormatUrl} 
                              onChange={(e) => setSelectedFormatUrl(e.target.value)}
                              className="w-full bg-[#1f2937] border border-slate-700/60 rounded-lg pl-3 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                            >
                              {result.formats.map((f, idx) => (
                                <option key={f.format_id || idx} value={f.url}>
                                  {f.quality_label} - {f.extension.toUpperCase()} ({f.resolution})
                                  {f.filesize_approx_mb ? ` (~${f.filesize_approx_mb} MB)` : ""}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Download Button */}
                  <div className="mt-6">
                    <a
                      href={selectedFormatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.99] text-[#0a0f1d] font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <DownloadCloud className="w-5 h-5" />
                      <span className="text-sm">Download Stream Link ⬇️</span>
                    </a>
                    
                    <div className="flex items-center justify-center space-x-1.5 mt-3 text-[10px] text-slate-500">
                      <ExternalLink className="w-3 h-3 text-slate-600" />
                      <span>Opens streaming link directly in a new tab. Right-click &rarr; "Save Video As" to save.</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Marketing/Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-[#111827]/30 border border-slate-800/50 p-4 rounded-xl flex items-start space-x-3">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Youtube className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">YT Shorts & Videos</h4>
                <p className="text-[11px] text-slate-400">Extracts direct pre-merged video URLs.</p>
              </div>
            </div>

            <div className="bg-[#111827]/30 border border-slate-800/50 p-4 rounded-xl flex items-start space-x-3">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Instagram Reels</h4>
                <p className="text-[11px] text-slate-400">Directly extracts full HD reels instantly.</p>
              </div>
            </div>

            <div className="bg-[#111827]/30 border border-slate-800/50 p-4 rounded-xl flex items-start space-x-3">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Local Sandboxing</h4>
                <p className="text-[11px] text-slate-400">Uses local Python binary extraction.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-slate-800/60 py-6 bg-[#06090f]">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-500">
            &copy; 2026 StreamSlink Downloader. Created for personal, educational, and backup purposes.
          </p>
        </div>
      </footer>

    </div>
  );
}
