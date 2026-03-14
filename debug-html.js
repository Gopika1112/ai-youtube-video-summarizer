async function test() {
    const vid = 'LNHBMFCzznE';
    const url = `https://www.youtube.com/watch?v=${vid}`;
    
    try {
        console.log('Fetching URL:', url);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const html = await res.text();
        
        console.log('HTML Length:', html.length);
        
        let tracks = null;
        const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/);
        if (playerMatch) {
            console.log('Found ytInitialPlayerResponse');
            const playerResponse = JSON.parse(playerMatch[1]);
            tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        }
        
        if (tracks) {
            console.log('Total Tracks Found:', tracks.length);
            const en = tracks.find(t => t.languageCode === 'en' || t.vssId.includes('en'));
            if (en) {
                let tUrl = en.baseUrl;
                if (!tUrl.includes('fmt=json3')) tUrl += '&fmt=json3';
                console.log('Fetching JSON from:', tUrl);
                const transcriptRes = await fetch(tUrl, {
                    headers: {
                        'Referer': 'https://www.youtube.com/',
                        'Origin': 'https://www.youtube.com'
                    }
                });
                const text = await transcriptRes.text();
                console.log('Response Status:', transcriptRes.status);
                console.log('Response Body Length:', text.length);
                if (text.length > 0) {
                    console.log('JSON Snippet:', text.slice(0, 100));
                }
            } else {
                console.log('No English track found.');
            }
        } else {
            console.log('No tracks found.');
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
