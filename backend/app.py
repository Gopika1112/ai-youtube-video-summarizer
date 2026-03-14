from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled
import os
import google.generativeai as genai
import json

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def home():
    return jsonify({"status": "healthy", "message": "YouTube Summarizer API is running"}), 200

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

    try:
        print(f"Attempting primary fetch for {video_id}...")
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            print("Primary fetch success!")
        except Exception as primary_error:
            print(f"Primary fetch failed: {primary_error}. Attempting yt-dlp fallback...")
            import yt_dlp
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en.*'],
                'quiet': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                # Some videos don't have subs in a format we can easily parse here without extra complexity
                # but yt-dlp can at least confirm if they exist.
                # For now, if primary fails, we try to at least get the description as a last resort
                description = info.get('description', '')
                if not description:
                     raise Exception("Could not find transcript or description")
                transcript_list = [{'text': f"Title: {info.get('title')}\nDescription: {description}"}]
                print("yt-dlp fallback success (using description)!")

        # Build full text transcript
        full_transcript = " ".join([t['text'] for t in transcript_list])

        # --- AI SUMMARIZATION ---
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY not found in server environment"}), 500
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Summarize the following YouTube video transcript.
        Provide the output in a JSON format with exactly these keys:
        - short_summary: A 1-2 sentence overview.
        - detailed_summary: A thorough multiple-paragraph breakdown.
        - key_takeaways: A list of 5-8 bullet points.
        - important_insights: A list of 3-5 deep dives.
        - video_title: Use 'YouTube Intelligence Report'
        - video_url: {video_url}
        - key_moments: A list of objects with 'title', 'description', and 'timestamp' (float).
        
        Transcript:
        {full_transcript[:10000]}  # Limit to avoid token issues
        """
        
        response = model.generate_content(prompt)
        # Extract JSON from response (handling potential markdown formatting)
        raw_text = response.text
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        summary_data = json.loads(raw_text)

        return jsonify({
            "video_id": video_id,
            "summary": summary_data
        })

    except NoTranscriptFound:
        return jsonify({"error": "No transcript found for this video. Try a video with subtitles."}), 404
    except TranscriptsDisabled:
        return jsonify({"error": "Transcripts are disabled for this video."}), 403
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"ERROR: {error_msg}")
        return jsonify({"error": str(e), "details": error_msg}), 500

if __name__ == "__main__":
    # Use the PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
