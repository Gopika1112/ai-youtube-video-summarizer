export async function fetchTranscript(videoId: string) {
    const logPrefix = `[NEURAL_V7-FIX][${videoId}]`;
    try {
        console.log(`${logPrefix} Engaging Signal Hijack Profile...`);
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+417; VISIT=1', // Hard-coded working consent
        };

        const response = await fetch(watchUrl, { headers, cache: 'no-store' });
        const html = await response.text();
        
        let tracks = null;
        // The most resilient way to find caption tracks
        const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/);
        if (playerResponseMatch) {
            try {
                const data = JSON.parse(playerResponseMatch[1]);
                tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            } catch {}
        }
        
        if (!tracks) {
            const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
            if (tracksMatch) {
                try { tracks = JSON.parse(tracksMatch[1]); } catch {}
            }
        }
        
        if (!tracks || !Array.isArray(tracks)) {
            console.log(`${logPrefix} Intelligence Signal Missing. Throttled.`);
            return null;
        }
        
        // Find best English track
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const track = tracks.find((t: any) => t.languageCode === 'en' || t.vssId?.includes('en')) || tracks[0];
        console.log(`${logPrefix} Target Locked: ${track.languageCode}`);

        // Construct the hardened timedtext URL
        let tUrl = track.baseUrl;
        tUrl = tUrl.replace(/&amp;/g, '&');
        if (!tUrl.includes('fmt=json3')) {
            tUrl = tUrl.replace(/fmt=[^&]+/, 'fmt=json3');
            if (!tUrl.includes('fmt=')) tUrl += '&fmt=json3';
        }

        // The "Secret Sauce": timedtext needs specific headers to avoid 0-byte body
        console.log(`${logPrefix} Hijacking Signal...`);
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
        if (!text || text.length < 10) {
            console.warn(`${logPrefix} Hijack Refused. YouTube returned empty signal.`);
            return null;
        }

        if (text.startsWith('{')) {
            const json = JSON.parse(text);
            if (json.events) {
                return json.events
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((ev: any) => ev.segs)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((ev: any) => ({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        text: ev.segs.map((s: any) => s.utf8).join(''),
                        offset: ev.tStartMs / 1000,
                        duration: (ev.dDurationMs || 0) / 1000
                    }));
            }
        } else {
            // XML Robust Parser
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error(`${logPrefix} Signal Lost:`, err.message);
        return null;
    }
}
