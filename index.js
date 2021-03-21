require("dotenv").config();
const express = require("express");
const expressWebSocket = require("express-ws");
const websocketStream = require("websocket-stream/stream");
const SymblConnectionHelper = require('./symbl/SymblConnectionHelper');
const TwilioClient = require("twilio");
const uuid = require('uuid').v4;
const urlencoded = require('body-parser').urlencoded;
const {sdk} = require("symbl-node");

const {getSpeechFromText} = require('./tts');

const Agent = require('./agent');
const Timer = require('./timer');
const fs = require("fs");

const options = {
    key: fs.readFileSync(__dirname + '/../ssl/privkey1.pem'),
    cert: fs.readFileSync(__dirname + '/../ssl/fullchain1.pem'),
    // ca: fs.readFileSync(process.env.APP_SSL_CA)
}

const twilioClient = new TwilioClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const app = express();
const httpServ = require('https').createServer(options, app);
// extend express app with app.ws()
expressWebSocket(app, httpServ, {
    perMessageDeflate: false,
});

app.use(urlencoded({extended: false}));

const mode = process.env.MODE || 'receive_call';
const webHookDomain = process.env.WEBHOOK_DOMAIN;

const VoiceResponse = TwilioClient.twiml.VoiceResponse;

(async () => {
    return sdk.init({
        appId: process.env.SYMBL_APP_ID,
        appSecret: process.env.SYMBL_APP_SECRET
    });
})();
console.log('Symbl SDK Initialized.');


console.log('App is starting with config: \n', JSON.stringify({
    mode,
    webHookDomain
}, null, 2));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Responds with Twilio instructions to begin the stream
app.post("/twiml", (request, response) => {
    console.log('received: Call')
    const {From} = request.body;

    if (mode === 'receive_call') {
        const twimlResponse = new VoiceResponse();
        twimlResponse.connect()
            .stream({
                url: `wss://${webHookDomain}/media`
            }).parameter({ name: 'from', value: From });
        response.type('text/xml');
        response.send(twimlResponse.toString());
    }
    else if (mode === 'conference') {
        // Conference: caller 1 -> Common Number <- caller 2

        console.log('Joining in Conference : ', From);
        const twimlResponse = new VoiceResponse();

        const conferenceName = "Twilio-Symbl Test Conference";

        console.log('Starting Media stream. Track Mode: ');
        twimlResponse.connect()
            .stream({
                url: `wss://${webHookDomain}/media`, // Replace with your WebHook URL
                track: 'inbound_track'
            }).parameter({name: 'from', value: From});
        // Quick Conference, no beeps or music. Start/Stop as participants dial-in/hang up.
        twimlResponse.dial().conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            beep: false,
            waitUrl: `http://${webHookDomain}`
        }, conferenceName);
        response.type('text/xml');
        response.send(twimlResponse.toString());
        console.log('TwiML Response Sent: ', twimlResponse.toString());

    }
});

let id = undefined;
let orderId = 1;

// Media stream websocket endpoint
app.ws("/media", async (ws, req) => {
    const mediaStream = websocketStream(ws);
    let callSid;
    let from;
    let symblConnectionHelper;
    let connection;
    let speaker;

    if (!id) {
        id = uuid();
    }

    let agent = new Agent(orderId ++);
    let streamSid = null;

    const speak = async (text) => {
        const payload = Buffer.from(await getSpeechFromText(text), 'binary').toString('base64');
        ws.send(JSON.stringify({
                event: "media",
                streamSid: streamSid,
                media: {
                    payload: payload
                }
            }
        ));

        ws.send(JSON.stringify({
                event: "mark",
                streamSid: streamSid,
                mark: {
                    name: "mark label"
                }
            }
        ));
    }

    function onTimeOut() {
        let text = agent.silentFallback();
        if (!text) {
            if (agent.canHangUp()) {
                client.calls(callSid).update({twiml: '<Response><Hangup/></Response>'})
                return;
            }

            timer.resume();
            return;
        }
        return speak(text);
    }

    let timer = new Timer(onTimeOut, 10000);

    mediaStream.on('data', async (data) => {
        const msg = JSON.parse(data.toString("utf8"));
        if (msg.event === "start") {
            callSid = msg.start.callSid;
            streamSid = msg.start.streamSid;

            console.log("Call SID: " + callSid)

            from = msg.start.customParameters.from;

            speaker = null;

            const handlers = {
                'onSpeechDetected': (data) => {
                    /*if (data) {
                        const {punctuated} = data;
                        console.log(`Live: ${punctuated && punctuated.transcript}`);
                    }*/
                },
                'onMessage': async (data) => {
                    console.log(data[0].payload.content);
                    if (!data[0].payload.content) {
                        return;
                    }

                    timer.pause();

                    let text = await agent.process(data[0].payload.content);
                    console.log(text);

                    if (!text) {
                        if (agent.canHangUp()) {
                            await client.calls(callSid).update({twiml: '<Response><Hangup/></Response>'})
                            return;
                        }

                        timer.resume();
                        return;
                    }

                    if (agent.sms) {
                        const notificationOpts = {
                            toBinding: JSON.stringify({
                                binding_type: 'sms',
                                address: from,
                            }),
                            body: agent.sms,
                        };

                        twilioClient.notify
                            .services(process.env.TWILIO_NOTIFY_SERVICE_SID)
                            .notifications.create(notificationOpts).then().catch(e => console.log(e))
                    }

                    return speak(text);
                },
                'onInsight': (data) => {
                    // When an insight is detected
                    // console.log('onInsight', JSON.stringify(data));
                }
            };

            setTimeout(async () => {
                await speak(agent.makeWelcome());
            }, 1000)

            console.log('starting symbl.ai connection')
            symblConnectionHelper = new SymblConnectionHelper({sdk, speaker, handlers});
            connection = await symblConnectionHelper.startConnection(id, {speaker});
        } else if (msg.event === 'media') {
            if (connection) {
                symblConnectionHelper.sendAudio(msg.media.payload, 'base64');
            }
        } else if (msg.event === 'mark') {
            if (agent.canHangUp()) {
                agent.endCall = false;
                await client.calls(callSid).update({twiml: '<Response><Hangup/></Response>'})
                return;
            }

            timer.restart();
        }
    });

    mediaStream.on("close", async () => {
        console.log('close')
        timer.stop();
        const conversationData = await connection.stop();
    });
});

const listener = httpServ.listen(process.env.APP_PORT, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
