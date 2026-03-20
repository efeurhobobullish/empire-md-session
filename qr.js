const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
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

let router = express.Router();

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
                browser: ["Mac OS", "Safari", "14.0"],
            });

            EmpireQrWeb.ev.on('creds.update', saveCreds);
            EmpireQrWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr) {
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'image/png');
                        try {
                            const qrBuffer = await toBuffer(qr);
                            res.end(qrBuffer);
                            return;
                        } catch {
                            return;
                        }
                    }
                }

                if (connection === "open") {
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

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                        const sid = mega_url.replace('https://mega.nz/file/', '');

                        await EmpireQrWeb.sendMessage(user_jid, { text: sid });

                        await delay(5000);
                        await EmpireQrWeb.sendMessage(user_jid, {
                            text: `> PAIR CODE CONNECTED SUCCESSFULLY ✅  \n\n╭────「 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 」────◆  \n│ ∘ ʀᴇᴘᴏ:  \n│ ∘ tinyurl.com/Empire-Tech  \n│──────────────────────  \n│ ∘ Gʀᴏᴜᴘ:  \n│ ∘ tinyurl.com/EMPIRE-MD-GROUP  \n│──────────────────────  \n│ ∘ CHANNEL:  \n│ ∘ tinyurl.com/EMPIRE-MD-CHANNEL  \n│──────────────────────  \n│ ∘ Yᴏᴜᴛᴜʙᴇ:  \n│ ∘ youtube.com/only_one_empire  \n│──────────────────────  \n│ ∘ 𝙴𝙼𝙿𝙸𝚁𝙴-𝙼𝙳 𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙴𝚖𝚙𝚒𝚛𝚎 𝚃𝚎𝚌𝚑  \n╰──────────────────────`
                        });

                    } catch {
                        exec('pm2 restart empire-md-session');
                    }

                    await delay(100);
                    fs.emptyDirSync('./session');
                    process.exit(0);
                }

                if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    EmpireQr();
                }
            });

        } catch {
            exec('pm2 restart empire-md-session');
            fs.emptyDirSync('./session');
            if (!res.headersSent) res.status(503).send({ error: "Service Unavailable" });

            setTimeout(() => {
                EmpireQr();
            }, 5000);
        }
    }

    EmpireQr();
});

process.on('uncaughtException', () => {
    exec('pm2 restart empire-md-session');
});

module.exports = router;
