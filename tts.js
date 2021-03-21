const textToSpeech = require('@google-cloud/text-to-speech');
const WaveFile = require('wavefile').WaveFile;

const client = new textToSpeech.TextToSpeechClient();

async function getSpeechFromText(text) {
    const request = {
        input: {text: text},
        voice: {languageCode: 'en-US', ssmlGender: 'FEMALE'},
        audioConfig: {audioEncoding: 'LINEAR16'},
    };

    const [response] = await client.synthesizeSpeech(request);

    const wav = new WaveFile(response.audioContent);
    wav.toBitDepth('8')
    wav.toSampleRate(8000)
    wav.toMuLaw()

    return wav.data.samples;
}

module.exports = {
    getSpeechFromText
};
