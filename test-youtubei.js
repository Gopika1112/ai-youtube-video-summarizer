/* eslint-disable */
const { Innertube } = require('youtubei.js');

async function test() {
    try {
        const youtube = await Innertube.create();
        const videoId = 'LNHBMFCzznE';
        
        console.log('Fetching video info...');
        const info = await youtube.getInfo(videoId);
        
        console.log('Fetching transcript...');
        const transcript = await info.getTranscript();
        
        if (transcript) {
            console.log('Transcript Found!');
            console.log('Sample Segment:', transcript.transcript.content.body.initial_segments[0].text);
            console.log('Total Segments:', transcript.transcript.content.body.initial_segments.length);
        } else {
            console.log('No transcript found via youtubei.js');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
