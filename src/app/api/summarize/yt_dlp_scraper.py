import sys
import json
import yt_dlp
import requests

def parse_json3(data):
    segments = []
    if 'events' in data:
        for event in data['events']:
            if 'segs' in event:
                text = "".join([s['utf8'] for s in event['segs']]).strip()
                if text:
                    segments.append({
                        "text": text,
                        "offset": event.get('tStartMs', 0) / 1000.0,
                        "duration": event.get('dDurationMs', 0) / 1000.0
                    })
    return segments

def get_transcript(url):
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist',
        'noplaylist': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'YouTube Video')
            subtitles = info.get('subtitles', {})
            auto_subs = info.get('automatic_captions', {})
            all_subs = {**auto_subs, **subtitles}
            
            if not all_subs:
                return {"error": "No subtitles found for this video."}
            
            lang = 'en'
            if lang not in all_subs:
                lang = next(iter(all_subs))
            
            formats = all_subs[lang]
            sub_url = None
            for f in formats:
                if f.get('ext') == 'json3':
                    sub_url = f.get('url')
                    break
            
            if not sub_url:
                # If no json3, we'd need a more complex parser for vtt/srv1
                # But YouTube almost always provides json3 for auto-subs
                sub_url = formats[0].get('url')

            # Fetch the transcript content
            resp = requests.get(sub_url)
            if resp.status_code != 200:
                return {"error": f"Failed to fetch transcript content: {resp.status_code}"}
            
            raw_data = resp.json()
            segments = parse_json3(raw_data)
            
            return {
                "title": title,
                "segments": segments,
                "language": lang
            }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
    
    url = sys.argv[1]
    result = get_transcript(url)
    print(json.dumps(result))
