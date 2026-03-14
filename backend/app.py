from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled
import os
import google.generativeai as genai
import json
from groq import Groq
from dotenv import load_dotenv

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

    try:
        print(f"Attempting primary fetch for {video_id}...")
        try:
            # youtube-transcript-api v0.6+ uses instance-based API
            from youtube_transcript_api import YouTubeTranscriptApi as YtApi
            ytt_api = YtApi()
            fetched = ytt_api.fetch(video_id)
            # .fetch() returns a FetchedTranscript object; convert to list of dicts
            transcript_list = [{'text': snippet.text, 'start': snippet.start} for snippet in fetched]
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
        
        # Try multiple models in case one is restricted or not found
        models_to_try = [
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
        ]
        
        model = None
        last_gen_error = None
        
        for model_name in models_to_try:
            try:
                print(f"Checking model {model_name}...")
                model = genai.GenerativeModel(model_name)
                # We don't verify here to save latency, fallback system will handle errors
                break 
            except Exception as e:
                print(f"Model {model_name} initialization failed: {e}")
                last_gen_error = e
                continue
        
        if not model:
            raise Exception(f"Failed to initialize any Gemini models. Last error: {last_gen_error}")

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
        {full_transcript[:15000]}  # Slightly higher limit for better quality
        """
        
        try:
            response = model.generate_content(prompt)
            summary_data = json.loads(_extract_json(response.text))
        except Exception as e:
            # --- GROQ FALLBACK ---
            print(f"Gemini failed: {e}. Attempting Groq fallback...")
            groq_key = os.environ.get("GROQ_API_KEY")
            if not groq_key:
                raise e
            
            try:
                client = Groq(api_key=groq_key)
                chat_completion = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional video summarizer. Respond only in valid JSON following the requested schema. Ensure all fields are present: short_summary, detailed_summary, key_takeaways, important_insights, video_title, video_url, key_moments."
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
                print("Groq fallback success!")
            except Exception as groq_err:
                print(f"Groq also failed: {groq_err}")
                import traceback
                print(traceback.format_exc())
                raise e

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
