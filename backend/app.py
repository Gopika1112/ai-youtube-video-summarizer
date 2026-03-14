from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import time
import logging
# Google Generative AI restored as fallback
import google.generativeai as genai
from groq import Groq
from dotenv import load_dotenv
import yt_dlp
import requests
import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled, YouTubeRequestFailed

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
# Load .env.local from the project root (one level up from backend/)
env_local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
if os.path.exists(env_local_path):
    load_dotenv(env_local_path, override=True)
    logger.info(f"Loaded environment variables from {env_local_path}")
else:
    logger.warning(f"Environment file not found at {env_local_path}")

app = Flask(__name__)

def _extract_json(text):
    """Helper to extract JSON from AI response, handling markdown blocks and surrounding text."""
    # Attempt 1: Look for JSON code blocks
    json_match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
    if json_match:
        return json_match.group(1).strip()
    
    # Attempt 2: Look for any code block
    any_block_match = re.search(r'```\s*(\{.*?\})\s*```', text, re.DOTALL)
    if any_block_match:
        return any_block_match.group(1).strip()
    
    # Attempt 3: Look for the first occurrence of '{' and last occurrence of '}'
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace:last_brace+1].strip()
        
    return text.strip()

# In-memory cache for transcripts and descriptions
TRANSCRIPT_CACHE = {}

