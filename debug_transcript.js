
const { getSubtitles } = require('youtube-captions-scraper');

async function test() {
    const videoId = 'COk0Sbbc_co';
    try {
        console.log('Trying youtube-captions-scraper...');
        const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });
        console.log('Success! Count:', subtitles.length);
        console.log('First:', subtitles[0]);
    } catch (e) {
        console.log('youtube-captions-scraper failed:', e.message);
    }
}

test();
