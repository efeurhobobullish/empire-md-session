const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { toBuffer } = require("qrcode");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("baileys");
const { upload } = require('./mega');



if (fs.existsSync('./session')) {
    fs.emptyDirSync('./session');
}


router.get('/', async (req, res) => {
    async function EmpireQr() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let EmpireQrWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            EmpireQrWeb.ev.on('creds.update', saveCreds);
            EmpireQrWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr) {
                    console.log("QR Code received!");
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'image/png');
                        try {
                            const qrBuffer = await toBuffer(qr);
                            res.end(qrBuffer);
                            return;
                        } catch (error) {
                            console.error("Error generating QR Code buffer:", error);
                            return;
                        }
                    }
                }

                if (connection === "open") {
                    console.log("Connection opened successfully!");

                    try {
                        await delay(10000); 
                        const authPath = './session/';
                        const user_jid = jidNormalizedUser(EmpireQrWeb.user.id);

                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const sessionFile = authPath + 'creds.json';
                        const mega_url = await upload(fs.createReadStream(sessionFile), `${randomMegaId()}.json`);

                        const sid = mega_url.replace('https://mega.nz/file/', '');

                        await EmpireQrWeb.sendMessage(user_jid, { text: sid });

                        await delay(5000);
                        await EmpireQrWeb.sendMessage(user_jid, {
                            text: `> QR CODE CONNECTED SUCCESSFULLY ✅  \n\n╭────「 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 」────◆  \n│ ∘ ʀᴇᴘᴏ:  \n│ ∘ tinyurl.com/Empire-Tech  \n│──────────────────────  \n│ ∘ Gʀᴏᴜᴘ:  \n│ ∘ tinyurl.com/EMPIRE-MD-GROUP  \n│──────────────────────  \n│ ∘ CHANNEL:  \n│ ∘ tinyurl.com/EMPIRE-MD-CHANNEL  \n│──────────────────────  \n│ ∘ Yᴏᴜᴛᴜʙᴇ:  \n│ ∘ youtube.com/only_one_empire  \n│──────────────────────  \n│ ∘ © 2025–2026 𝖤𝗆𝗉𝗂𝗋𝖾 𝖳𝖾𝖼𝗁  \n╰──────────────────────`
                        });
                    } catch (e) {
                        exec('pm2 restart empire-md-session');
                    }
                    await delay(100);
                    fs.emptyDirSync('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    EmpireQr();
                }
            });
        } catch (err) {
            exec('pm2 restart empire-md-session');
            console.log("Service restarted");
            EmpirePair();
            fs.emptyDirSync('./session');
            if (!res.headersSent) {
                res.status(503).send({ error: "Service Unavailable" });
            }
        }
    }
    EmpireQr();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart empire-md-session');
});

module.exports = router;
