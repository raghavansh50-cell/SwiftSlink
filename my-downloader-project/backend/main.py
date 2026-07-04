import os
import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import yt_dlp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("downloader-backend")

app = FastAPI(
    title="High-Performance Video Downloader API",
    description="Extracts direct streaming and temporary download URLs from YouTube, Instagram, and other video platforms.",
    version="1.0.0"
)

# CORS SETUP:
# During development, we allow all origins. 
# For production (Vercel deployment), uncomment and modify the origins list below:
# origins = [
#     "https://your-frontend-domain.vercel.app",
#     "http://localhost:3000"
# ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your Vercel domain in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractionRequest(BaseModel):
    url: str

class VideoFormatInfo(BaseModel):
    format_id: str
    extension: str
    resolution: str
    quality_label: str
    url: str
    filesize_approx_mb: float | None = None

class ExtractionResponse(BaseModel):
    title: str
    source: str
    thumbnail: str | None = None
    duration: int | None = None  # in seconds
    duration_string: str | None = None
    author: str | None = None
    download_url: str
    formats: list[VideoFormatInfo]

def format_duration(seconds: int | None) -> str:
    if not seconds:
        return "00:00"
    mins, secs = divmod(seconds, 60)
    hours, mins = divmod(mins, 60)
    if hours > 0:
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Video Downloader API",
        "supported_platforms": ["YouTube (Videos, Shorts)", "Instagram (Reels, Videos)", "TikTok", "Twitter/X", "Vimeo"]
    }

@app.post("/api/extract", response_model=ExtractionResponse)
async def extract_video_info(request: ExtractionRequest):
    url_str = str(request.url).strip()
    
    if not url_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is required"
        )
        
    logger.info(f"Received extraction request for URL: {url_str}")
    
    # Configure yt-dlp options
    ydl_opts = {
        'format': 'best',  # default to best pre-merged format
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
        'extract_flat': False,
        # Set headers to prevent platform blocking
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Sec-Fetch-Mode': 'navigate',
        },
        'allowed_extractors': ['default', 'youtube', 'instagram', 'tiktok', 'twitter', 'vimeo']
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info without downloading the file
            info = ydl.extract_info(url_str, download=False)
            
            if not info:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Could not extract video details. Verify the link is valid and public."
                )
                
            title = info.get('title', 'Untitled Video')
            author = info.get('uploader') or info.get('author') or info.get('channel')
            duration = info.get('duration')
            duration_str = format_duration(duration)
            
            # Fetch thumbnail
            thumbnail = info.get('thumbnail') or info.get('thumbnails', [{}])[0].get('url')
            
            # Identify source/extractor type
            extractor_key = info.get('extractor_key', 'Generic').lower()
            
            # Gather and filter formats
            formats_list = []
            raw_formats = info.get('formats', [])
            
            # Filter formats that have BOTH audio and video codecs (pre-merged)
            # This is critical for YouTube, where high-res streams are usually split.
            # Pre-merged streams (like format 18 (360p) and format 22 (720p)) avoid audio syncing issues.
            combined_formats = []
            for f in raw_formats:
                acodec = f.get('acodec', 'none')
                vcodec = f.get('vcodec', 'none')
                url = f.get('url')
                
                if url and acodec != 'none' and vcodec != 'none':
                    combined_formats.append(f)
            
            # Sort combined formats by resolution (height) in descending order
            combined_formats.sort(key=lambda x: x.get('height') or 0, reverse=True)
            
            # If no pre-merged formats were found, look at the main 'url' provided by yt-dlp
            main_download_url = info.get('url')
            
            # Populate our response formats list
            for idx, f in enumerate(combined_formats):
                height = f.get('height', 0)
                width = f.get('width', 0)
                resolution = f"{width}x{height}" if width and height else f.get('format_note', 'Standard')
                quality_label = f"{height}p" if height else f.get('format_note', 'Unknown Quality')
                
                # Estimate filesize
                filesize = f.get('filesize') or f.get('filesize_approx')
                filesize_mb = round(filesize / (1024 * 1024), 2) if filesize else None
                
                formats_list.append(
                    VideoFormatInfo(
                        format_id=str(f.get('format_id', idx)),
                        extension=f.get('ext', 'mp4'),
                        resolution=resolution,
                        quality_label=quality_label,
                        url=f.get('url'),
                        filesize_approx_mb=filesize_mb
                    )
                )
            
            # Determine the primary direct download link
            # We prefer the highest quality combined format, otherwise fallback to the default 'url'
            primary_download_url = ""
            if formats_list:
                primary_download_url = formats_list[0].url
            elif main_download_url:
                primary_download_url = main_download_url
            else:
                # If absolute worst case, try format sorting
                raise ValueError("No valid video stream URL was found.")
                
            # If formats_list is empty, we create at least one default fallback format
            if not formats_list and primary_download_url:
                formats_list.append(
                    VideoFormatInfo(
                        format_id="best_fallback",
                        extension="mp4",
                        resolution="Best Available",
                        quality_label="HD" if "instagram" in extractor_key else "Standard",
                        url=primary_download_url,
                        filesize_approx_mb=None
                    )
                )
                
            return ExtractionResponse(
                title=title,
                source=extractor_key.capitalize(),
                thumbnail=thumbnail,
                duration=duration,
                duration_string=duration_str,
                author=author,
                download_url=primary_download_url,
                formats=formats_list
            )
            
    except Exception as e:
        logger.error(f"yt-dlp extraction failed for URL: {url_str}. Error: {str(e)}")
        # Handle cases where video is private, deleted, or signature fails
        error_msg = str(e)
        if "Incomplete YouTube ID" in error_msg or "not a valid URL" in error_msg:
            detail = "The provided URL is invalid. Please double check your link."
        elif "Private video" in error_msg:
            detail = "This video is private and cannot be extracted."
        elif "Sign in to confirm your age" in error_msg:
            detail = "This content is age-restricted and requires authentication, which is not supported on this free server."
        else:
            detail = f"Extraction failed: {error_msg.split(';')[0]}"
            
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

if __name__ == "__main__":
    import uvicorn
    # In production, Render uses the PORT environment variable automatically
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
