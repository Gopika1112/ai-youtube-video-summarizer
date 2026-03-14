export async function fetchTranscript(videoId: string) {
    const logPrefix = `[NEURAL_TRANSCRIPT_V8][${videoId}]`;
    try {
        console.log(`${logPrefix} Initiating Deep Hijack...`);
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

        const headers = {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };

        const response = await fetch(watchUrl, { headers, cache: 'no-store' });
        const html = await response.text();
        
        let tracks: any[] | null = null;
        
        // --- 1. Resilient JSON Extraction (Primary) ---
        const markers = ['ytInitialPlayerResponse = ', 'var ytInitialPlayerResponse = '];
        for (const marker of markers) {
            const startIdx = html.indexOf(marker);
            if (startIdx !== -1) {
                const jsonStart = startIdx + marker.length;
                let jsonStr = '';
                let bracketCount = 0;
                let foundStart = false;
                
                for (let i = jsonStart; i < html.length; i++) {
                    const char = html[i];
                    if (char === '{') {
                        bracketCount++;
                        foundStart = true;
                    } else if (char === '}') {
                        bracketCount--;
                    }
                    
                    if (foundStart) jsonStr += char;
                    if (foundStart && bracketCount === 0) break;
                }
                try {
                    const data = JSON.parse(jsonStr);
                    tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
                    if (tracks) break;
                } catch (e) {
                    console.warn(`${logPrefix} JSON Splicing failed for ${marker}`);
                }
            }
        }

        // --- 2. Fallback: captionTracks Regex ---
        if (!tracks) {
            const match = html.match(/"captionTracks":\s*(\[.*?\])/);
            if (match) {
                try { tracks = JSON.parse(match[1]); } catch {}
            }
        }
        
        if (!tracks || !Array.isArray(tracks)) {
            console.log(`${logPrefix} NO CAPTION TRACKS FOUND. Video might be silent or protected.`);
            return null;
        }
        
        // Find best English track
        const track = tracks.find((t: any) => t.languageCode === 'en' || t.vssId?.includes('en')) || tracks[0];
        console.log(`${logPrefix} Hijacking Track: ${track.languageCode} (${track.kind || 'manual'})`);

        // Construct formatted URL with token extraction
        let tUrl = track.baseUrl;
        tUrl = tUrl.replace(/&amp;/g, '&');
        if (!tUrl.includes('fmt=json3')) tUrl += '&fmt=json3';

        // Final fetching of timedtext signal
        const tResponse = await fetch(tUrl, {
            headers: {
                ...headers,
                'Referer': watchUrl,
                'Origin': 'https://www.youtube.com',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Dest': 'empty'
            },
            cache: 'no-store'
        });

        const text = await tResponse.text();
        if (!text || text.length < 5) {
            console.warn(`${logPrefix} SIGNAL EMPTY. YouTube blocked the timedtext stream.`);
            return null;
        }

        if (text.trim().startsWith('{')) {
            const json = JSON.parse(text);
            if (json.events) {
                return json.events
                    .filter((ev: any) => ev.segs)
                    .map((ev: any) => ({
                        text: ev.segs.map((s: any) => s.utf8).join(''),
                        offset: (ev.tStartMs || 0) / 1000,
                        duration: (ev.dDurationMs || 0) / 1000
                    }));
            }
        } else {
            // Robust XML Parser for legacy tracks
            const segments = [];
            const regex = /<text start="([\d.]+)" dur="([\d.]+)".*?>(.*?)<\/text>/g;
            let m;
            while ((m = regex.exec(text)) !== null) {
                segments.push({
                    text: m[3].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
                    offset: parseFloat(m[1]),
                    duration: parseFloat(m[2])
                });
            }
            if (segments.length > 0) return segments;
        }

        return null;
    } catch (err: any) {
        console.error(`${logPrefix} OVERRIDE FAILED:`, err.message);
        return null;
    }
}
