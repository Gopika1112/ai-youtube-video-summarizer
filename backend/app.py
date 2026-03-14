from flask import Flask, request, jsonify
from flask_cors import CORS
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
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

        # Build full text transcript
        full_transcript = " ".join([t['text'] for t in transcript_list])

        # --- AI SUMMARIZATION ---
        # Note: You need to set GEMINI_API_KEY in your Render environment variables
        import google.generativeai as genai
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
        import json
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
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Use the PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
