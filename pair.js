const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { upload } = require('./mega');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("baileys");

if (fs.existsSync('./session')) {
    fs.emptyDirSync('./session');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function EmpirePair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let EmpirePairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!EmpirePairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await EmpirePairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            EmpirePairWeb.ev.on('creds.update', saveCreds);
            EmpirePairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        const auth_path = './session/';
                        const user_jid = jidNormalizedUser(EmpirePairWeb.user.id);

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

                        await EmpirePairWeb.sendMessage(user_jid, { text: sid });

                        await delay(5000);
                        await EmpirePairWeb.sendMessage(user_jid, {
                            text: `> PAIR CODE CONNECTED SUCCESSFULLY ✅  \n\n╭────「 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 」────◆  \n│ ∘ ʀᴇᴘᴏ:  \n│ ∘ tinyurl.com/Empire-Tech  \n│──────────────────────  \n│ ∘ Gʀᴏᴜᴘ:  \n│ ∘ tinyurl.com/EMPIRE-MD-GROUP  \n│──────────────────────  \n│ ∘ CHANNEL:  \n│ ∘ tinyurl.com/EMPIRE-MD-CHANNEL  \n│──────────────────────  \n│ ∘ Yᴏᴜᴛᴜʙᴇ:  \n│ ∘ youtube.com/only_one_empire  \n│──────────────────────  \n│ ∘ 𝙴𝙼𝙿𝙸𝚁𝙴-𝙼𝙳 𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙴𝚖𝚙𝚒𝚛𝚎 𝚃𝚎𝚌𝚑  \n╰──────────────────────`
                        });
                    } catch (e) {
                        exec('pm2 restart empire-md-session');
                    }
                    await delay(100);
                    fs.emptyDirSync('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    EmpirePair();
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
    EmpirePair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart empire-md-session');
});

module.exports = router;
