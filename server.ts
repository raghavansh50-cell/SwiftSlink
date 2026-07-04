import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper directory for yt-dlp binary
const binDir = path.join(process.cwd(), "bin");
const ytDlpPath = path.join(binDir, "yt-dlp");

// Ensure the bin directory and yt-dlp binary exist on startup
function ensureYtDlp() {
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  if (!fs.existsSync(ytDlpPath)) {
    console.log("Downloading yt-dlp standalone zipapp...");
    // Download the latest yt-dlp binary safely using curl
    const downloadCommand = `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${ytDlpPath}" && chmod +x "${ytDlpPath}"`;
    exec(downloadCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Failed to download yt-dlp binary automatically:", error.message);
        console.error(stderr);
      } else {
        console.log("yt-dlp binary downloaded and prepared successfully.");
      }
    });
  } else {
    console.log("yt-dlp binary is already present.");
  }
}

// Ensure the binary is ready
ensureYtDlp();

// API route to extract details
app.post("/api/extract", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string" || url.trim() === "") {
    return res.status(400).json({ detail: "A valid URL is required" });
  }

  const urlStr = url.trim();
  console.log(`Extracting metadata for: ${urlStr}`);

  // We invoke the downloaded yt-dlp binary via python3 to fetch the JSON manifest
  // --dump-json prints the metadata JSON to stdout without downloading the video
  const command = `python3 "${ytDlpPath}" -j --no-warnings --no-playlist "${urlStr}"`;

  // Increase maxBuffer to 15MB to handle rich playlists or long format lists
  exec(command, { maxBuffer: 1024 * 1024 * 15 }, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp extraction process failed:", error.message);
      const errMsg = stderr || error.message;
      let friendlyMessage = "Failed to extract video. Please make sure the link is correct and publicly accessible.";

      if (errMsg.includes("Incomplete YouTube ID") || errMsg.includes("not a valid URL")) {
        friendlyMessage = "The provided URL is invalid. Please verify and try again.";
      } else if (errMsg.includes("Private video")) {
        friendlyMessage = "This video is private and cannot be extracted.";
      } else if (errMsg.includes("Sign in to confirm your age")) {
        friendlyMessage = "This content is age-restricted and requires authentication, which is not supported.";
      } else if (errMsg.includes("Unsupported URL")) {
        friendlyMessage = "This platform is not supported. Please use YouTube or Instagram.";
      }

      return res.status(400).json({ detail: friendlyMessage });
    }

    try {
      const info = JSON.parse(stdout);
      
      const title = info.title || "Untitled Video";
      const author = info.uploader || info.author || info.channel || "Unknown Creator";
      const duration = info.duration || 0;
      
      // Helper function to format duration
      const formatDuration = (secs: number) => {
        if (!secs) return "00:00";
        const m = Math.floor(secs / 60) % 60;
        const s = secs % 60;
        const h = Math.floor(secs / 3600);
        
        const pad = (num: number) => String(num).padStart(2, "0");
        return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
      };

      const durationString = formatDuration(duration);
      const thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[0].url : null);
      const extractorKey = (info.extractor_key || "Generic").toLowerCase();

      // Filter and prepare formats
      const rawFormats = info.formats || [];
      const combinedFormats: any[] = [];

      rawFormats.forEach((f: any) => {
        const acodec = f.acodec || "none";
        const vcodec = f.vcodec || "none";
        const formatUrl = f.url;

        // For YouTube, high quality formats are audio-only or video-only.
        // Pre-merged streams (like format 18 (360p) and format 22 (720p)) contain both audio & video.
        // For Instagram/TikTok/Twitter, formats usually have both codecs from the start.
        if (formatUrl && acodec !== "none" && vcodec !== "none") {
          combinedFormats.push(f);
        }
      });

      // Sort formats by height (resolution) descending
      combinedFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

      const formatsList = combinedFormats.map((f: any, idx: number) => {
        const height = f.height || 0;
        const width = f.width || 0;
        const resolution = width && height ? `${width}x${height}` : f.format_note || "Standard";
        const qualityLabel = height ? `${height}p` : f.format_note || "Unknown Quality";
        
        const filesize = f.filesize || f.filesize_approx;
        const filesizeMb = filesize ? parseFloat((filesize / (1024 * 1024)).toFixed(2)) : null;

        return {
          format_id: String(f.format_id || idx),
          extension: f.ext || "mp4",
          resolution,
          quality_label: qualityLabel,
          url: f.url,
          filesize_approx_mb: filesizeMb
        };
      });

      const mainDownloadUrl = info.url || (formatsList.length > 0 ? formatsList[0].url : null);

      if (!mainDownloadUrl) {
        return res.status(400).json({ detail: "No downloadable video stream was found for this link." });
      }

      // If format lists are empty, generate a generic fallback
      if (formatsList.length === 0) {
        formatsList.push({
          format_id: "best_fallback",
          extension: "mp4",
          resolution: "Best Available",
          quality_label: extractorKey.includes("instagram") ? "HD Video" : "Standard",
          url: mainDownloadUrl,
          filesize_approx_mb: null
        });
      }

      res.json({
        title,
        source: extractorKey.charAt(0).toUpperCase() + extractorKey.slice(1),
        thumbnail,
        duration,
        duration_string: durationString,
        author,
        download_url: mainDownloadUrl,
        formats: formatsList
      });

    } catch (parseError) {
      console.error("Failed to parse yt-dlp JSON output:", parseError);
      res.status(500).json({ detail: "Failed to parse metadata from extractor." });
    }
  });
});

// Setup Vite Dev Server / Serve static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support client routing if any
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
