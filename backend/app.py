from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import time
import logging
from google import genai
from groq import Groq
from dotenv import load_dotenv
import yt_dlp
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
load_dotenv(".env.local")

app = Flask(__name__)

def _extract_json(text):
    """Helper to extract JSON from markdown or raw text"""
    if "```json" in text:
        return text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        return text.split("```")[1].split("```")[0].strip()
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
        return TRANSCRIPT_CACHE[video_id], "cached"

    # Try transcript first
    content = fetch_transcript_with_backoff(video_id)
    content_type = "transcript"

    # Fallback to description
    if not content:
        content = fallback_transcript(video_id)
        content_type = "description"

    if content:
        TRANSCRIPT_CACHE[video_id] = (content, content_type)
        return content, content_type

    return None, None


def summarize_with_ai(content, video_url):
    """Summarize content using Gemini with fallback to Groq."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY missing")
        return None

    prompt = f"""
    Summarize the following YouTube video content. 
    The content is either a transcript or a video description.
    Provide the output in a VALID JSON format with exactly these keys:
    - short_summary: A 1-2 sentence overview.
    - detailed_summary: A thorough multiple-paragraph breakdown.
    - key_takeaways: A list of 5-8 bullet points.
    - important_insights: A list of 3-5 deep dives.
    - video_title: A catchy title for the summary.
    - video_url: {video_url}
    - key_moments: A list of objects with 'title', 'description', and 'timestamp' (float, use 0.0 if not available).
    
    Content:
    {content[:15000]}
    
    IMPORTANT: Return ONLY valid JSON.
    """

    # Try Gemini
    try:
        client = genai.Client(api_key=api_key)
        models = ['gemini-2.0-flash', 'gemini-1.5-flash']
        
        for model_name in models:
            try:
                logger.info(f"Trying Gemini model: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                json_str = _extract_json(response.text)
                summary_data = json.loads(json_str)
                logger.info(f"Gemini {model_name} succeeded")
                return summary_data
            except Exception as e:
                logger.error(f"Gemini {model_name} failed: {str(e)}")
                continue
    except Exception as e:
        logger.error(f"Gemini client error: {str(e)}")

    # Fallback to Groq
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        logger.info("Attempting Groq fallback...")
        try:
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
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            summary_data = json.loads(chat_completion.choices[0].message.content)
            logger.info("Groq fallback successful")
            return summary_data
        except Exception as e:
            logger.error(f"Groq fallback failed: {str(e)}")

    return None

CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def home():
    return jsonify({
        "status": "healthy", 
        "message": "YouTube Summarizer Intelligence API is active",
        "version": "1.0.0"
    }), 200

@app.route('/summarize', methods=['POST'])
@app.route('/summarize/', methods=['POST'])
def summarize():
    data = request.json
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

    # Unified logic to get content (transcript or description) with retries and caching
    content, content_type = get_transcript_and_metadata(video_id)

    if not content:
        return jsonify({
            "error": "Could not retrieve transcript or video description after multiple attempts.",
            "video_id": video_id
        }), 404

    # 3. AI Summarization with fallback
    summary_data = summarize_with_ai(content, video_url)

    if not summary_data:
        return jsonify({
            "error": "AI summarization failed. Please try again later.",
            "video_id": video_id
        }), 500

    # Add source meta to response
    summary_data["source_used"] = content_type

    return jsonify({
        "video_id": video_id,
        "summary": summary_data
    })

if __name__ == "__main__":
    # Use the PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
