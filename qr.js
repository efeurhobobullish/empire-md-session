const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const pino = require("pino");
const { toBuffer } = require("qrcode");
const { upload } = require('./mega');

let router = express.Router();

if (fs.existsSync('./session')) {
    fs.emptyDirSync('./session');
}

router.get('/', async (req, res) => {

    async function EmpireQr() {
        try {
            // ✅ SAME FIX needed here
            const baileys = await import('baileys');

            const makeWASocket = baileys.default;
            const {
                useMultiFileAuthState,
                delay,
                makeCacheableSignalKeyStore,
                Browsers,
                jidNormalizedUser
            } = baileys;

            const { state, saveCreds } = await useMultiFileAuthState('./session');

            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" })
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // ✅ QR OUTPUT
                if (qr && !res.headersSent) {
                    try {
                        const buffer = await toBuffer(qr);
                        res.setHeader('Content-Type', 'image/png');
                        res.end(buffer);
                    } catch (e) {
                        console.log("QR error:", e);
                    }
                }

                // ✅ CONNECTED
                if (connection === "open") {
                    try {
                        await delay(10000);

                        const user_jid = jidNormalizedUser(sock.user.id);

                        function randomMegaId(length = 6, numberLength = 4) {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += chars[Math.floor(Math.random() * chars.length)];
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const mega_url = await upload(
                            fs.createReadStream('./session/creds.json'),
                            `${randomMegaId()}.json`
                        );

                        const sid = mega_url.replace('https://mega.nz/file/', '');

                        await sock.sendMessage(user_jid, { text: sid });

                        await delay(5000);

                        await sock.sendMessage(user_jid, {
                            text: `> QR CONNECTED SUCCESSFULLY ✅\n\nSession ID:\n${sid}`
                        });

                    } catch (e) {
                        exec('pm2 restart empire-md-session');
                    }

                    await delay(100);
                    fs.emptyDirSync('./session');
                    process.exit(0);
                }

                // 🔁 RECONNECT
                else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    EmpireQr();
                }
            });

        } catch (err) {
            console.log("ERROR:", err);
            exec('pm2 restart empire-md-session');
            fs.emptyDirSync('./session');

            if (!res.headersSent) {
                res.status(503).send({ error: "Service Unavailable" });
            }
        }
    }

    EmpireQr();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception:', err);
    exec('pm2 restart empire-md-session');
});

module.exports = router;