def fetch_transcript_with_backoff(video_id, max_retries=5):
    """Fetch transcript with exponential backoff for rate limits."""
    delay = 5  # start with 5 seconds
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to fetch transcript for {video_id} (Attempt {attempt+1}/{max_retries})")
            
            # Try to get English transcripts first
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB'])
            except Exception:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                
            full_transcript = " ".join([t['text'] for t in transcript_list])
            logger.info(f"Successfully fetched transcript for {video_id}")
            return full_transcript
            
        except (NoTranscriptFound, TranscriptsDisabled) as e:
            logger.warning(f"Transcript unavailable for {video_id}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error fetching transcript for {video_id} (Attempt {attempt+1}): {str(e)}")
            
            # Only retry on rate limit or request failure errors
            if "429" in str(e) or "Too Many Requests" in str(e) or isinstance(e, YouTubeRequestFailed):
                if attempt < max_retries - 1:
                    logger.info(f"Rate limit or request failure. Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= 2  # double the delay each retry
                    continue
            return None
    return None

def extract_transcript_with_ytdlp(video_id):
    """
    Fallback: Fetch subtitles using yt-dlp and return as plain text.
    Useful when youtube-transcript-api fails due to formatting issues.
    """
    logger.info(f"Attempting to extract subtitles via yt-dlp for {video_id}")
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en.*'],
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            
            # Check for requested subtitles
            requested_subtitles = info.get('requested_subtitles')
            pick = None
            
            if requested_subtitles:
                lang_code = list(requested_subtitles.keys())[0]
                pick = requested_subtitles[lang_code]
            else:
                # If not automatically populated, try to find in 'subtitles' or 'automatic_captions'
                subtitles = info.get('subtitles', {})
                auto_subs = info.get('automatic_captions', {})
                
                # Pick English (priority: manual -> auto)
                for lang in ['en', 'en-US', 'en-GB']:
                    if lang in subtitles:
                        pick = subtitles[lang]
                        break
                
                if not pick:
                    for lang in ['en', 'en-US', 'en-GB']:
                        if lang in auto_subs:
                            pick = auto_subs[lang]
                            break
            
            if not pick:
                logger.warning(f"No English subtitles found via yt-dlp for {video_id}")
                return None
                
            # If pick is a list (from info['subtitles']), take the best format
            if isinstance(pick, list):
                formats = {f['ext']: f['url'] for f in pick}
                url = formats.get('json3') or formats.get('vtt') or pick[0]['url']
                ext = 'json3' if 'json3' in formats else 'vtt'
            else:
                url = pick['url']
                ext = pick['ext']

            # Fetch the subtitle content
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                logger.error(f"Failed to download subtitles from {url}")
                return None
            
            content = response.text
            
            if ext == 'json3' or 'json3' in url:
                try:
                    data = json.loads(content)
                    lines = []
                    for event in data.get('events', []):
                        if 'segs' in event:
                            text = "".join([s['text'] for s in event['segs'] if 'text' in s])
                            if text.strip():
                                lines.append(text.strip())
                    logger.info(f"Successfully parsed JSON3 subtitles for {video_id}")
                    return " ".join(lines)
                except Exception as e:
                    logger.warning(f"Failed to parse JSON3 subtitles: {str(e)}")
            
            # Fallback: simple VTT/SRT cleanup (regex)
            # Remove timestamps and metadata
            clean_content = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*\n', '', content)
            clean_content = re.sub(r'<[^>]*>', '', clean_content)
            clean_content = re.sub(r'WEBVTT.*\n', '', clean_content)
            clean_content = re.sub(r'Kind:.*\n', '', clean_content)
            clean_content = re.sub(r'Language:.*\n', '', clean_content)
            
            # Collapse multiple spaces and newlines
            lines = [line.strip() for line in clean_content.split('\n') if line.strip()]
            transcript = " ".join(lines)
            logger.info(f"Successfully extracted VTT subtitles for {video_id}")
            return transcript

    except Exception as e:
        logger.error(f"Error in extract_transcript_with_ytdlp for {video_id}: {str(e)}")
        return None

def fallback_transcript(video_id):
    """Fallback: Fetch video title and description using yt-dlp."""
    logger.info(f"Falling back to video description for {video_id}")
    try:
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'force_generic_extractor': False,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            info = ydl.extract_info(video_url, download=False)
            description = info.get('description', '')
            title = info.get('title', 'Unknown Title')
            
            if description or title:
                logger.info(f"Successfully fetched details via fallback for {video_id}")
                return f"Title: {title}\n\nDescription:\n{description}"
            else:
                logger.warning(f"No description/title found for {video_id}")
                return None
    except Exception as e:
        logger.error(f"Error fetching description for {video_id} using yt-dlp: {str(e)}")
        return None

def get_transcript_and_metadata(video_id):
    """Unified logic to get transcript or description with caching."""
    if video_id in TRANSCRIPT_CACHE:
        logger.info(f"Cache hit for {video_id}")
        return TRANSCRIPT_CACHE[video_id]

    # 1. Try standard transcript API first
    content = fetch_transcript_with_backoff(video_id)
    content_type = "transcript_standard"

    # 2. Try yt-dlp transcript extraction as robust fallback
    if not content:
        content = extract_transcript_with_ytdlp(video_id)
        content_type = "transcript_robust"

    # 3. Fallback to description
    if not content:
        content = fallback_transcript(video_id)
        content_type = "description"

    if content:
        TRANSCRIPT_CACHE[video_id] = (content, content_type)
        return content, content_type

    return None, None


def summarize_with_ai(content, content_type, video_url):
    """Summarize content using Groq as the primary engine with retries."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        logger.error("GROQ_API_KEY missing")
        return None

    prompt = f"""
    You are a professional YouTube video summarizer and content analyst.
    Summarize the following YouTube video content ({content_type}). 
    
    Provide the output as a clean, valid JSON object with the following structure:
    {{
      "short_summary": "A high-impact 1-2 sentence overview.",
      "detailed_summary": "A comprehensive multiple-paragraph analysis (3-5 paragraphs) covering all major points discussed.",
      "key_takeaways": ["List of 5-8 bullet points representing crucial lessons or facts."],
      "important_insights": ["3-5 deep dives into specific nuances or technical details mentioned."],
      "video_title": "A compelling and professional title for the summary.",
      "video_url": "{video_url}",
      "key_moments": [
        {{
          "title": "Segment Theme",
          "description": "Short description of what happens",
          "timestamp": 0.0
        }}
      ]
    }}
    
    Content Preview (up to 15,000 characters):
    ---
    {content[:15000]}
    ---
    
    CRITICAL: Output ONLY the JSON object. Do not include markdown code blocks like ```json ... ```. Ensure all strings are properly escaped.
    """

    max_retries = 3
    delay = 2.0
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Attempting summarization with Groq (Attempt {attempt}/{max_retries})...")
            client = Groq(api_key=groq_key)
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional video summarizer. Respond only in valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"}
            )
            summary_data = json.loads(chat_completion.choices[0].message.content)
            logger.info("Groq summarization successful")
            return summary_data
        except Exception as e:
            err_msg = str(e).lower()
            is_rate_limit = "rate_limit" in err_msg or "429" in err_msg or "limit exceeded" in err_msg
            
            if is_rate_limit and attempt < max_retries:
                logger.warning(f"Groq rate limit hit. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2
                continue
            
            logger.error(f"Groq summarization failed on attempt {attempt}: {str(e)}")
            if attempt == max_retries:
                break

    # --- FALLBACK ENGINE: GEMINI ---
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        logger.info("Groq exhausted. Engaging Gemini Fallback...")
        try:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            # Request JSON response
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                ),
            )
            
            summary_data = json.loads(response.text)
            logger.info("Gemini summarization successful")
            return summary_data
        except Exception as ge:
            logger.error(f"Gemini fallback failed: {str(ge)}")

    return None

CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def home():
    # Return basic diagnostic info
    return jsonify({
        "status": "healthy", 
        "message": "YouTube Summarizer Intelligence API is active (Groq Primary)",
        "version": "1.2.0",
        "diagnostics": {
            "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
            "transcript_cache_size": len(TRANSCRIPT_CACHE)
        }
    }), 200

@app.route('/summarize', methods=['POST'])
@app.route('/summarize/', methods=['POST'])
def summarize():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing request body"}), 400
            
        video_url = data.get('url')
        if not video_url:
            return jsonify({"error": "No URL provided"}), 400
        
        # Extract video ID
        if "v=" in video_url:
            video_id = video_url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split("youtu.be/")[1].split("?")[0]
        else:
            video_id = video_url

        logger.info(f"Summarize request received for video: {video_id}")

        # 1. Fetch Content (with retries and caching)
        try:
            content, content_type = get_transcript_and_metadata(video_id)
        except Exception as e:
            logger.error(f"Critical failure in get_transcript_and_metadata: {str(e)}", exc_info=True)
            return jsonify({"error": f"Internal error during content retrieval: {str(e)}"}), 500

        if not content:
            return jsonify({
                "error": "Access Denied by YouTube. We couldn't fetch the transcript or description for this video. It might be age-restricted or private.",
                "video_id": video_id,
                "code": "YOUTUBE_FETCH_FAILED"
            }), 404

        # 2. AI Summarization with fallback
        try:
            summary_data = summarize_with_ai(content, content_type, video_url)
        except Exception as e:
            logger.error(f"Critical failure in summarize_with_ai: {str(e)}", exc_info=True)
            return jsonify({"error": f"Internal error during AI synthesis: {str(e)}"}), 500

        if not summary_data:
            return jsonify({
                "error": "Neural synthesis engine failed to resolve. Groq summarization is currently unresponsive.",
                "video_id": video_id,
                "code": "AI_SYNTHESIS_FAILED"
            }), 503

        # Add source meta to response
        summary_data["source_used"] = content_type

        return jsonify({
            "video_id": video_id,
            "summary": summary_data
        })
    except Exception as e:
        logger.error(f"Fatal unhandled error in /summarize: {str(e)}", exc_info=True)
        return jsonify({"error": f"A fatal error occurred on the backend: {str(e)}"}), 500

if __name__ == "__main__":
    # Use the PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
