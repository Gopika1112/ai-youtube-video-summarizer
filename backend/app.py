from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled
import os

app = Flask(__name__)

# --- CORS CONFIGURATION ---
# Replace the origin with your actual Vercel domain
CORS(app, resources={r"/*": {"origins": ["https://ai-youtube-video-summarizer.vercel.app", "http://localhost:3000"]}})

@app.route('/summarize', methods=['POST'])
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

    try:
        # Load cookies if they exist
        # Tip: In Render, the file will be in the same folder as app.py
        cookies_path = os.path.join(os.path.dirname(__file__), "cookies.txt")
        
        if os.path.exists(cookies_path):
            print(f"Loading cookies from {cookies_path}...")
            transcript = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_path)
        else:
            print("No cookies.txt found. Trying without cookies...")
            transcript = YouTubeTranscriptApi.get_transcript(video_id)

        return jsonify({
            "video_id": video_id,
            "transcript": transcript
        })

    except NoTranscriptFound:
        return jsonify({"error": "No transcript found for this video. Try a video with subtitles."}), 404
    except TranscriptsDisabled:
        return jsonify({"error": "Transcripts are disabled for this video."}), 403
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Use the PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
