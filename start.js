const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 200;
const {
  default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    isJidBroadcast,
    AnyMessageContent,
    prepareWAMessageMedia,
    areJidsSameUser,
    downloadContentFromMessage,
    MessageRetryMap,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    generateMessageID, makeInMemoryStore,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
  } = require('@whiskeysockets/baileys')
  // 📝 Logging
const l = console.log;

// 📁 File System
const fs = require('fs');
const fse = require('fs-extra');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { tmpdir } = require("os");

// 📦 Core / Built-in Modules
const util = require('util');
const Crypto = require('crypto');
const { exec, spawn } = require("child_process");
const { Buffer } = require('buffer');

// 🧩 External Libraries
const P = require('pino');
const axios = require('axios');
const fetch = require('node-fetch');
const cheerio = require("cheerio");
const bodyparser = require('body-parser');
const FormData = require('form-data');
const PDFDocument = require('pdfkit');

// 📥 Media Handling
const FileType = require('file-type');
const { fromBuffer } = require('file-type');
const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const webp = require('node-webpmux');

// 🔊 TTS
const googleTTS = require('google-tts-api');

// 📹 FFmpeg Setup
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

// 💽 Caching
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 120 });

// 🌐 YouTube and Media Downloaders
const yts = require("yt-search");
const ddownr = require('denethdev-ytmp3');
const getFbVideoInfo = require("@xaviabot/fb-downloader");


// 📦 Sequelize (DB)
const { DataTypes } = require('sequelize');
const Sequelize = require('sequelize');

// ☁️ MEGA
const { File } = require('megajs');
const mime = require('mime-types');


// ⚙️ Configs and Others
const config = require('./config');

// ⏱️ Constants
var videotime = 60000; // 1000 min

// 📁 Directories
const storeDir = path.join(process.cwd(), 'start');
  //======================
  const prefix = config.PREFIX
  //===================
  const ownerNumber = config.OWNER_NUMBER
//======================================
  //**************** DATABASE .JS ************
class DatabaseManager {
    static instance = null;

    static getInstance() {
        if (!DatabaseManager.instance) {
            const DATABASE_URL = process.env.DATABASE_URL || './database.db';

            DatabaseManager.instance =
                DATABASE_URL === './database.db'
                    ? new Sequelize({
                            dialect: 'sqlite',
                            storage: DATABASE_URL,
                            logging: false,
                      })
                    : new Sequelize(DATABASE_URL, {
                            dialect: 'postgres',
                            ssl: true,
                            protocol: 'postgres',
                            dialectOptions: {
                                native: true,
                                ssl: { require: true, rejectUnauthorized: false },
                            },
                            logging: false,
                      });
        }
        return DatabaseManager.instance;
    }
}

const DATABASE = DatabaseManager.getInstance();

DATABASE.sync()
    .then(() => {
        console.log('🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Database synchronized successfully  📁...');
    })
    .catch((error) => {
        console.error('🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕  Error synchronizing the database ❗...', error);
    });

//***********************************

//******************* UPDATEDB .JS **********************
const UpdateDB = DATABASE.define('UpdateInfo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
        defaultValue: 1,
    },
    commitHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'update_info',
    timestamps: false,
    hooks: {
        beforeCreate: (record) => { record.id = 1; },
        beforeBulkCreate: (records) => {
            records.forEach(record => { record.id = 1; });
        },
    },
});

async function initializeUpdateDB() {
    await UpdateDB.sync();
    const [record, created] = await UpdateDB.findOrCreate({
        where: { id: 1 },
        defaults: { commitHash: 'unknown' },
    });
    return record;
}

async function setCommitHash(hash) {
    await initializeUpdateDB();
    const record = await UpdateDB.findByPk(1);
    record.commitHash = hash;
    await record.save();
}

async function getCommitHash() {
    await initializeUpdateDB();
    const record = await UpdateDB.findByPk(1);
    return record ? record.commitHash : 'unknown';
}
//***********************

//****************** FUNCTION .JS ******************
const getBuffer = async(url, options) => {
	try {
		options ? options : {}
		var res = await axios({
			method: 'get',
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) {
		console.log(e)
	}
}

const getGroupAdmins = (participants) => {
	var admins = []
	for (let i of participants) {
		i.admin !== null  ? admins.push(i.id) : ''
	}
	return admins
}

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
	var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
	var ma = Math.log10(Math.abs(eco)) / 3 | 0
	if (ma == 0) return eco
	var ppo = lyrik[ma]
	var scale = Math.pow(10, ma * 3)
	var scaled = eco / scale
	var formatt = scaled.toFixed(1)
	if (/\.0$/.test(formatt))
		formatt = formatt.substr(0, formatt.length - 2)
	return formatt + ppo
}

const isUrl = (url) => {
	return url.match(
		new RegExp(
			/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
			'gi'
		)
	)
}

const Json = (string) => {
    return JSON.stringify(string, null, 2)
}

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}
//**********************************

//********************* MSG .JS *****************


const downloadMediaMessage = async(m, filename) => {
    if (m.type === 'viewOnceMessage') {
        m.type = m.msg.type
    }
    if (m.type === 'imageMessage') {
        var nameJpg = filename ? filename + '.jpg' : 'undefined.jpg'
        const stream = await downloadContentFromMessage(m.msg, 'image')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameJpg, buffer)
        return fs.readFileSync(nameJpg)
    } else if (m.type === 'videoMessage') {
        var nameMp4 = filename ? filename + '.mp4' : 'undefined.mp4'
        const stream = await downloadContentFromMessage(m.msg, 'video')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameMp4, buffer)
        return fs.readFileSync(nameMp4)
    } else if (m.type === 'audioMessage') {
        var nameMp3 = filename ? filename + '.mp3' : 'undefined.mp3'
        const stream = await downloadContentFromMessage(m.msg, 'audio')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameMp3, buffer)
        return fs.readFileSync(nameMp3)
    } else if (m.type === 'stickerMessage') {
        var nameWebp = filename ? filename + '.webp' : 'undefined.webp'
        const stream = await downloadContentFromMessage(m.msg, 'sticker')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameWebp, buffer)
        return fs.readFileSync(nameWebp)
    } else if (m.type === 'documentMessage') {
        var ext = m.msg.fileName.split('.')[1].toLowerCase().replace('jpeg', 'jpg').replace('png', 'jpg').replace('m4a', 'mp3')
        var nameDoc = filename ? filename + '.' + ext : 'undefined.' + ext
        const stream = await downloadContentFromMessage(m.msg, 'document')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameDoc, buffer)
        return fs.readFileSync(nameDoc)
    }
}

const sms = (conn, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBot = m.id.startsWith('BAES') && m.id.length === 16
	m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? conn.user.id.split(':')[0]+'@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
        //m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
        //if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        try {
            m.body = (m.mtype === 'conversation') ? m.message.conversation : 
                     (m.mtype == 'imageMessage' && m.message.imageMessage.caption != undefined) ? m.message.imageMessage.caption : 
                     (m.mtype == 'videoMessage' && m.message.videoMessage.caption != undefined) ? m.message.videoMessage.caption : 
                     (m.mtype == 'extendedTextMessage' && m.message.extendedTextMessage.text != undefined) ? m.message.extendedTextMessage.text : 
                     (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                     (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                     (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';
        } catch {
            m.body = false
        }
        let quoted = (m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null);
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
       
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted	}
		
		
          if(quoted.viewOnceMessageV2)
          { 
            console.log("entered ==================================== ")
            //console.log ("m Is : ",m,"\nm Quoted is :",m.quoted ,"\n Quoted is : ",quoted,"\nviewOnce :  ", quoted.viewOnceMessageV2.message)
           
          } else 
          {
		    
		    
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBot = m.quoted.id ? m.quoted.id.startsWith('BAES') && m.quoted.id.length === 16 : false
	    m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
			m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
			if (!m.quoted.id) return false
			let q = await store.loadMessage(m.chat, m.quoted.id, conn)
 			return exports.sms(conn, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            /**
             * 
             * @returns 
             */
             let { chat, fromMe, id } = m.quoted;
			const key = {
				remoteJid: m.chat,
				fromMe: false,
				id: m.quoted.id,
				participant: m.quoted.sender
			}
            m.quoted.delete = async() => await conn.sendMessage(m.chat, { delete: key })

	   /**
		* 
		* @param {*} jid 
		* @param {*} forceForward 
		* @param {*} options 
		* @returns 
	   */
            m.forwardMessage = (jid, forceForward = true, options = {}) => conn.copyNForward(jid, vM, forceForward,{contextInfo: {isForwarded: false}}, options)

            /**
              *
              * @returns
            */
            m.quoted.download = () => conn.downloadMediaMessage(m.quoted)
	  }
        }
    }
    if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    /**
	* Reply to this message
	* @param {String|Object} text 
	* @param {String|false} chatId 
	* @param {Object} options 
	*/

       /**
	* Copy this message
	*/
	m.copy = () => exports.sms(conn, M.fromObject(M.toObject(m)))
	/**
	 * 
	 * @param {*} jid 
	 * @param {*} forceForward 
	 * @param {*} options 
	 * @returns 
	 */
	m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)
	m.sticker = (stik, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyimg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
        m.imgurl = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { image: {url: img }, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.reply = async (content,opt = { packname: "Secktor", author: "SamPandey001" }, type = "text")  => {
      switch (type.toLowerCase()) {
        case "text":{
          return await conn.sendMessage( m.chat, {  text: content }, { quoted:m });
                     }
        break;
      case "image": {
          if (Buffer.isBuffer(content)) {
            return await conn.sendMessage(m.chat, { image: content, ...opt },  { ...opt } );
          } else if (isUrl(content)) {
            return conn.sendMessage( m.chat, { image: { url: content }, ...opt },{ ...opt }  );
          }
        }
        break;
      case "video": {
        if (Buffer.isBuffer(content)) {
          return await conn.sendMessage(m.chat,  { video: content, ...opt },  { ...opt }   );
        } else if (isUrl(content)) {
          return await conn.sendMessage( m.chat,  { video: { url: content }, ...opt },  { ...opt }  );
        }
      }
      case "audio": {
          if (Buffer.isBuffer(content)) {
            return await conn.sendMessage( m.chat, { audio: content, ...opt }, { ...opt } );
          } else if (isUrl(content)) {
            return await conn.sendMessage( m.chat, { audio: { url: content }, ...opt }, { ...opt });
          }
        }
        break;
      case "template":
        let optional = await generateWAMessage(m.chat, content, opt);
        let message = { viewOnceMessage: { message: { ...optional.message,},   },};
        await conn.relayMessage(m.chat, message, { messageId: optional.key.id,});
        break;
      case "sticker":{
	  let { data, mime } = await conn.getFile(content);
          if (mime == "image/webp") {
          let buff = await writeExifWebp(data, opt);
            await conn.sendMessage(m.chat, { sticker: { url: buff }, ...opt }, opt );
          } else {
            mime = await mime.split("/")[0];
            if (mime === "video") {
              await conn.sendImageAsSticker(m.chat, content, opt);
            } else if (mime === "image") {
              await conn.sendImageAsSticker(m.chat, content, opt);
            }
          }
        }
        break;
    }
  }
	m.senddoc = (doc,type, id = m.chat, option = { mentions: [m.sender], filename: Config.ownername, mimetype: type,
	externalAdRepl: {
							title: Config.ownername,
							body: ' ',
							thumbnailUrl: ``,
							thumbnail: log0,
							mediaType: 1,
							mediaUrl: '',
							sourceUrl: gurl,
						} }) => conn.sendMessage(id, { document: doc, mimetype: option.mimetype, fileName: option.filename, contextInfo: {
	  externalAdReply: option.externalAdRepl,
	  mentionedJid: option.mentions } }, { quoted: m })
	
  	m.sendcontact = (name, info, number) => {
		var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
		conn.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m })
	}
	m.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })

    return m
}
//*******************************

//*************** STOR .JS ***********************
const readJSON = async (file) => {
  try {
    const filePath = path.join(storeDir, file);
    const data = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeJSON = async (file, data) => {
  const filePath = path.join(storeDir, file);
  await fsp.mkdir(storeDir, { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
};

const saveContact = async (jid, name) => {
  if (!jid || !name || isJidGroup(jid) || isJidBroadcast(jid) || isJidNewsletter(jid)) return;
  const contacts = await readJSON('contact.json');
  const index = contacts.findIndex((contact) => contact.jid === jid);
  if (index > -1) {
    contacts[index].name = name;
  } else {
    contacts.push({ jid, name });
  }
  await writeJSON('contact.json', contacts);
};

const getContacts = async () => {
  try {
    const contacts = await readJSON('contact.json');
    return contacts;
  } catch (error) {
    return [];
  }
};

const saveMessage = async (message) => {
  const jid = message.key.remoteJid;
  const id = message.key.id;
  if (!id || !jid || !message) return;
  await saveContact(message.sender, message.pushName);
  const messages = await readJSON('message.json');
  const index = messages.findIndex((msg) => msg.id === id && msg.jid === jid);
  const timestamp = message.messageTimestamp ? message.messageTimestamp * 1000 : Date.now();
  if (index > -1) {
    messages[index].message = message;
    messages[index].timestamp = timestamp;
  } else {
    messages.push({ id, jid, message, timestamp });
  }
  await writeJSON('message.json', messages);
};

const loadMessage = async (id) => {
  if (!id) return null;
  const messages = await readJSON('message.json');
  return messages.find((msg) => msg.id === id) || null;
};

const getName = async (jid) => {
  const contacts = await readJSON('contact.json');
  const contact = contacts.find((contact) => contact.jid === jid);
  return contact ? contact.name : jid.split('@')[0].replace(/_/g, ' ');
};

const saveGroupMetadata = async (jid, client) => {
  if (!isJidGroup(jid)) return;
  const groupMetadata = await client.groupMetadata(jid);
  const metadata = {
    jid: groupMetadata.id,
    subject: groupMetadata.subject,
    subjectOwner: groupMetadata.subjectOwner,
    subjectTime: groupMetadata.subjectTime
      ? new Date(groupMetadata.subjectTime * 1000).toISOString()
      : null,
    size: groupMetadata.size,
    creation: groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toISOString() : null,
    owner: groupMetadata.owner,
    desc: groupMetadata.desc,
    descId: groupMetadata.descId,
    linkedParent: groupMetadata.linkedParent,
    restrict: groupMetadata.restrict,
    announce: groupMetadata.announce,
    isCommunity: groupMetadata.isCommunity,
    isCommunityAnnounce: groupMetadata.isCommunityAnnounce,
    joinApprovalMode: groupMetadata.joinApprovalMode,
    memberAddMode: groupMetadata.memberAddMode,
    ephemeralDuration: groupMetadata.ephemeralDuration,
  };

  const metadataList = await readJSON('metadata.json');
  const index = metadataList.findIndex((meta) => meta.jid === jid);
  if (index > -1) {
    metadataList[index] = metadata;
  } else {
    metadataList.push(metadata);
  }
  await writeJSON('metadata.json', metadataList);

  const participants = groupMetadata.participants.map((participant) => ({
    jid,
    participantId: participant.id,
    admin: participant.admin,
  }));
  await writeJSON(`${jid}_participants.json`, participants);
};

const getGroupMetadata = async (jid) => {
  if (!isJidGroup(jid)) return null;
  const metadataList = await readJSON('metadata.json');
  const metadata = metadataList.find((meta) => meta.jid === jid);
  if (!metadata) return null;

  const participants = await readJSON(`${jid}_participants.json`);
  return { ...metadata, participants };
};

const saveMessageCount = async (message) => {
  if (!message) return;
  const jid = message.key.remoteJid;
  const sender = message.key.participant || message.sender;
  if (!jid || !sender || !isJidGroup(jid)) return;

  const messageCounts = await readJSON('message_count.json');
  const index = messageCounts.findIndex((record) => record.jid === jid && record.sender === sender);

  if (index > -1) {
    messageCounts[index].count += 1;
  } else {
    messageCounts.push({ jid, sender, count: 1 });
  }

  await writeJSON('message_count.json', messageCounts);
};

const getInactiveGroupMembers = async (jid) => {
  if (!isJidGroup(jid)) return [];
  const groupMetadata = await getGroupMetadata(jid);
  if (!groupMetadata) return [];

  const messageCounts = await readJSON('message_count.json');
  const inactiveMembers = groupMetadata.participants.filter((participant) => {
    const record = messageCounts.find((msg) => msg.jid === jid && msg.sender === participant.id);
    return !record || record.count === 0;
  });

  return inactiveMembers.map((member) => member.id);
};

const getGroupMembersMessageCount = async (jid) => {
  if (!isJidGroup(jid)) return [];
  const messageCounts = await readJSON('message_count.json');
  const groupCounts = messageCounts
    .filter((record) => record.jid === jid && record.count > 0)
    .sort((a, b) => b.count - a.count);

  return Promise.all(
    groupCounts.map(async (record) => ({
      sender: record.sender,
      name: await getName(record.sender),
      messageCount: record.count,
    }))
  );
};

const getChatSummary = async () => {
  const messages = await readJSON('message.json');
  const distinctJids = [...new Set(messages.map((msg) => msg.jid))];

  const summaries = await Promise.all(
    distinctJids.map(async (jid) => {
      const chatMessages = messages.filter((msg) => msg.jid === jid);
      const messageCount = chatMessages.length;
      const lastMessage = chatMessages.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      const chatName = isJidGroup(jid) ? jid : await getName(jid);

      return {
        jid,
        name: chatName,
        messageCount,
        lastMessageTimestamp: lastMessage ? lastMessage.timestamp : null,
      };
    })
  );

  return summaries.sort(
    (a, b) => new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp)
  );
};

const saveMessageV1 = saveMessage;
const saveMessageV2 = (message) => {
  return Promise.all([saveMessageV1(message), saveMessageCount(message)]);
};
//******************************

//***************** ANTIDELET .JS ********************
const AntiDelDB = DATABASE.define('AntiDelete', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
        defaultValue: 1,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: config.ANTI_DELETE || false,
    },
}, {
    tableName: 'antidelete',
    timestamps: false,
    hooks: {
        beforeCreate: record => { record.id = 1; },
        beforeBulkCreate: records => { records.forEach(record => { record.id = 1; }); },
    },
});

let isInitialized = false;

async function initializeAntiDeleteSettings() {
    if (isInitialized) return;
    try {
        // First sync the model to ensure table exists
        await AntiDelDB.sync();
        
        // Check if old schema exists
        const tableInfo = await DATABASE.getQueryInterface().describeTable('antidelete');
        if (tableInfo.gc_status) {
            // Migrate from old schema to new schema
            const oldRecord = await DATABASE.query('SELECT * FROM antidelete WHERE id = 1', { type: DATABASE.QueryTypes.SELECT });
            if (oldRecord && oldRecord.length > 0) {
                const newStatus = oldRecord[0].gc_status || oldRecord[0].dm_status;
                await DATABASE.query('DROP TABLE antidelete');
                await AntiDelDB.sync();
                await AntiDelDB.create({ id: 1, status: newStatus });
            }
        } else {
            // Create new record if doesn't exist
            await AntiDelDB.findOrCreate({
                where: { id: 1 },
                defaults: { status: config.ANTI_DELETE || false },
            });
        }
        isInitialized = true;
    } catch (error) {
        console.error('Error initializing anti-delete settings:', error);
        // If table doesn't exist at all, create it
        if (error.original && error.original.code === 'SQLITE_ERROR' && error.original.message.includes('no such table')) {
            await AntiDelDB.sync();
            await AntiDelDB.create({ id: 1, status: config.ANTI_DELETE || false });
            isInitialized = true;
        }
    }
}

async function setAnti(status) {
    try {
        await initializeAntiDeleteSettings();
        const [affectedRows] = await AntiDelDB.update({ status }, { where: { id: 1 } });
        return affectedRows > 0;
    } catch (error) {
        console.error('Error setting anti-delete status:', error);
        return false;
    }
}

async function getAnti() {
    try {
        await initializeAntiDeleteSettings();
        const record = await AntiDelDB.findByPk(1);
        return record ? record.status : (config.ANTI_DELETE || false);
    } catch (error) {
        console.error('Error getting anti-delete status:', error);
        return config.ANTI_DELETE || false;
    }
}

//***************** ANTIDELET2 .JS ********************
const DeletedText = async (conn, mek, jid, deleteInfo, isGroup, update) => {
    const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || 'Unknown content';
    deleteInfo += `\n╔══════════════⫸\n💬 *Content:* ${messageContent}\n╚═════════════════════⫸`;

    await conn.sendMessage(
        jid,
        {
            text: deleteInfo,
            contextInfo: {
                mentionedJid: isGroup ? [update.key.participant, mek.key.participant] : [update.key.remoteJid],
            },
        },
        { quoted: mek },
    );
};

const DeletedMedia = async (conn, mek, jid, deleteInfo) => {
    const antideletedmek = structuredClone(mek.message);
    const messageType = Object.keys(antideletedmek)[0];
    if (antideletedmek[messageType]) {
        antideletedmek[messageType].contextInfo = {
            stanzaId: mek.key.id,
            participant: mek.sender,
            quotedMessage: mek.message,
        };
    }
    if (messageType === 'imageMessage' || messageType === 'videoMessage') {
        antideletedmek[messageType].caption = `╔═════⫸\n🖼️ *Media Recovered!*\n\n${deleteInfo}\n╚══════⫸`;
        await conn.relayMessage(jid, antideletedmek, {});
    } else if (messageType === 'audioMessage' || messageType === 'documentMessage') {
        await conn.sendMessage(jid, { text: `╔═════⫸\n📁 *File Recovered!*\n\n${deleteInfo}\n╚══════⫸` }, { quoted: mek });
    }
};

const AntiDelete = async (conn, updates) => {
    for (const update of updates) {
        if (update.update.message === null) {
            const store = await loadMessage(update.key.id);

            if (store && store.message) {
                const mek = store.message;
                const isGroup = isJidGroup(store.jid);
                const antiDeleteStatus = await getAnti();
                if (!antiDeleteStatus) continue;

                const deleteTime = new Date().toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });

                let deleteInfo, jid;
                if (isGroup) {
                    const groupMetadata = await conn.groupMetadata(store.jid);
                    const groupName = groupMetadata.subject;
                    const sender = mek.key.participant?.split('@')[0];
                    const deleter = update.key.participant?.split('@')[0];

                    deleteInfo = `╔══╣❍*ᴍᴀɴɪꜱʜᴀ-ᴍᴅ*❍╠═══⫸\n╠➢ *SENDER:* @${sender}\n╠➢ *GROUP NAME:* ${groupName}\n╠➢ *DELETE TIME:* ${deleteTime}\n╠➢ *DELETER:* @${deleter}\n_DELETE A MASSAGE_\n╚════════════════⫸`;
                    jid = config.ANTI_DEL_PATH === "inbox" ? conn.user.id : store.jid;
                } else {
                    const senderNumber = mek.key.remoteJid?.split('@')[0];
                    const deleterNumber = update.key.remoteJid?.split('@')[0];
                    
                    deleteInfo = `╔══╣❍*ᴍᴀɴɪꜱʜᴀ-ᴍᴅ*❍╠═══⫸\n╠➢ *SENDER:* @${senderNumber}\n╠➢ *DELETE TIME:* ${deleteTime}\n╠➢ _DELETE A MASSAGE_\n╚═════════⫸`;
                    jid = config.ANTI_DEL_PATH === "inbox" ? conn.user.id : update.key.remoteJid;
                }

                if (mek.message?.conversation || mek.message?.extendedTextMessage) {
                    await DeletedText(conn, mek, jid, deleteInfo, isGroup, update);
                } else {
                    await DeletedMedia(conn, mek, jid, deleteInfo);
                }
            }
        }
    }
};


//==================================
class AudioConverter {
    constructor() {
        this.tempDir = path.join(__dirname, './temp');
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async cleanFile(file) {
        if (file && fs.existsSync(file)) {
            await fs.promises.unlink(file).catch(() => {});
        }
    }

    async convert(buffer, args, ext, ext2) {
        const inputPath = path.join(this.tempDir, `${Date.now()}.${ext}`);
        const outputPath = path.join(this.tempDir, `${Date.now()}.${ext2}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            
            return new Promise((resolve, reject) => {
                const ffmpeg = spawn(ffmpegPath, [
                    '-y',
                    '-i', inputPath,
                    ...args,
                    outputPath
                ], { timeout: 30000 });

                let errorOutput = '';
                ffmpeg.stderr.on('data', (data) => errorOutput += data.toString());

                ffmpeg.on('close', async (code) => {
                    await this.cleanFile(inputPath);
                    
                    if (code !== 0) {
                        await this.cleanFile(outputPath);
                        return reject(new Error(`Conversion failed with code ${code}`));
                    }

                    try {
                        const result = await fs.promises.readFile(outputPath);
                        await this.cleanFile(outputPath);
                        resolve(result);
                    } catch (readError) {
                        reject(readError);
                    }
                });

                ffmpeg.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (err) {
            await this.cleanFile(inputPath);
            await this.cleanFile(outputPath);
            throw err;
        }
    }

    toAudio(buffer, ext) {
        return this.convert(buffer, [
            '-vn',
            '-ac', '2',
            '-b:a', '128k',
            '-ar', '44100',
            '-f', 'mp3'
        ], ext, 'mp3');
    }

    toPTT(buffer, ext) {
        return this.convert(buffer, [
            '-vn',
            '-c:a', 'libopus',
            '-b:a', '128k',
            '-vbr', 'on',
            '-compression_level', '10'
        ], ext, 'opus');
    }
}
//=============================================
class StickerConverter {
    constructor() {
        this.tempDir = path.join(__dirname, './temp');
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async convertStickerToImage(stickerBuffer) {
        const tempPath = path.join(this.tempDir, `sticker_${Date.now()}.webp`);
        const outputPath = path.join(this.tempDir, `image_${Date.now()}.png`);

        try {
            // Save sticker to temp file
            await fs.promises.writeFile(tempPath, stickerBuffer);

            // Convert using fluent-ffmpeg (same as your video sticker converter)
            await new Promise((resolve, reject) => {
                ffmpeg(tempPath)
                    .on('error', reject)
                    .on('end', resolve)
                    .output(outputPath)
                    .run();
            });

            // Read and return converted image
            return await fs.promises.readFile(outputPath);
        } catch (error) {
            console.error('Conversion error:', error);
            throw new Error('Failed to convert sticker to image');
        } finally {
            // Cleanup temp files
            await Promise.all([
                fs.promises.unlink(tempPath).catch(() => {}),
                fs.promises.unlink(outputPath).catch(() => {})
            ]);
        }
    }
}

//==================================
async function fetchImage(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return response.data;
    } catch (error) {
        console.error("Error fetching image:", error);
        throw new Error("Could not fetch image.");
    }
}

async function fetchGif(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return response.data;
    } catch (error) {
        console.error("Error fetching GIF:", error);
        throw new Error("Could not fetch GIF.");
    }
}
async function gifToSticker(gifBuffer) {
    const outputPath = path.join(tmpdir(), Crypto.randomBytes(6).toString('hex') + ".webp");
    const inputPath = path.join(tmpdir(), Crypto.randomBytes(6).toString('hex') + ".gif");

    fs.writeFileSync(inputPath, gifBuffer);

    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split [a][b];[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];[b][p] paletteuse",
                "-loop", "0",
                "-preset", "default",
                "-an",
                "-vsync", "0"
            ])
            .toFormat("webp")
            .save(outputPath);
    });

    const webpBuffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);
    fs.unlinkSync(inputPath);

    return webpBuffer;
}
//=======================
async function videoToWebp(videoBuffer) {
  const outputPath = path.join(
    tmpdir(),
    Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + '.webp'
  );
  const inputPath = path.join(
    tmpdir(),
    Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + '.mp4'
  );

  // Save the video buffer to a file
  fs.writeFileSync(inputPath, videoBuffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions([
        '-vcodec', 'libwebp',
        '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split [a][b];[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];[b][p] paletteuse",
        '-loop', '0', // Loop forever
        '-ss', '00:00:00', // Start time (optional)
        '-t', '00:00:05', // Duration (optional)
        '-preset', 'default',
        '-an', // No audio
        '-vsync', '0'
      ])
      .toFormat('webp')
      .save(outputPath);
  });

  const webpBuffer = fs.readFileSync(outputPath);
  fs.unlinkSync(outputPath);
  fs.unlinkSync(inputPath);

  return webpBuffer;
}
//=================================
async function fetchEmix(emoji1, emoji2) {
    try {
        if (!emoji1 || !emoji2) {
            throw new Error("Invalid emoji input. Please provide two emojis.");
        }

        const apiUrl = `https://levanter.onrender.com/emix?q=${encodeURIComponent(emoji1)},${encodeURIComponent(emoji2)}`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.result) {
            return response.data.result; // Return the image URL
        } else {
            throw new Error("No valid image found.");
        }
    } catch (error) {
        console.error("Error fetching emoji mix:", error.message);
        throw new Error("Failed to fetch emoji mix.");
    }
}
//===================================================
async function gifToVideo(gifBuffer) {
    const filename = Crypto.randomBytes(6).toString('hex');
    const gifPath = path.join(tmpdir(), `${filename}.gif`);
    const mp4Path = path.join(tmpdir(), `${filename}.mp4`);

    fs.writeFileSync(gifPath, gifBuffer);

    await new Promise((resolve, reject) => {
        ffmpeg(gifPath)
            .outputOptions([
                "-movflags faststart",
                "-pix_fmt yuv420p",
                "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2"
            ])
            .on("error", (err) => {
                console.error("❌ ffmpeg conversion error:", err);
                reject(new Error("Could not process GIF to video."));
            })
            .on("end", resolve)
            .save(mp4Path);
    });

    const videoBuffer = fs.readFileSync(mp4Path);
    fs.unlinkSync(gifPath);
    fs.unlinkSync(mp4Path);

    return videoBuffer;
}


//============== SONG DOWNLOAD API ===============
async function ytmp3(link, format = "mp3") {
  try {
    // 1. Access yt.savetube.me to get initial page (optional if you want to parse hidden values)
    const pageRes = await axios.get("https://yt.savetube.me", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
      },
    });

    // Load the HTML if you want to scrape tokens/keys (in case they use CSRF or hidden params)
    const $ = cheerio.load(pageRes.data);

    // 2. Create a conversion task
    const createUrl = `https://loader.to/ajax/download.php?button=1&format=${format}&url=${encodeURIComponent(
      link
    )}`;
    const createRes = await axios.get(createUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
        Referer: "https://yt.savetube.me/",
      },
    });

    if (!createRes.data.success || !createRes.data.id) {
      throw new Error("Failed to create task. Invalid link or format.");
    }

    const taskId = createRes.data.id;

    // 3. Poll progress until the download link is ready
    let downloadUrl = null;
    let title = "";
    let thumbnail = "";

    while (!downloadUrl) {
      await new Promise((r) => setTimeout(r, 3000)); // wait 3s between polls

      const statusUrl = `https://loader.to/ajax/progress.php?id=${taskId}`;
      const statusRes = await axios.get(statusUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
          Referer: "https://yt.savetube.me/",
        },
      });

      if (statusRes.data.download_url) {
        downloadUrl = statusRes.data.download_url;
        title = statusRes.data.title || "";
        thumbnail = statusRes.data.thumbnail || "";
      } else if (statusRes.data.error) {
        throw new Error("Conversion failed: " + statusRes.data.error);
      }
    }

    // 4. Return structured result
    return {
      title,
      Created_by: 'manisha sasmitha',
      thumbnail,
      format,
      downloadUrl: downloadUrl,
    };
  } catch (err) {
    console.error("ytmp3 error:", err.message);
    return null;
  }
}

  //===================SESSION-AUTH============================

const sessionFile = path.join(__dirname, 'creds');

if (!fs.existsSync(sessionFile)) {
  if (!config.SESSION_ID) {
    console.log('🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Please add your session id in config.SESSION_ID! 😥...');
  } else {
    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
    filer.download((err, data) => {
      if (err) throw err;
      if (!fs.existsSync(sessionFile)) fs.mkdirSync(sessionFile); // create folder
      fs.writeFileSync(path.join(sessionFile, 'creds.json'), data);
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Session downloaded and saved 🧶 ...");
    });
  }
}

//=================== BOT CONNECT ===================
async function connectToWA() {
  console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Connecting to WhatsApp 🪀...");

  const { state, saveCreds } = await useMultiFileAuthState(sessionFile);
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Firefox'),
    syncFullHistory: true,
    auth: state,
    version
  });

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Reconnecting...");
        connectToWA();
      } else {
        console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Logged out, please add a new SESSION_ID");
      }
    } else if (connection === 'open') {
      console.log("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Plugins loaded successfully ✅...");
      
      const up = `╔═══╣❍ᴍᴀɴɪꜱʜᴀ-ᴍᴅ❍╠═══⫸
║ ✅ Bot Connected Successfully!
╠════════════➢
╠➢ 🔖 Prefix : [${prefix}]
╠➢ 🔒 Mode   : [${config.MODE}]
╠➢ 🧬 Version : v1.0.0
╠➢ 👑 Created Owner : [94721551183]
╠➢ 🛠️ Created By: Manisha coder
╠➢ 🧠 Framework : Node.js + Baileys
╠═══════════════════➢
║ 📜 Bot Description:  
╠════════════➢
║ MANISHA-MD is a powerful, multipurpose WhatsApp bot
║ built for automation, moderation, entertainment,
║ AI integration, and much more.
╚═════════════════════⫸`;

      await conn.sendMessage(ownerNumber + "@s.whatsapp.net", {
        image: { url: 'https://i.ibb.co/6RzcnLWR/jpg.jpg' },
        caption: up
      });
    }
  });

  conn.ev.on('creds.update', saveCreds);
  //==============================

  conn.ev.on('messages.update', async updates => {
    for (const update of updates) {
      if (update.update.message === null) {
        console.log("Delete Detected:", JSON.stringify(update, null, 2));
        await AntiDelete(conn, updates);
      }
    }
  });
  //=============readstatus=======
        
  conn.ev.on('messages.upsert', async(mek) => {
    mek = mek.messages[0]
    if (!mek.message) return
    mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
    ? mek.message.ephemeralMessage.message 
    : mek.message;
    
  if (config.READ_MESSAGE === 'true') {
    await conn.readMessages([mek.key]);  // Mark message as read
    console.log(`Marked message from ${mek.key.remoteJid} as read.`);
  }
    if(mek.message.viewOnceMessageV2)
    mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true"){
      await conn.readMessages([mek.key])
    }        
//=================================================
    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true"){
    const manishalike = await conn.decodeJid(conn.user.id);
    const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇵🇰', '💜', '💙', '🌝', '🖤', '💚'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    await conn.sendMessage(mek.key.remoteJid, {
      react: {
        text: randomEmoji,
        key: mek.key,
      } 
    }, { statusJidList: [mek.key.participant, manishalike] });
  }                       
//=================================================
  if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true"){
  const user = mek.key.participant
  const text = `AUTO STATUS SEEN JUST NOW BY MANISHA MD`
  await conn.sendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek })
            }
  if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTOLIKESTATUS === "true") {
    const user = await conn.decodeJid(conn.user.id);
    await conn.sendMessage(mek.key.remoteJid,
    { react: { key: mek.key, text: '💚' } },
    { statusJidList: [mek.key.participant, user] }
    )};
    await Promise.all([
      saveMessage(mek),
    ]);
  const m = sms(conn, mek)
  const type = getContentType(mek.message)
  const content = JSON.stringify(mek.message)
  const from = mek.key.remoteJid
  const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
  const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
  const isCmd = body.startsWith(prefix)
  var budy = typeof mek.text == 'string' ? mek.text : false;
  const cmdName = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
 const args = isCmd ? body.slice(prefix.length).trim().split(' ').slice(1) : [];
  const q = args.join(' ')
  const text = args.join(' ')
  const isGroup = from.endsWith('@g.us')
  const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
  const senderNumber = sender.split('@')[0]
  const botNumber = conn.user.id.split(':')[0]
  const pushname = mek.pushName || 'Sin Nombre'
  const isMe = botNumber.includes(senderNumber)
  const isOwner = ownerNumber.includes(senderNumber) || isMe
  const botNumber2 = await jidNormalizedUser(conn.user.id);
  const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
  const groupName = isGroup ? groupMetadata.subject : ''
  const participants = isGroup ? await groupMetadata.participants : ''
  const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
  const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
  const isAdmins = isGroup ? groupAdmins.includes(sender) : false
  const isReact = m.message.reactionMessage ? true : false
const reply = (teks) => {
conn.sendMessage(from, { text: teks }, { quoted: mek })
}

conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
              let mime = '';
              let res = await axios.head(url)
              mime = res.headers['content-type']
              if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options })
              }
              let type = mime.split("/")[0] + "Message"
              if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options })
              }
            }

//================OWNER REACT==============
/*
if (senderNumber.includes("94721551183") && !isReact) {
  const reactions = ["👑", "💀", "📊", "⚙️", "🧠", "🎯", "📈", "📝", "🏆", "🌍", "🇱🇰", "💗", "❤️", "💥", "🌼", "🏵️","💐", "🔥", "❄️", "🌝", "🌚", "🐥", "🧊"];
  const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
  m.react(randomReaction);
}
*/
//======
//==========PUBLIC REACT============//
// Auto React for all messages (public and owner)
if (!isReact && config.AUTO_REACT === 'true') {
    const reactions = [
        '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
        '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', 
        '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', 
        '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', 
        '💍', '👝', '💼', '🎒', '🥽', '🐻', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', 
        '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', 
        '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
        '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
        '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', 
        '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', 
        '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', 
        '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', 
        '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', 
        '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', 
        '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰'
    ];

    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    m.react(randomReaction);
}
  //==================================
  
  //=========anticall===========//
    conn.ev.on("call", async (callEvents) => {
  if (config.ANTI_CALL === "true") {
    for (const callEvent of callEvents) {
      if (callEvent.status === "offer") {
        if (!callEvent.isGroup) {
          try {
            await conn.sendMessage(callEvent.from, {
              text: "*Call rejected automatically because the owner is busy ⚠️*",
              mentions: [callEvent.from],
            });
            await conn.rejectCall(callEvent.id, callEvent.from);
          } catch (error) {
            console.error("Error processing call event:", error);
          }
        }
      }
    }
  }
});

  //=========bad number blocker
    if ((senderNumber.startsWith('212') || senderNumber.startsWith('263') || senderNumber.startsWith('234')) && config.BAD_NUMBER_BLOCKER === "true") {
  console.log(`Blocking number ${senderNumber}...`);
  // Action: Either block the user or remove them from a group
  if (from.endsWith('@g.us')) {
    // If in a group, remove the user
    await conn.groupParticipantsUpdate(from, [sender], 'remove');
    await conn.sendMessage(from, { text: `User with ${senderNumber} number detected and removed from the group.` });
  } else {
    // If in a private chat, block the user
    await conn.updateBlockStatus(sender, 'block');
    console.log(`Blocked ${senderNumber} successfully.`);
  }
  return; // Stop further processing of this message
}
  //==========WORKTYPE============ 
  if(!isOwner && config.MODE === "private") return
  if(!isOwner && isGroup && config.MODE === "inbox") return
  if(!isOwner && !isGroup && config.MODE === "groups") return
   
  // take commands                 
 // Command list
const commands = [];

// Command registration function
function cmd(info, func) {
  info.function = func;
  if (!info.dontAddCommandList) info.dontAddCommandList = false;
  if (!info.desc) info.desc = '';
  if (!info.fromMe) info.fromMe = false;
  if (!info.category) info.category = 'misc';
  if (!info.filename) info.filename = "Not Provided";
  commands.push(info);
  return info;
}

// Detect command
//=========== BOT COUSTOM ==================
const BOT = "MANISHA-MD"; //Use these letters.
const CREATER = "> _*created by manisha coder*_"; //Use these letters.
//================SETTINGS COMMAND===================

const settingsMap = {
  "1": {
    key: "MODE",
    label: "Bot Mode",
    options: {
      "1": "public",
      "2": "private",
      "3": "groups",
      "4": "inbox"
    }
  },
  "2": {
    key: "AUTO_REACT",
    label: "Auto-React",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "3": {
    key: "AUTO_READ_STATUS",
    label: "Auto-Read-Status",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "4": {
    key: "AUTO_STATUS_REPLY",
    label: "Auto-Status-Reply",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "5": {
    key: "AUTOLIKESTATUS",
    label: "Auto-like-status",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "6": {
    key: "READ_MESSAGE",
    label: "Read-message",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "7": {
    key: "AUTO_STATUS_REACT",
    label: "Auto-status-react",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "8": {
    key: "ANTI_DEL_PATH",
    label: "Anti-delete-path",
    options: {
      "1": "log",
      "2": "chat",
      "3": "inbox"
    }
  },
  "9": {
    key: "ANTIDELETE",
    label: "Anti-Delete",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "10": {
    key: "ANTI_CALL",
    label: "Anti-Call",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "11": {
    key: "AUTO_TYPING",
    label: "Auto-Typing",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "12": {
    key: "AUTO_RECORDING",
    label: "Auto-Recording",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "13": {
    key: "ALWAYS_ONLINE",
    label: "Always-Online",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "14": {
    key: "BAD_NUMBER_BLOCKER",
    label: "Bad-Number-Blocker",
    options: {
      "1": "true",
      "2": "false"
    }
  },
  "15": {
    key: "UNIFIED_PROTECTION",
    label: "Unified Protection",
    options: {
      "1": "off",
      "2": "warn",
      "3": "kick",
      "4": "strict"
    }
  }
};

cmd({
  pattern: "settings",
  alias: ["config"],
  react: "⚙️",
  desc: "Change bot settings via reply (owner only).",
  category: "settings",
  filename: __filename,
}, async (conn, mek, m, { from, reply, senderNumber }) => {
  try {
    const botOwner = conn.user.id.split(":")[0];
    if (senderNumber !== botOwner) return reply("*📛 Only the bot owner can use this command!*");

    const sentMsg = await conn.sendMessage(from, {
      image: { url: `https://i.ibb.co/6RzcnLWR/jpg.jpg` },
      caption:
        `╔═══╣❍SETTINGS❍╠═══⫸\n` +
        Object.entries(settingsMap).map(([num, s]) => `╠➢ *${num}*. ${s.label.toUpperCase()}`).join("\n") +
        `\n╠➢ *Reply with the number*\n╚════════════════════⫸`
    });

    const menuMsgID = sentMsg.key.id;

    const menuListener = async ({ messages }) => {
      const msg = messages[0];
      if (!msg || !msg.message || msg.key.remoteJid !== from) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === menuMsgID;
      const sender = (msg.key.participant || msg.key.remoteJid).split("@")[0];

      if (!isReply || sender !== botOwner || !text) return;

      const setting = settingsMap[text.trim()];
      if (!setting) {
        await conn.sendMessage(from, { text: "❌ Invalid option. Reply with a number from the list." });
        return;
      }

      const toggleMsg = await conn.sendMessage(from, {
        text:
          `╔═════⫸\n╠➢ *${setting.label}:*\n` +
          Object.entries(setting.options).map(([num, val]) => `╠➢ ${num}. ${val.toUpperCase()}`).join("\n") +
          `\n╠➢ _Reply with number._\n╚════⫸`
      });

      const toggleMsgID = toggleMsg.key.id;

      const toggleListener = async ({ messages }) => {
        const msg2 = messages[0];
        if (!msg2 || !msg2.message || msg2.key.remoteJid !== from) return;

        const text2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text;
        const isReplyToToggle = msg2.message.extendedTextMessage?.contextInfo?.stanzaId === toggleMsgID;
        const sender2 = (msg2.key.participant || msg2.key.remoteJid).split("@")[0];

        if (!isReplyToToggle || sender2 !== botOwner || !text2) return;

        const input = text2.trim();
        const selected = setting.options[input];

        if (!selected) {
          await conn.sendMessage(from, { text: "❌ Invalid option. Choose a valid number." });
          return;
        }

        config[setting.key] = selected;
        await conn.sendMessage(from, {
          text: `✅ *${setting.label} set to ${selected.toUpperCase()}.*`
        });

        if (setting.key === "ANTIDELETE" && typeof setAnti === "function") {
          await setAnti(config[setting.key] === "true");
        }

        conn.ev.on("messages.upsert", toggleListener);
      };

      conn.ev.on("messages.upsert", toggleListener);
      conn.ev.on("messages.upsert", menuListener);
    };

    conn.ev.on("messages.upsert", menuListener);

  } catch (err) {
    console.error("Settings Command Error:", err);
  }
});
//===================DOWNLOAD COMMAND======================

//========= song download ============

// Function to extract the video ID from youtu.be or YouTube links
function extractYouTubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Function to convert any YouTube URL to a full YouTube watch URL
function convertYouTubeLink(q) {
    const videoId = extractYouTubeId(q);
    if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return q;
}

cmd({
    pattern: "song",
    alias: ["play", "mp3"],
    desc: "To download songs.",
    react: "🎵",
    category: "download",
    filename: __filename
}, async (messageHandler, context, quotedMessage, { from, reply, q }) => {
  try {
        q = convertYouTubeLink(q);
        if (!q) return reply("*Please provide song name or url*");

        const search = await yts(q);
        const data = search.videos[0];
        const url = data.url;

        let desc = `*${BOT} SONG DOWNLOADER* 🎧
        
🎵 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
📅 *Uploaded:* ${data.ago}
🎭 *Views:* ${data.views}

*Select Download Format:*

*1 ||* Audio File  🎶
*2 ||* Document File  📂
*3 ||* Voice Note 🎤

${CREATER}`;

        // ℹ️ Send track info
        const sentMessage = await messageHandler.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: desc
        }, { quoted: quotedMessage });
    
        // Listen for the user's reply to select the download format
        messageHandler.ev.on("messages.upsert", async (update) => {
            const message = update.messages[0];
            if (!message.message || !message.message.extendedTextMessage) return;

            const userReply = message.message.extendedTextMessage.text.trim();

            // Ensure it's a reply to the bot's menu message
            if (message.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {
                
                await messageHandler.sendMessage(from, { 
                    react: { text: "⬆️", key: message.key } 
                });

                let result, downloadLink;

                switch (userReply) {
                    case '1': 
                        // Audio File
                        await messageHandler.sendMessage(from, { react: { text: '⬇️', key: message.key } });
                        result = await ytmp3(url, 'mp3');
                        downloadLink = result.downloadUrl;

                        await messageHandler.sendMessage(from, { 
                            audio: { url: downloadLink }, 
                            mimetype: "audio/mpeg",
                            contextInfo: {
                                externalAdReply: {
                                    title: data.title,
                                    body: data.videoId,
                                    mediaType: 1,
                                    sourceUrl: data.url,
                                    thumbnailUrl: data.thumbnail,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: false
                                }
                            }
                        }, { quoted: quotedMessage });
                        break;

                    case '2':
                        // Document File
                        await messageHandler.sendMessage(from, { react: { text: '⬇️', key: message.key } });
                        result = await ytmp3(url, 'mp3');
                        downloadLink = result.downloadUrl;

                        await messageHandler.sendMessage(from, {
                            document: { url: downloadLink },
                            mimetype: "audio/mp3",
                            fileName: `${data.title}.mp3`,
                            caption: `${CREATER}`
                        }, { quoted: quotedMessage });
                        break;

                    case '3':
                        // Voice Note
                        await messageHandler.sendMessage(from, { react: { text: '⬇️', key: message.key } });
                        result = await ytmp3(url, 'mp3');
                        downloadLink = result.downloadUrl;

                        await messageHandler.sendMessage(from, { 
                            audio: { url: downloadLink }, 
                            mimetype: "audio/mpeg",
                            ptt: true,
                            contextInfo: {
                                externalAdReply: {
                                    title: data.title,
                                    body: data.videoId,
                                    mediaType: 1,
                                    sourceUrl: data.url,
                                    thumbnailUrl: data.thumbnail,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: false
                                }
                            }
                        }, { quoted: quotedMessage });
                        break;

                    default:
                        reply("*Invalid Option. Please Select A Valid Option*");
                        break;
                }
            }
        });
    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
//============ video download ================

cmd({
    pattern: "video",
    alias: ["ytmp4", "mp4", "ytv"],
    desc: "Download YouTube videos",
    category: "downloader",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a video name or YouTube URL!");

        // Search on YouTube if query is not a link
        let url = q;
        let videoData = null;

        if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
            const { videos } = await yts(q);
            if (!videos || videos.length === 0) return await reply("❌ No results found!");
            videoData = videos[0]; // Save video metadata
            url = videos[0].url;
        }

        const api = `https://gtech-api-xtp1.onrender.com/api/video/yt?apikey=APIKEY&url=${encodeURIComponent(url)}`;
        const res = await axios.get(api);
        const json = res.data;

        if (!json?.status || !json?.result?.media) {
            return await reply("❌ Download failed! Try again later.");
        }

        const media = json.result.media;
        const videoUrl = media.video_url_hd !== "No HD video URL available"
            ? media.video_url_hd
            : media.video_url_sd !== "No SD video URL available"
                ? media.video_url_sd
                : null;

        if (!videoUrl) return await reply("❌ No downloadable video found!");

        // Prepare caption
        let desc = `*${BOT} VIDEO DOWNLOADER* 🎥

🎥 *Title:* ${media.title || videoData?.title || "Unknown"}
⏱️ *Duration:* ${media.duration || videoData?.timestamp || "Unknown"}
📅 *Uploaded:* ${media.published || videoData?.ago || "Unknown"}
🎭 *Views:* ${media.views || videoData?.views || "Unknown"}

${CREATER}`;

        // Send video
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: desc
        }, { quoted: mek });

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .video:", e);
        await reply("❌ Error occurred, try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
//============= spotify ================
cmd({
    pattern: "spotify",
    alias: ["sp", "spotifydl"],
    react: "🎵",
    desc: "Download Spotify music by search",
    category: "download",
    use: '.spotify <search term>',
    filename: __filename
}, async (messageHandler, context, quotedMessage, { from, reply, q }) => {
    try {
        if (!q) return reply("❗ Please provide a search term!");

        const delay = ms => new Promise(res => setTimeout(res, ms));
        const maxRetries = 3;
        let searchData, downloadData;

        // 🔍 Retry Spotify Search
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const searchUrl = `https://api.giftedtech.web.id/api/search/spotifysearch?apikey=gifted&query=${encodeURIComponent(q)}`;
                const { data } = await axios.get(searchUrl, { timeout: 10000 });
                searchData = data;
                break;
            } catch (err) {
                if (attempt === maxRetries) throw new Error("Spotify search failed. Server timeout or unavailable.");
                await delay(2000); // wait 2s before retry
            }
        }

        if (!searchData?.results || searchData.results.length === 0) {
            return reply("❌ No results found for your search.");
        }

        const track = searchData.results[0];
        const songUrl = track.url;

        // ⬇️ Retry Spotify Download
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const downloadUrl = `https://api.giftedtech.web.id/api/download/spotifydl?apikey=gifted&url=${encodeURIComponent(songUrl)}`;
                const { data } = await axios.get(downloadUrl, { timeout: 10000 });
                downloadData = data;
                break;
            } catch (err) {
                if (attempt === maxRetries) throw new Error("Spotify download failed. Server timeout or unavailable.");
                await delay(2000);
            }
        }

        if (!downloadData?.result?.download_url) {
            return reply("❌ Failed to get download link.");
        }

        const result = downloadData.result;

        const msg = `
*${BOT} SPOTIFY DOWNLOADER* 🎧

🎵 *Title:* ${track.title}
🧑 *Artist:* ${track.artist}
🕒 *Duration:* ${track.duration}
🔗 *Link:* ${songUrl}

*Select Download Format:*

*1 ||* Audio File  🎶
*2 ||* Document File  📂

${CREATER}
        `.trim();

        // ℹ️ Send track info
const sentMessage = await messageHandler.sendMessage(from, {
      image: { url: result.thumbnail },
      caption: msg,
    }, { quoted: quotedMessage });
    
    // Listen for the user's reply to select the download format
    messageHandler.ev.on("messages.upsert", async (update) => {
      const message = update.messages[0];
      if (!message.message || !message.message.extendedTextMessage) return;

      const userReply = message.message.extendedTextMessage.text.trim();

      // Handle the download format choice
      if (message.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {
      // React to the user’s reply message directly
      await messageHandler.sendMessage(from, { 
         react: { text: "⬆️", key: message.key } 
        });
        switch (userReply) {
          case '1': // video File
            await messageHandler.sendMessage(from, {
              audio: { url: result.download_url },
              mimetype: "audio/mpeg",
              caption: `${CREATER}`
               }, { quoted: quotedMessage });           
      // Change the reaction to once the file upload is complete
        await messageHandler.sendMessage(from, { 
          react: { text: "✅", key: message.key } 
        });
            break;
          case '2': // Document File
            await messageHandler.sendMessage(from, {
              document: { url: result.download_url },
              mimetype: "audio/mpeg",
              fileName: `${track.title}.mp3`,
              caption: `${CREATER}`
            }, { quoted: quotedMessage });
      // Change the reaction to once the file upload is complete
        await messageHandler.sendMessage(from, { 
          react: { text: "✅", key: message.key } 
        });
            break;
          default:
            reply("*Invalid Option. Please Select A Valid Option*");
            break;
        }
      }
    });
    } catch (e) {
      console.log(e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);



cmd({
    pattern: "xvideo",
    alias: ["xvdl", "xvdown"],
    react: "🔞",
    desc: "Download xvideo.com porn video",
    category: "download",
    use: '.xvideo <search term>',
    filename: __filename
}, async (messageHandler, context, quotedMessage, { from, reply, q }) => {
    try {
        if (!q) return await reply("❗ Please provide a search term!");

        const searchUrl = `https://api.giftedtech.web.id/api/search/xvideossearch?apikey=gifted&query=${encodeURIComponent(q)}`;
        const searchRes = await fetchJson(searchUrl);

        if (!searchRes.results || searchRes.results.length === 0) {
            return await reply("❌ No results found for that keyword!");
        }

        const firstVideo = searchRes.results[0];
        const videoUrl = firstVideo.url;

        const downloadUrl = `https://api.giftedtech.web.id/api/download/xvideosdl?apikey=gifted&url=${encodeURIComponent(videoUrl)}`;
        const downloadRes = await fetchJson(downloadUrl);


        if (!downloadRes.result || !downloadRes.result.download_url) {
            return await reply("❌ Failed to fetch video download link!");
        }

        const result = downloadRes.result;

        const msg = `
*${BOT} XVIDEO DOWNLOADER* 🔞

🎬 *Title:* ${result.title}
👀 *Views:* ${result.views}
👍 *Likes:* ${result.likes}
👎 *Dislikes:* ${result.dislikes}
📦 *Size:* ${result.size}

*Select Download Format:*

*1 ||* video File  🎬
*2 ||* Document File  📂

${CREATER}
        `.trim();
       
const sentMessage = await messageHandler.sendMessage(from, {
      image: { url: result.thumbnail },
      caption: msg,
    }, { quoted: quotedMessage });
    
    // Listen for the user's reply to select the download format
    messageHandler.ev.on("messages.upsert", async (update) => {
      const message = update.messages[0];
      if (!message.message || !message.message.extendedTextMessage) return;

      const userReply = message.message.extendedTextMessage.text.trim();

      // Handle the download format choice
      if (message.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {
      // React to the user’s reply message directly
      await messageHandler.sendMessage(from, { 
         react: { text: "⬆️", key: message.key } 
        });
        switch (userReply) {
          case '1': // video File
            await messageHandler.sendMessage(from, {
              video: { url: result.download_url },
              mimetype: "video/mp4",
              caption: `${CREATER}`
               }, { quoted: quotedMessage });           
      // Change the reaction to once the file upload is complete
        await messageHandler.sendMessage(from, { 
          react: { text: "✅", key: message.key } 
        });
            break;
          case '2': // Document File
            await messageHandler.sendMessage(from, {
              document: { url: result.download_url },
              mimetype: 'video/mp4',
              fileName: `${result.title}.mp4`,
              caption: `${CREATER}`
            }, { quoted: quotedMessage });
      // Change the reaction to once the file upload is complete
        await messageHandler.sendMessage(from, { 
          react: { text: "✅", key: message.key } 
        });
            break;
          default:
            reply("*Invalid Option. Please Select A Valid Option*");
            break;
        }
      }
    });
    } catch (e) {
      console.log(e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);

//============= xnxx download ==================

cmd({
  pattern: "xnxx",
  alias: ["xnxxdl", "xnxxdown"],
  react: "🤤",
  desc: "Download xnxx.com video",
  category: "download",
  use: '.xnxx <search>',
  filename: __filename
}, async (messageHandler, context, quotedMessage, { from, reply, q }) => {
  try {
    if (!q) return reply("❗ Provide search term. Example: `.xnxx mom`");

    // Search videos
    const res = await fetchJson(`https://api.giftedtech.web.id/api/search/xnxxsearch?apikey=gifted&query=${encodeURIComponent(q)}`);

    if (!res || !res.results || res.results.length === 0) 
      return reply("❌ No video found for that search.");

    const video = res.results[0];

    // Download video info
    const down = await fetchJson(`https://api.giftedtech.web.id/api/download/xnxxdl?apikey=gifted&url=${encodeURIComponent(video.link)}`);

    // Get best available video url
    const file = down?.result?.files?.high || down?.result?.files?.low || down?.result?.files?.HLS;

    if (!file) return reply("❌ Failed to download video link.");

    // Format duration from seconds to mm:ss
    const durationSeconds = parseInt(down.result.duration) || 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const formattedDuration = `${minutes}m ${seconds}s`;

    const msg = `
*${BOT} XNXX DOWNLOADER* 🤤

🎬 Title: ${down.result.title}
⏱️ Duration: ${formattedDuration}

*Select Download Format:*

*1 ||* video File  🎬
*2 ||* Document File  📂

${CREATER}
`.trim();

    // Send text with video info and thumbnail preview
    const sentMessage = await messageHandler.sendMessage(from, {
      image: { url: down.result.image },
      caption: msg,
    }, { quoted: quotedMessage });
    
    // Listen for the user's reply to select the download format
    messageHandler.ev.on("messages.upsert", async (update) => {
      const message = update.messages[0];
      if (!message.message || !message.message.extendedTextMessage) return;

      const userReply = message.message.extendedTextMessage.text.trim();

      // Handle the download format choice
      if (message.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {
      // React to the user’s reply message directly
      await messageHandler.sendMessage(from, { 
         react: { text: "⬆️", key: message.key } 
        });
        switch (userReply) {
          case '1': // video File
            await messageHandler.sendMessage(from, {
              video: { url: file },
              mimetype: "video/mp4",
              caption: `${CREATER}`
               }, { quoted: quotedMessage });           
      // Change the reaction to once the file upload is complete
        await messageHandler.sendMessage(from, { 
          react: { text: "✅", key: message.key } 
        });
            break;
          case '2': // Document File
            await messageHandler.sendMessage(from, {
              document: { url: file },
              mimetype: 'video/mp4',
              fileName: `${down.result.title || "video"}.mp4`,
              caption: `${CREATER}`
            }, { quoted: quotedMessage });
      // Change the reaction to once the file upload is complete
        await messageHandler.sendMessage(from, { 
          react: { text: "✅", key: message.key } 
        });
            break;
          default:
            reply("*Invalid Option. Please Select A Valid Option*");
            break;
        }
      }
    });
    } catch (e) {
      console.log(e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);

//============ apk download ====================

cmd({
  pattern: "apk",
  desc: "Download APK from Aptoide.",
  category: "download",
  filename: __filename
}, async (conn, m, store, {
  from,
  quoted,
  q,
  reply
}) => {
  try {
    if (!q) {
      return reply("❌ Please provide an app name to search.");
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${q}/limit=1`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data || !data.datalist || !data.datalist.list.length) {
      return reply("⚠️ No results found for the given app name.");
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2); // Convert bytes to MB

    const caption = `╔══╣❍${BOT} APK❍╠═══⫸\n*NAME:* ${app.name}\n╠➢ *SIZE:* ${appSize}MB\n╠➢ *PACKAGE:* ${app.package}\n╠➢ *UPDATED:* ${app.updated}\n╠➢ *DEVELOPER:* ${app.developer.name}\n╚═════════════⫸\n${CREATER}`;

    await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

    await conn.sendMessage(from, {
      document: { url: app.file.path_alt },
      fileName: `${app.name}.apk`,
      mimetype: "application/vnd.android.package-archive",
      caption: caption
    }, { quoted: m });

    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("Error:", error);
    reply("❌ An error occurred while fetching the APK. Please try again.");
  }
});

//============= image download ===================

cmd({
    pattern: "img",
    alias: ["image", "googleimage", "searchimg"],
    react: "🖼️",
    desc: "Search and download Google images",
    category: "download",
    use: ".img <keywords>",
    filename: __filename
}, async (conn, mek, m, { reply, args, from }) => {
    try {
        const query = args.join(" ");
        if (!query) {
            return reply(" Please provide a search query\nExample: .img dogs");
        }

        await reply(`🔍 Searching images for "${query}"...`);

        const url = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(url);

        // Validate response
        if (!response.data?.success || !response.data.results?.length) {
            return reply("❌ No images found. Try different keywords");
        }

        const results = response.data.results;
        // Get 5 random images
        const selectedImages = results
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        for (const imageUrl of selectedImages) {
            await conn.sendMessage(
                from,
                { 
                    image: { url: imageUrl },
                    caption: `📷 Result for: ${query}\n${BOT}`
                },
                { quoted: mek }
            );
            // Add delay between sends to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error('Image Search Error:', error);
        reply(`❌ Error: ${error.message || "Failed to fetch images"}`);
    }
});


//============ gdrive download ====================

cmd({
  pattern: "gdrive",
  desc: "Download Google Drive files.",
  react: "🌐",
  category: "download",
  filename: __filename
}, async (conn, m, store, {
  from,
  quoted,
  q,
  reply
}) => {
  try {
    if (!q) {
      return reply("❌ Please provide a valid Google Drive link.");
    }

    await conn.sendMessage(from, { react: { text: "⬇️", key: m.key } });

    const apiUrl = `https://api.fgmods.xyz/api/downloader/gdrive?url=${q}&apikey=mnp3grlZ`;
    const response = await axios.get(apiUrl);
    const downloadUrl = response.data.result.downloadUrl;

    if (downloadUrl) {
      await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

      await conn.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: response.data.result.mimetype,
        fileName: response.data.result.fileName,
        caption: `${CREATER}`
      }, { quoted: m });

      await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } else {
      return reply("⚠️ No download URL found. Please check the link and try again.");
    }
  } catch (error) {
    console.error("Error:", error);
    reply("❌ An error occurred while fetching the Google Drive file. Please try again.");
  }
}); 

//=========== mega download =============

cmd({
    pattern: "mega",
    react: "🍟",
    alias: ["megadl", "meganz"],
    desc: "Download file from mega.nz",
    category: "download",
    use: '.mega <mega.nz link>',
    filename: __filename
}, 
async (conn, mek, m, { from, q, reply }) => {
    if (!q) return await reply('*Please provide a MEGA URL!*');

    try {
        const file = File.fromURL(q);
        await file.loadAttributes();

        const maxSize = 4 * 1024 * 1024 * 1024; // 4 GB limit
        if (file.size > maxSize) {
            return reply(`❌ File size exceeded.\nMaximum allowed: 4 GB\nFile size: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`);
        }

        reply(`⬇️ Downloading **${file.name}** (${(file.size / (1024 * 1024)).toFixed(2)} MB)... Please wait.`);

        const buffer = await file.downloadBuffer();

        const mimeType = mime.lookup(file.name) || 'application/octet-stream';

        await conn.sendMessage(from, {
            document: buffer,
            mimetype: mimeType,
            fileName: file.name
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error(err);
        reply(`❌ Failed to download file:\n${err.message || err}`);
    }
});

//==================== MEDIAFIRE DOWNLOADER ====================

cmd({
  pattern: "mediafire",
  react: "📁",
  alias: ["mf", "mfire"],
  desc: "Download files from MediaFire",
  category: "download",
  use: "<mediafire link>",
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply("⚠️ Please provide a valid MediaFire link.\n\nExample: .mediafire https://www.mediafire.com/file/xxxx/file");

    // API endpoint
    let api = `https://delirius-apiofc.vercel.app/download/mediafire?url=${encodeURIComponent(q)}`;

    // Fetch API response
    let res = await fetch(api);
    if (!res.ok) throw new Error(`❌ MediaFire API Error: ${res.status}`);
    let json = await res.json();

    if (!json.status) return reply("❌ Invalid MediaFire link or file not found!");

    let data = json.data[0];
    let caption = `📂 *MediaFire Downloader*
    
📝 *Filename:* ${data.filename}
📏 *Size:* ${data.size}
🗂️ *Extension:* ${data.extension}
📑 *Mime:* ${data.mime}
⏳ *Uploaded:* ${data.uploaded}
🔗 *Link:* ${data.link}`;

    // Send file with caption
    await conn.sendMessage(from, {
      document: { url: data.link },
      fileName: data.filename,
      mimetype: data.mime,
      caption
    }, { quoted: mek });

  } catch (e) {
    console.error(e);
    reply("❌ Error while downloading the MediaFire file.");
  }
});
//============= fb download ==============

cmd({
    pattern: "fb",
    alias: ["facebook"],
    react: "✅",
    desc: "Download Facebook Video",
    category: "download",
    filename: __filename,
  },
  async ( conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
      if (!q) return reply("🥺 Please provide a valid Facebook video link!");

      const fbRegex = /(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/;
      if (!fbRegex.test(q)) return reply("*❌ Invalid Facebook link!*");

      const result = await getFbVideoInfo(q);
      if (!result || (!result.sd && !result.hd)) {
        return reply("*😢 Unable to fetch the video. Please try again later!*");
      }

      const { title, sd, hd } = result;
      const desc = `*${BOT} FACEBOOK DOWNLOAD* 📥

📌 Title: ${title || "Unknown"}
📁 HD: ${hd ? "✅ Available" : "❌ Not Available"}
📁 SD: ${sd ? "✅ Available" : "❌ Not Available"}

👉 Reply with:
1 = 📹 HD Video
2 = 📄 SD Video

${CREATER}`;

      const sentMsg = await conn.sendMessage(from, {
        image: { url: "https://i.ibb.co/VWbf29Yn/Facebook-f-logo-2019-svg.png" }, // Optional preview image
        caption: desc,
      }, { quoted });

      // Set up a one-time reply handler
      const handler = async (update) => {
        try {
          const msg = update.messages[0];
          if (!msg.message || !msg.key || msg.key.fromMe) return;
          if (msg.key.remoteJid !== from) return;

          const text = msg.message?.extendedTextMessage?.text || msg.message?.conversation;
          if (!text) return;

          const userReply = text.trim();
          const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
          if (!contextInfo || contextInfo.stanzaId !== sentMsg.key.id) return;

          await conn.sendMessage(from, { react: { text: "⬆️", key: msg.key } });

          if (userReply === "1" && hd) {
            await conn.sendMessage(from, {
              video: { url: hd },
              caption: `*✅ HD Quality Video*\n${CREATER}`
            }, { quoted: msg });
          } else if (userReply === "2" && sd) {
            await conn.sendMessage(from, {
              video: { url: sd },
              caption: `*📥 SD Quality Video*\n${CREATER}`
            }, { quoted: msg });
          } else {
            await reply("*❌ Invalid option. Please reply with 1 or 2.*");
          }

          await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
          conn.ev.off("messages.upsert", handler); // Remove listener after handling
        } catch (err) {
          console.log(err);
        }
      };

      conn.ev.on("messages.upsert", handler); // Register listener

    } catch (e) {
      console.log(e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);

//============== tiktok download ==================

cmd({
    pattern: "tiktok",
    alias: ["ttdl", "tt", "tiktokdl"],
    desc: "Download TikTok video without watermark",
    category: "download",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        if (!q) return reply("Please provide a TikTok video link.");
        if (!q.includes("tiktok.com")) return reply("Invalid TikTok link.");
        
        reply("Downloading video, please wait...");
        
        const apiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${q}`;
        const { data } = await axios.get(apiUrl);
        
        if (!data.status || !data.data) return reply("Failed to fetch TikTok video.");
        
        const { title, like, comment, share, author, meta } = data.data;
        const videoUrl = meta.media.find(v => v.type === "video").org;
        
        const caption = `🎵 *TikTok Video* 🎵\n\n` +
                        `👤 *User:* ${author.nickname} (@${author.username})\n` +
                        `📖 *Title:* ${title}\n` +
                        `👍 *Likes:* ${like}\n💬 *Comments:* ${comment}\n🔁 *Shares:* ${share}`;
        
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: caption,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: mek });
        
    } catch (e) {
        console.error("Error in TikTok downloader command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});

//============ tiktok search ===================

cmd({
  pattern: "tiktoksearch",
  alias: ["tiktoks", "tiks"],
  desc: "Search for TikTok videos using a query.",
  react: "👩‍🔧",
  category: "download",
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  if (!args[0]) {
    return reply("🌸 What do you want to search on TikTok?\n\n*Usage Example:*\n.tiktoksearch <query>");
  }

  const query = args.join(" ");
  await store.react('⌛');

  try {
    reply(`🔎 Searching TikTok for: *${query}*`);
    
    const response = await fetch(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      await store.react('❌');
      return reply("❌ No results found for your query. Please try with a different keyword.");
    }

    // Get up to 7 random results
    const results = data.data.slice(0, 7).sort(() => Math.random() - 0.5);

    for (const video of results) {
      const message = `🌸 *TikTok Video Result*:\n\n`
        + `*• Title*: ${video.title}\n`
        + `*• Author*: ${video.author || 'Unknown'}\n`
        + `*• Duration*: ${video.duration || "Unknown"}\n`
        + `*• URL*: ${video.link}\n\n`;

      if (video.nowm) {
        await conn.sendMessage(from, {
          video: { url: video.nowm },
          caption: message
        }, { quoted: m });
      } else {
        reply(`❌ Failed to retrieve video for *"${video.title}"*.`);
      }
    }

    await store.react('✅');
  } catch (error) {
    console.error("Error in TikTokSearch command:", error);
    await store.react('❌');
    reply("❌ An error occurred while searching TikTok. Please try again later.");
  }
});

//============== pinterest download ===============

cmd({
    pattern: "pindl",
    alias: ["pinterestdl", "pin", "pins", "pindownload"],
    desc: "Download media from Pinterest",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { args, quoted, from, reply }) => {
    try {
        // Make sure the user provided the Pinterest URL
        if (args.length < 1) {
            return reply('❎ Please provide the Pinterest URL to download from.');
        }

        // Extract Pinterest URL from the arguments
        const pinterestUrl = args[0];

        // Call your Pinterest download API
        const response = await axios.get(`https://api.giftedtech.web.id/api/download/pinterestdl?apikey=gifted&url=${encodeURIComponent(pinterestUrl)}`);

        if (!response.data.success) {
            return reply('❎ Failed to fetch data from Pinterest.');
        }

        const media = response.data.result.media;
        const description = response.data.result.description || 'No description available'; // Check if description exists
        const title = response.data.result.title || 'No title available';

        // Select the best video quality or you can choose based on size or type
        const videoUrl = media.find(item => item.type.includes('720p'))?.download_url || media[0].download_url;

        // Prepare the new message with the updated caption
        const desc = `*${BOT} PINS DOWNLOADER*
        
*Title* - ${title}
*Media Type* - ${media[0].type}

${CREATER}`;

        // Send the media (video or image) to the user
        if (videoUrl) {
            // If it's a video, send the video
            await conn.sendMessage(from, { video: { url: videoUrl }, caption: desc }, { quoted: mek });
        } else {
            // If it's an image, send the image
            const imageUrl = media.find(item => item.type === 'Thumbnail')?.download_url;
            await conn.sendMessage(from, { image: { url: imageUrl }, caption: desc }, { quoted: mek });
        }

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❎ An error occurred while processing your request.');
    }
});

//===============MOVIE COMMAND=======================

//========== sinhalasub download ===========
/*
const API = "https://nethu-api-ashy.vercel.app";

cmd({
  pattern: "sinhalasub",
  react: "🎬",
  alias: ["sub"],
  desc: "SinhalaSub Search & Download",
  category: "movie",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply("🎬 *Please provide a movie name*");

  try {
    const res = await axios.get(`${API}/movie/sinhalasub/search?text=${encodeURIComponent(q)}`);
    const list = res?.data?.result?.data || [];

    if (!list.length) return reply("❌ No results found!");

    const movies = list.map((m, i) => ({ number: i + 1, title: m.title, link: m.link }));

    let text = `*🎬 SINHALASUB SEARCH RESULTS*\n\n`;
    movies.forEach(m => text += `*${m.number}* ➜ ${m.title}\n`);
    text += `\n🔢 Select a movie: Reply with the number\n${CREATER}`;

    const sentList = await conn.sendMessage(from, { text }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "🎥", key: sentList.key } });
    const key = sentList.key;

    const downloadMap = new Map();

    const handler = async (update) => {
      const message = update.messages[0];
      if (!message.message?.extendedTextMessage) return;

      const txt = message.message.extendedTextMessage.text.trim();
      const replyId = message.message.extendedTextMessage.contextInfo.stanzaId;

      if (replyId === key.id) {
        await conn.sendMessage(from, { react: { text: "🎥", key: message.key } });
        const idx = parseInt(txt);
        const movie = movies.find(m => m.number === idx);
        if (!movie) return reply("❌ Invalid selection!");

        const detailRes = await axios.get(`${API}/movie/sinhalasub/movie?url=${movie.link}`);
        const data = detailRes.data?.result?.data;
        if (!data) return reply("❌ Movie details not found!");

        const title = data.title || movie.title; // fallback if title is missing

        const allLinks = [...data.pixeldrain_dl, ...data.ddl_dl].map((dl, i) => ({
          number: i + 1,
          quality: dl.quality,
          size: dl.size,
          url: dl.link
        }));

        if (!allLinks.length) return reply("❌ No download links available!");

        let detailText = `*🎬 ${title}*\n
🗓️ *Year ➛* ${data.date}
🌍 *Country ➛* ${data.country}
🎭 *Genres ➛* ${data.category.join(', ')}
⭐ *IMDB ➛* ${data.tmdbRate}
🤵‍♂ *Director ➛* ${data.director}
✍ *Subtitle by ➛* ${data.subtitle_author}

${CREATER}`;

        await conn.sendMessage(from, {
          image: { url: data.images[0] },
          caption: detailText
        }, { quoted: message });

        let qualityText = `*📥 Choose quality for:* *${title}*\n\n`;
        allLinks.forEach(dl => qualityText += `*${dl.number}* ➜ ${dl.quality} (${dl.size})\n`);
        qualityText += CREATER;

        const sentQuality = await conn.sendMessage(from, {
          text: qualityText
        }, { quoted: message });

        downloadMap.set(sentQuality.key.id, { title, links: allLinks });
      }

      else if (downloadMap.has(replyId)) {
        const { title, links } = downloadMap.get(replyId);
        const link = links.find(l => l.number === parseInt(txt));
        if (!link) return reply("❌ Invalid quality selection!");

        await conn.sendMessage(from, {
          react: { text: "⬆️", key: message.key }
        });

        const sizeStr = link.size.toLowerCase();
        let sizeInGB = 0;
        if (sizeStr.includes("gb")) {
          sizeInGB = parseFloat(sizeStr.replace("gb", "").trim());
        } else if (sizeStr.includes("mb")) {
          sizeInGB = parseFloat(sizeStr.replace("mb", "").trim()) / 1024;
        }

        if (sizeInGB > 2) {
          return conn.sendMessage(from, {
            text: `⚠ File Too Large\n\nFile size: ${link.size}\nThis file is too large to send directly.\n\n*Direct Download Link:*\n${link.url}${CREATER}`
          }, { quoted: message });
        }

        await conn.sendMessage(from, {
          document: { url: link.url },
          mimetype: "video/mp4",
          fileName: `${title} - ${link.quality}.mp4`,
          caption: `🎬 ${title} \n\n\`[WEB] ${link.quality}\`\n${CREATER}`
        }, { quoted: message });

        await conn.sendMessage(from, { react: { text: "✅", key: message.key } });
      }
    };

    conn.ev.on("messages.upsert", handler);

  } catch (err) {
    console.error("SinhalaSub Error:", err);
    reply("❌ An error occurred while processing your request.");
  }
});
*/


//===================OWNER COMMAND======================

//============ restsrt =============

cmd({
    pattern: "restart",
    desc: "Restart the bot",
    react: "🔄",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply
}) => {
    try {
        // Get the bot owner's number dynamically from conn.user.id
        const botOwner = conn.user.id.split(":")[0]; // Extract the bot owner's number
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }

        reply("MANISHA-MD Restarting ⏳...");
        await sleep(1500);
        exec("pm2 restart all");
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

//===============

// Safety Configuration
const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,  // jawad on top 🔝
  EXTRA_DELAY: 4000,  // huh don't copy mine file 
};

cmd({
  pattern: "forward",
  alias: ["fwd"],
  desc: "Bulk forward media to groups",
  category: "owner",
  filename: __filename
}, async (client, message, match, { isOwner }) => {
  try {
    // Owner check
    if (!isOwner) return await message.reply("*📛 Owner Only Command*");
    
    // Quoted message check
    if (!message.quoted) return await message.reply("*🍁 Please reply to a message*");

    // ===== [BULLETPROOF JID PROCESSING] ===== //
    let jidInput = "";
    
    // Handle all possible match formats
    if (typeof match === "string") {
      jidInput = match.trim();
    } else if (Array.isArray(match)) {
      jidInput = match.join(" ").trim();
    } else if (match && typeof match === "object") {
      jidInput = match.text || "";
    }
    
    // Extract JIDs (supports comma or space separated)
    const rawJids = jidInput.split(/[\s,]+/).filter(jid => jid.trim().length > 0);
    
    // Process JIDs (accepts with or without @g.us)
    const validJids = rawJids
      .map(jid => {
        // Remove existing @g.us if present
        const cleanJid = jid.replace(/@g\.us$/i, "");
        // Only keep if it's all numbers
        return /^\d+$/.test(cleanJid) ? `${cleanJid}@g.us` : null;
      })
      .filter(jid => jid !== null)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0) {
      return await message.reply(
        "❌ No valid group JIDs found\n" +
        "Examples:\n" +
        ".fwd 120xxxxxxxx@g.us,120363333939099948@g.us\n" +
        ".fwd 120xxxxxxxx 120xxxxxxxx"
      );
    }

    // ===== [ENHANCED MEDIA HANDLING - ALL TYPES] ===== //
    let messageContent = {};
    const mtype = message.quoted.mtype;
    
    // For media messages (image, video, audio, sticker, document)
    if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(mtype)) {
      const buffer = await message.quoted.download();
      
      switch (mtype) {
        case "imageMessage":
          messageContent = {
            image: buffer,
            caption: message.quoted.text || '',
            mimetype: message.quoted.mimetype || "image/jpeg"
          };
          break;
        case "videoMessage":
          messageContent = {
            video: buffer,
            caption: message.quoted.text || '',
            mimetype: message.quoted.mimetype || "video/mp4"
          };
          break;
        case "audioMessage":
          messageContent = {
            audio: buffer,
            mimetype: message.quoted.mimetype || "audio/mp4",
            ptt: message.quoted.ptt || false
          };
          break;
        case "stickerMessage":
          messageContent = {
            sticker: buffer,
            mimetype: message.quoted.mimetype || "image/webp"
          };
          break;
        case "documentMessage":
          messageContent = {
            document: buffer,
            mimetype: message.quoted.mimetype || "application/octet-stream",
            fileName: message.quoted.fileName || "document"
          };
          break;
      }
    } 
    // For text messages
    else if (mtype === "extendedTextMessage" || mtype === "conversation") {
      messageContent = {
        text: message.quoted.text
      };
    } 
    // For other message types (forwarding as-is)
    else {
      try {
        // Try to forward the message directly
        messageContent = message.quoted;
      } catch (e) {
        return await message.reply("❌ Unsupported message type");
      }
    }

    // ===== [OPTIMIZED SENDING WITH PROGRESS] ===== //
    let successCount = 0;
    const failedJids = [];
    
    for (const [index, jid] of validJids.entries()) {
      try {
        await client.sendMessage(jid, messageContent);
        successCount++;
        
        // Progress update (every 10 groups instead of 5)
        if ((index + 1) % 10 === 0) {
          await message.reply(`🔄 Sent to ${index + 1}/${validJids.length} groups...`);
        }
        
        // Apply reduced delay
        const delayTime = (index + 1) % 10 === 0 ? SAFETY.EXTRA_DELAY : SAFETY.BASE_DELAY;
        await new Promise(resolve => setTimeout(resolve, delayTime));
        
      } catch (error) {
        failedJids.push(jid.replace('@g.us', ''));
        await new Promise(resolve => setTimeout(resolve, SAFETY.BASE_DELAY));
      }
    }

    // ===== [COMPREHENSIVE REPORT] ===== //
    let report = `✅ *Forward Complete*\n\n` +
                 `📤 Success: ${successCount}/${validJids.length}\n` +
                 `📦 Content Type: ${mtype.replace('Message', '') || 'text'}\n`;
    
    if (failedJids.length > 0) {
      report += `\n❌ Failed (${failedJids.length}): ${failedJids.slice(0, 5).join(', ')}`;
      if (failedJids.length > 5) report += ` +${failedJids.length - 5} more`;
    }
    
    if (rawJids.length > SAFETY.MAX_JIDS) {
      report += `\n⚠️ Note: Limited to first ${SAFETY.MAX_JIDS} JIDs`;
    }

    await message.reply(report);

  } catch (error) {
    console.error("Forward Error:", error);
    await message.reply(
      `💢 Error: ${error.message.substring(0, 100)}\n\n` +
      `Please try again or check:\n` +
      `1. JID formatting\n` +
      `2. Media type support\n` +
      `3. Bot permissions`
    );
  }
});


// ========== viewonce =============
cmd({
  pattern: "vv",
  alias: ["viewonce", 'retrive'],
  react: '🐳',
  desc: "Owner Only - retrieve quoted message back to user",
  category: "owner",
  filename: __filename
}, async (conn, message, match, { from, isCreator }) => {
  try {
    if (!isOwner) {
      return await conn.sendMessage(from, {
        text: "*📛 This is an owner command.*"
      }, { quoted: message });
    }

    if (!match.quoted) {
      return await conn.sendMessage(from, {
        text: "*🍁 Please reply to a view once message!*"
      }, { quoted: message });
    }

    const buffer = await match.quoted.download();
    const mtype = match.quoted.mtype;
    const options = { quoted: message };

    let messageContent = {};
    switch (mtype) {
      case "imageMessage":
        messageContent = {
          image: buffer,
          caption: match.quoted.text || '',
          mimetype: match.quoted.mimetype || "image/jpeg"
        };
        break;
      case "videoMessage":
        messageContent = {
          video: buffer,
          caption: match.quoted.text || '',
          mimetype: match.quoted.mimetype || "video/mp4"
        };
        break;
      case "audioMessage":
        messageContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: match.quoted.ptt || false
        };
        break;
      default:
        return await conn.sendMessage(from, {
          text: "❌ Only image, video, and audio messages are supported"
        }, { quoted: message });
    }

    await conn.sendMessage(from, messageContent, options);
  } catch (error) {
    console.error("vv Error:", error);
    await conn.sendMessage(from, {
      text: "❌ Error fetching vv message:\n" + error.message
    }, { quoted: message });
  }
});


cmd({
  pattern: "post",
  alias: ["poststatus", "status", "story", "repost", "reshare"],
  react: '📝',
  desc: "Posts replied media to bot's status",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, isCreator }) => {
  try {
    if (!isOwner) {
      return await client.sendMessage(from, {
        text: "*📛 This is an owner-only command.*"
      }, { quoted: message });
    }

    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType) {
      return await client.sendMessage(message.chat, {
        text: "*Please reply to an image, video, or audio file.*"
      }, { quoted: message });
    }

    const buffer = await quotedMsg.download();
    const mtype = quotedMsg.mtype;
    const caption = quotedMsg.text || '';

    let statusContent = {};

    switch (mtype) {
      case "imageMessage":
        statusContent = {
          image: buffer,
          caption: caption
        };
        break;
      case "videoMessage":
        statusContent = {
          video: buffer,
          caption: caption
        };
        break;
      case "audioMessage":
        statusContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: quotedMsg.ptt || false
        };
        break;
      default:
        return await client.sendMessage(message.chat, {
          text: "Only image, video, and audio files can be posted to status."
        }, { quoted: message });
    }

    await client.sendMessage("status@broadcast", statusContent);

    await client.sendMessage(message.chat, {
      text: "✅ Status Uploaded Successfully."
    }, { quoted: message });

  } catch (error) {
    console.error("Status Error:", error);
    await client.sendMessage(message.chat, {
      text: "❌ Failed to post status:\n" + error.message
    }, { quoted: message });
  }
});

//==================
cmd({
    pattern: "block",
    desc: "Blocks a person",
    category: "owner",
    react: "🚫",
    filename: __filename
},
async (conn, m, { reply, q, react }) => {
    // Get the bot owner's number dynamically
    const botOwner = conn.user.id.split(":")[0] + "@s.whatsapp.net";
    
    if (m.sender !== botOwner) {
        await react("❌");
        return reply("Only the bot owner can use this command.");
    }

    let jid;
    if (m.quoted) {
        jid = m.quoted.sender; // If replying to a message, get sender JID
    } else if (m.mentionedJid.length > 0) {
        jid = m.mentionedJid[0]; // If mentioning a user, get their JID
    } else if (q && q.includes("@")) {
        jid = q.replace(/[@\s]/g, '') + "@s.whatsapp.net"; // If manually typing a JID
    } else {
        await react("❌");
        return reply("Please mention a user or reply to their message.");
    }

    try {
        await conn.updateBlockStatus(jid, "block");
        await react("✅");
        reply(`Successfully blocked @${jid.split("@")[0]}`, { mentions: [jid] });
    } catch (error) {
        console.error("Block command error:", error);
        await react("❌");
        reply("Failed to block the user.");
    }
});

cmd({
    pattern: "unblock",
    desc: "Unblocks a person",
    category: "owner",
    react: "🔓",
    filename: __filename
},
async (conn, m, { reply, q, react }) => {
    // Get the bot owner's number dynamically
    const botOwner = conn.user.id.split(":")[0] + "@s.whatsapp.net";

    if (m.sender !== botOwner) {
        await react("❌");
        return reply("Only the bot owner can use this command.");
    }

    let jid;
    if (m.quoted) {
        jid = m.quoted.sender;
    } else if (m.mentionedJid.length > 0) {
        jid = m.mentionedJid[0];
    } else if (q && q.includes("@")) {
        jid = q.replace(/[@\s]/g, '') + "@s.whatsapp.net";
    } else {
        await react("❌");
        return reply("Please mention a user or reply to their message.");
    }

    try {
        await conn.updateBlockStatus(jid, "unblock");
        await react("✅");
        reply(`Successfully unblocked @${jid.split("@")[0]}`, { mentions: [jid] });
    } catch (error) {
        console.error("Unblock command error:", error);
        await react("❌");
        reply("Failed to unblock the user.");
    }
});           

//=================
cmd({
    pattern: "shutdown",
    desc: "Shutdown the bot.",
    category: "owner",
    react: "🛑",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    reply("🛑 Shutting down...").then(() => process.exit());
});
// 2. Broadcast Message to All Groups
cmd({
    pattern: "broadcast",
    desc: "Broadcast a message to all groups.",
    category: "owner",
    react: "📢",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    if (args.length === 0) return reply("📢 Please provide a message to broadcast.");
    const message = args.join(' ');
    const groups = Object.keys(await conn.groupFetchAllParticipating());
    for (const groupId of groups) {
        await conn.sendMessage(groupId, { text: message }, { quoted: mek });
    }
    reply("📢 Message broadcasted to all groups.");
});

// 6. Clear All Chats
cmd({
    pattern: "clearchats",
    desc: "Clear all chats from the bot.",
    category: "owner",
    react: "🧹",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    try {
        const chats = conn.chats.all();
        for (const chat of chats) {
            await conn.modifyChat(chat.jid, 'delete');
        }
        reply("🧹 All chats cleared successfully!");
    } catch (error) {
        reply(`❌ Error clearing chats: ${error.message}`);
    }
});

// 8. Group JIDs List
cmd({
    pattern: "gjid",
    desc: "Get the list of JIDs for all groups the bot is part of.",
    category: "owner",
    react: "📝",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    const groups = await conn.groupFetchAllParticipating();
    const groupJids = Object.keys(groups).join('\n');
    reply(`📝 *Group JIDs:*\n\n${groupJids}`);
});

//==================

cmd({
    pattern: "jid",
    alias: ["id", "chatid", "gjid"],  
    desc: "Get full JID of current chat/user (Creator Only)",
    react: "🆔",
    category: "owner",
    filename: __filename,
}, async (conn, mek, m, { 
    from, isGroup, isCreator, reply, sender 
}) => {
    try {
        if (!isOwner) {
            return reply("❌ *Command Restricted* - Only my creator can use this.");
        }

        if (isGroup) {
            // Ensure group JID ends with @g.us
            const groupJID = from.includes('@g.us') ? from : `${from}@g.us`;
            return reply(`👥 *Group JID:*\n\`\`\`${groupJID}\`\`\``);
        } else {
            // Ensure user JID ends with @s.whatsapp.net
            const userJID = sender.includes('@s.whatsapp.net') ? sender : `${sender}@s.whatsapp.net`;
            return reply(`👤 *User JID:*\n\`\`\`${userJID}\`\`\``);
        }

    } catch (e) {
        console.error("JID Error:", e);
        reply(`⚠️ Error fetching JID:\n${e.message}`);
    }
});

//=============

cmd({
    pattern: "leave",
    alias: ["left", "leftgc", "leavegc"],
    desc: "Leave the group",
    react: "🎉",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply
}) => {
    try {

        if (!isGroup) {
            return reply("This command can only be used in groups.");
        }
        

        const botOwner = conn.user.id.split(":")[0]; 
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }

        reply("Leaving group...");
        await sleep(1500);
        await conn.groupLeave(from);
        reply("Goodbye! 👋");
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e}`);
    }
});

//=================

const stylizedChars = {
    a: '🅐', b: '🅑', c: '🅒', d: '🅓', e: '🅔', f: '🅕', g: '🅖',
    h: '🅗', i: '🅘', j: '🅙', k: '🅚', l: '🅛', m: '🅜', n: '🅝',
    o: '🅞', p: '🅟', q: '🅠', r: '🅡', s: '🅢', t: '🅣', u: '🅤',
    v: '🅥', w: '🅦', x: '🅧', y: '🅨', z: '🅩',
    '0': '⓿', '1': '➊', '2': '➋', '3': '➌', '4': '➍',
    '5': '➎', '6': '➏', '7': '➐', '8': '➑', '9': '➒'
};

cmd({
    pattern: "chr",
    alias: ["creact"],
    react: "🔤",
    desc: "React to channel messages with stylized text",
    category: "owner",
    use: '.chr <channel-link> <text>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isOwner) return reply("❌ Owner only command");
        if (!q) return reply(`Usage:\n${command} https://whatsapp.com/channel/1234567890 hello`);

        const [link, ...textParts] = q.split(' ');
        if (!link.includes("whatsapp.com/channel/")) return reply("Invalid channel link format");
        
        const inputText = textParts.join(' ').toLowerCase();
        if (!inputText) return reply("Please provide text to convert");

        const emoji = inputText
            .split('')
            .map(char => {
                if (char === ' ') return '―';
                return stylizedChars[char] || char;
            })
            .join('');

        const channelId = link.split('/')[4];
        const messageId = link.split('/')[5];
        if (!channelId || !messageId) return reply("Invalid link - missing IDs");

        const channelMeta = await conn.newsletterMetadata("invite", channelId);
        await conn.newsletterReactMessage(channelMeta.id, messageId, emoji);

        return reply(`*${BOT} CHANNEL REACAT*
        *Success!* Reaction sent
        *Channel:* ${channelMeta.name}
        *Reaction:* ${emoji}
${CREATER}`);
    } catch (e) {
        console.error(e);
        reply(`❎ Error: ${e.message || "Failed to send reaction"}`);
    }
});

cmd({
    pattern: "blocklist",
    desc: "View the list of blocked users.",
    category: "owner",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("*📛 You are not the owner!*");

    try {
        // Fetch the block list
        const blockedUsers = await conn.fetchBlocklist();

        if (blockedUsers.length === 0) {
            return reply("📋 Your block list is empty.");
        }

        // Format the blocked users with 📌 and count the total
        const list = blockedUsers
            .map((user, i) => `🚧 BLOCKED ${user.split('@')[0]}`) // Remove domain and add 📌
            .join('\n');

        const count = blockedUsers.length;
        reply(`📋 Blocked Users (${count}):\n\n${list}`);
    } catch (err) {
        console.error(err);
        reply(`❌ Failed to fetch block list: ${err.message}`);
    }
});

cmd({
    pattern: "getbio",
    desc: "Displays the user's bio.",
    category: "owner",
    filename: __filename,
}, async (conn, mek, m, { args, reply }) => {
    try {
        const jid = args[0] || mek.key.remoteJid;
        const about = await conn.fetchStatus?.(jid);
        if (!about) return reply("No bio found.");
        return reply(`User Bio:\n\n${about.status}`);
    } catch (error) {
        console.error("Error in bio command:", error);
        reply("No bio found.");
    }
});
cmd({
    pattern: "setppall",
    desc: "Update Profile Picture Privacy",
    category: "owner",
    react: "🔐",
    filename: __filename
}, 
async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    
    try {
        const value = args[0] || 'all'; 
        const validValues = ['all', 'contacts', 'contact_blacklist', 'none'];  
        
        if (!validValues.includes(value)) {
            return reply("❌ Invalid option. Valid options are: 'all', 'contacts', 'contact_blacklist', 'none'.");
        }
        
        await conn.updateProfilePicturePrivacy(value);
        reply(`✅ Profile picture privacy updated to: ${value}`);
    } catch (e) {
        return reply(`*An error occurred while processing your request.*\n\n_Error:_ ${e.message}`);
    }
});
cmd({
    pattern: "setonline",
    desc: "Update Online Privacy",
    category: "owner",
    react: "🔐",
    filename: __filename
}, 
async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");

    try {
        const value = args[0] || 'all'; 
        const validValues = ['all', 'match_last_seen'];
        
        if (!validValues.includes(value)) {
            return reply("❌ Invalid option. Valid options are: 'all', 'match_last_seen'.");
        }

        await conn.updateOnlinePrivacy(value);
        reply(`✅ Online privacy updated to: ${value}`);
    } catch (e) {
        return reply(`*An error occurred while processing your request.*\n\n_Error:_ ${e.message}`);
    }
});

cmd({
    pattern: "setpp",
    desc: "Set bot profile picture.",
    category: "owner",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, quoted, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    if (!quoted || !quoted.message.imageMessage) return reply("❌ Please reply to an image.");
    try {
        const stream = await downloadContentFromMessage(quoted.message.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const mediaPath = path.join(__dirname, `${Date.now()}.jpg`);
        fs.writeFileSync(mediaPath, buffer);

        // Update profile picture with the saved file
        await conn.updateProfilePicture(conn.user.jid, { url: `file://${mediaPath}` });
        reply("🖼️ Profile picture updated successfully!");
    } catch (error) {
        console.error("Error updating profile picture:", error);
        reply(`❌ Error updating profile picture: ${error.message}`);
    }
});

cmd({
    pattern: "setmyname",
    desc: "Set your WhatsApp display name.",
    category: "owner",
    react: "⚙️",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply, args }) => {
    if (!isOwner) return reply("❌ You are not the owner!");

    // Ensure you have the display name argument
    const displayName = args.join(" ");
    if (!displayName) return reply("❌ Please provide a display name.");

    try {
        // Ensure the session is loaded before trying to update
        const { state, saveCreds } = await useMultiFileAuthState('path/to/auth/folder');
        const conn = makeWASocket({
            auth: state,
            printQRInTerminal: true,
        });

        conn.ev.on('creds.update', saveCreds);

        // Update display name after connection
        await conn.updateProfileName(displayName);
        reply(`✅ Your display name has been set to: ${displayName}`);
    } catch (err) {
        console.error(err);
        reply("❌ Failed to set your display name.");
    }
});

cmd({
    pattern: "updatebio",
    react: "🥏",
    desc: "Change the Bot number Bio.",
    category: "owner",
    use: '.updatebio',
    filename: __filename
},
async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isOwner) return reply('🚫 *You must be an Owner to use this command*');
        if (!q) return reply('❓ *Enter the New Bio*');
        if (q.length > 139) return reply('❗ *Sorry! Character limit exceeded*');
        await conn.updateProfileStatus(q);
        await conn.sendMessage(from, { text: "✔️ *New Bio Added Successfully*" }, { quoted: mek });
    } catch (e) {
        reply('🚫 *An error occurred!*\n\n' + e);
        l(e);
    }
});
cmd({
    pattern: "groupsprivacy",
    desc: "Update Group Add Privacy",
    category: "owner",
    react: "🔐",
    filename: __filename
}, 
async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");

    try {
        const value = args[0] || 'all'; 
        const validValues = ['all', 'contacts', 'contact_blacklist', 'none'];
        
        if (!validValues.includes(value)) {
            return reply("❌ Invalid option. Valid options are: 'all', 'contacts', 'contact_blacklist', 'none'.");
        }

        await conn.updateGroupsAddPrivacy(value);
        reply(`✅ Group add privacy updated to: ${value}`);
    } catch (e) {
        return reply(`*An error occurred while processing your request.*\n\n_Error:_ ${e.message}`);
    }
});

cmd({
    pattern: "getprivacy",
    desc: "Get the bot Number Privacy Setting Updates.",
    category: "owner",
    use: '.getprivacy',
    filename: __filename
},
async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isOwner) return reply('🚫 *You must be an Owner to use this command*');
        const duka = await conn.fetchPrivacySettings?.(true);
        if (!duka) return reply('🚫 *Failed to fetch privacy settings*');
        
        let puka = `
╭───「 𝙿𝚁𝙸𝚅𝙰𝙲𝚈  」───◆  
│ ∘ 𝚁𝚎𝚊𝚍 𝚁𝚎𝚌𝚎𝚒𝚙𝚝: ${duka.readreceipts}  
│ ∘ 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝙿𝚒𝚌𝚝𝚞𝚛𝚎: ${duka.profile}  
│ ∘ 𝚂𝚝𝚊𝚝𝚞𝚜: ${duka.status}  
│ ∘ 𝙾𝚗𝚕𝚒𝚗𝚎: ${duka.online}  
│ ∘ 𝙻𝚊𝚜𝚝 𝚂𝚎𝚎𝚗: ${duka.last}  
│ ∘ 𝙶𝚛𝚘𝚞𝚙 𝙿𝚛𝚒𝚟𝚊𝚌𝚢: ${duka.groupadd}  
│ ∘ 𝙲𝚊𝚕𝚕 𝙿𝚛𝚒𝚟𝚊𝚌𝚢: ${duka.calladd}  
╰────────────────────`;
        await conn.sendMessage(from, { text: puka }, { quoted: mek });
    } catch (e) {
        reply('🚫 *An error occurred!*\n\n' + e);
        l(e);
    }
});

//============

cmd({
    pattern: "getpp",
    desc: "Fetch the profile picture of a tagged or replied user.",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { quoted, isGroup, sender, participants, reply }) => {
    try {
        // Determine the target user
        const targetJid = quoted ? quoted.sender : sender;

        if (!targetJid) return reply("⚠️ Please reply to a message to fetch the profile picture.");

        // Fetch the user's profile picture URL
        const userPicUrl = await conn.profilePictureUrl(targetJid, "image").catch(() => null);

        if (!userPicUrl) return reply("⚠️ No profile picture found for the specified user.");

        // Send the user's profile picture
        await conn.sendMessage(m.chat, {
            image: { url: userPicUrl },
            caption: "🖼️ Here is the profile picture of the specified user."
        });
    } catch (e) {
        console.error("Error fetching user profile picture:", e);
        reply("❌ An error occurred while fetching the profile picture. Please try again later.");
    }
});
//============ MAIN COMMAND ==========================
//================= menu =====================
cmd({
    pattern: "menu",
    react: "📋",
    desc: "get command list",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, pushname, reply }) => {
    try {
        const categories = ['main', 'movie', 'download', 'group', 'admin', 'owner', 'convert', 'search', 'other', 'ai', 'fun', 'settings', 'tool', 'wallpaper'];
        const categoryNames = {
            main: 'MAIN COMMANDS 🌟',
            movie: 'MOVIE COMMANDS 🎥',
            download: 'DOWNLOAD COMMANDS 📥',
            group: 'GROUP COMMANDS 👥',
            admin: 'ADMIN COMMANDS 🔒',
            owner: 'OWNER COMMANDS 🧑‍💻',
            convert: 'CONVERT COMMANDS 🔄',
            search: 'SEARCH COMMANDS 🔍',
            other: 'OTHER COMMANDS 🎭',
            ai: 'AI COMMANDS 🤖',
            fun: 'FUN COMMANDS 😄',
            settings: 'SETTINGS COMMANDS ⚙️',
            tool: 'TOOL COMMANDS 🛠️',
            wallpaper: 'WALLPAPER COMMANDS 🌌',
        };

        // Step 1: Build subcommand structure
        const categorizedCommands = {};
        for (const category of categories) {
            categorizedCommands[category] = {};
        }

        for (const cmdObj of commands) {
            if (!cmdObj.pattern || cmdObj.dontAddCommandList) continue;
            const category = cmdObj.category || 'main';
            if (!categorizedCommands[category]) continue;

            const base = cmdObj.pattern.split(" ")[0].trim();
            if (!categorizedCommands[category][base]) {
                categorizedCommands[category][base] = [];
            }
            if (!categorizedCommands[category][base].includes(cmdObj.pattern)) {
                categorizedCommands[category][base].push(cmdObj.pattern);
            }
        }

        // Step 2: Generate emoji menu
        const Numbers = ["* 𝟏", "* 𝟐", "* 𝟑", "* 𝟒", "* 𝟓", "* 𝟔", "* 𝟕", "* 𝟖", "* 𝟗", "* 𝟏𝟎", "* 𝟏𝟏", "* 𝟏𝟐", "* 𝟏𝟑", "* 𝟏𝟒"];
        let menuText = '';
        categories.forEach((cat, i) => {
            menuText += `${Numbers[i]} ${categoryNames[cat]}\n`;
        });

        menuText += `\n> _*created by manisha coder*_`;

        const sentMenu = await conn.sendMessage(from, {
            image: { url: `https://i.ibb.co/6RzcnLWR/jpg.jpg` },
            caption: menuText
        }, { quoted: mek });

        // Step 3: Wait for reply and show category with subcommands
        conn.ev.on('messages.upsert', async (msgUpdate) => {
            const msg = msgUpdate.messages[0];
            if (!msg.message || !msg.message.extendedTextMessage) return;

            const selected = msg.message.extendedTextMessage.text.trim();
            if (msg.message.extendedTextMessage.contextInfo?.stanzaId === sentMenu.key.id) {
                const index = parseInt(selected);
                if (!isNaN(index) && index >= 1 && index <= categories.length) {
                    const selectedCat = categories[index - 1];
                    const commandTree = categorizedCommands[selectedCat];
                    let output = `╔═══════════════⫸\n  ${categoryNames[selectedCat].toUpperCase()} \n╚═══════════════⫸\n\n`;
                    output += '╔═══════════════⫸\n';

                    const added = new Set();

                    for (const [main, subs] of Object.entries(commandTree)) {
                        if (added.has(main)) continue;

                        output += `╠➢  🖊️ *Command:* ${config.PREFIX}${main}\n`;
                        output += `╠➢  📄 *Apply :* ${getDescription(main, selectedCat) || 'No description available'}\n`;

                        for (const sub of subs) {
                            if (sub !== main && !added.has(sub)) {
                                output += `╠➢  🔸 Subcommand: ${config.PREFIX}${sub}\n`;
                                added.add(sub);
                            }
                        }

                        output += `║\n`;
                        added.add(main);
                    }

                    output += '╚═══════════════⫸';

                    if (!output.trim()) {
                        output = `⚠️ No commands found in this category.`;
                    }

                    await conn.sendMessage(from, {
                        text: output
                    }, { quoted: msg });
                } else {
                    await conn.sendMessage(from, {
                        text: "❌ Invalid number. Please reply with a valid option."
                    }, { quoted: msg });
                }
            }
        });

        // Helper function
        function getDescription(pattern, category) {
            const cmdObj = commands.find(c => c.pattern?.split(" ")[0] === pattern && c.category === category);
            return cmdObj?.desc;
        }

    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

//================ owner ================

cmd({
    pattern: "owner",
    react: "✅", 
    desc: "Get owner number",
    category: "main",
    filename: __filename
}, 
async (conn, mek, m, { from }) => {
    try {
        const ownerNumber = '94721551183';
        const ownerName = 'manisha coder';

        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${ownerName}\n` +  
                      `TEL;type=CELL;type=VOICE;waid=${ownerNumber.replace('+', '')}:${ownerNumber}\n` + 
                      'END:VCARD';

        // Only send contact card
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

    } catch (error) {
        console.error(error);
        reply(`An error occurred: ${error.message}`);
    }
});

//===================== repo ======================

cmd({
    pattern: "repo",
    alias: ["sc", "script", "info"],
    desc: "Fetch information about a GitHub repository.",
    react: "📂",
    category: "main",
    filename: __filename,
},
async (conn, mek, m, { from, reply }) => {
    const githubRepoURL = 'https://github.com/manisha-Official18/MANISHA-MD';

    try {
        // Extract username and repo name from the URL
        const [, username, repoName] = githubRepoURL.match(/github\.com\/([^/]+)\/([^/]+)/);

        // Fetch repository details using GitHub API
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`);
        
        if (!response.ok) {
            throw new Error(`GitHub API request failed with status ${response.status}`);
        }

        const repoData = await response.json();

        // Format the repository information
        const formattedInfo = `*BOT NAME:*\n> ${repoData.name}\n\n*OWNER NAME:*\n> ${repoData.owner.login}\n\n*STARS:*\n> ${repoData.stargazers_count}\n\n*FORKS:*\n> ${repoData.forks_count}\n\n*GITHUB LINK:*\n> ${repoData.html_url}\n\n*DESCRIPTION:*\n> ${repoData.description || 'No description'}\n\n*DON'T STAR AND FORK*\n${CREATER}`;

        // Send an image with the formatted info as a caption and context info
        await conn.sendMessage(from, {
            image: { url: `https://i.ibb.co/6RzcnLWR/jpg.jpg`},
            caption: formattedInfo
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Error in repo command:", error);
        reply("Sorry, something went wrong while fetching the repository information. Please try again later.");
    }
});

cmd({
      pattern: "alive",
      alias: ["online"],
      desc: "Chek Bot Alive",
      category: "main",
      react: "👋",
      filename: __filename
    },
    
    async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try{
          
          // Status message to be sent
          let desc = `╔══╣❍ᴀʟɪᴠᴇ❍╠═══⫸
╠➢ *ᴘᴏᴡᴇʀꜰᴜʟʟ ᴊᴀᴠᴀꜱᴄʀɪᴘᴛ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ ...*
╠➢ *ᴏᴡɴᴇʀ : 94721551183 ...*
╠➢ *ᴠᴇʀꜱɪᴏɴ :* *1.0 ...*
╚═════════════════⫸

${CREATER}`

          // Sending the image with caption
await conn.sendMessage(from,{image: {url: `https://i.ibb.co/6RzcnLWR/jpg.jpg`},caption: desc},{quoted: mek });

      } catch (e) {
          console.error(e);
          reply(`*Error:* ${e.message}`);
      }
    });

cmd({
    pattern: "system",
    react: "♠️",
    alias: ["status"],
    desc: "cheack uptime",
    category: "main",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
let status = `╔══╣❍${BOT} ꜱʏꜱᴛᴇᴍ❍╠═══⫸
╠➢ *ᴜᴘᴛɪᴍᴇ :* ${runtime(process.uptime())}
╠➢ *ʀᴀᴍ ᴜꜱᴀɢᴇ :* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB
╠➢ *ʜᴏꜱᴛɴᴀᴍᴇ :* ${os.hostname()}
╚════════════════⫸

${CREATER}`
await conn.sendMessage(from,{image:{url: `https://i.ibb.co/6RzcnLWR/jpg.jpg`},caption:`${status}`},{quoted:mek})

}catch(e){
console.log(e)
reply(`${e}`)
}
})

cmd({
    pattern: "ping",
    alias: ["speed"],
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        const start = new Date().getTime();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        // Ensure reaction and text emojis are different
        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        // Send reaction using conn.sendMessage()
        await conn.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = (end - start) / 1000;

        await conn.sendMessage(from,{image: {url: `https://i.ibb.co/6RzcnLWR/jpg.jpg`},caption: `*${BOT} SPEED: ${responseTime.toFixed(2)}ms ${reactionEmoji}*`},{quoted: mek});
        
    } catch (e) {
        console.error("Error in ping command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});


cmd({
      pattern: "runtime",
      desc: "Chek Bot Runtime",
      category: "main",
      react: "⏰",
      filename: __filename
    }, async (conn, mek, m, { from, reply }) => {
      try {
      
      let desc = `╔══╣❍ʀᴜɴᴛɪᴍᴇ❍╠═══⫸\n╠➢ *🚀 ʀᴜɴᴛɪᴍᴇ :* ${runtime(process.uptime())}\n╚═════════════════⫸\n${CREATER}`

          // Sending the image with caption
          await conn.sendMessage(from,{image: {url: `https://i.ibb.co/6RzcnLWR/jpg.jpg`},caption: desc},{quoted: mek});
          
      } catch (e) {
          console.error(e);
          reply(`*Error:* ${e.message}`);
      }
    });
    


//================ AI COMMAND ===================
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBP9qAGQUHjtIPuaZcyvSnbZDGSyHUD6bc`;
cmd({
  pattern: "gemini",
  alias: ["chatgpt"],
  react: '🤖',
  desc: "Ask anything to Google Gemini AI.",
  category: "ai",
  use: ".gemini <Your Quoestion>",
  filename: __filename
}, async (conn, mek, msg, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
  try {
    const text = args.join(" ");
    if (!text) {
      return reply(`❗️ Please GFive Me A Question`);
    }

    const prompt = `my name is ${pushname}, Your name is manisha AI. you are a WhatsApp AI Bot. you were made by මනිෂ coder. answer in the language the person talking to you speak. Answer in a way that doesn't sound like you're a bot. think you are human and answer. Use meaningful emojis. my question is: ${text}`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const response = await axios.post(
    GEMINI_API_URL,
    payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data || !response.data.candidates || !response.data.candidates[0]?.content?.parts) {
      return reply("❌ error in the answer. 😢");
    }
    
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    await reply(`${aiResponse}`);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    reply("❌ Error in the quation 😢");
  }
});

//=====================

cmd({
    pattern: "gpt",
    alias: ["bot", "xd", "gpt4", "bing"],
    desc: "Chat with an AI model",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for the AI.\nExample: `.ai Hello`");

        const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.message) {
            await react("❌");
            return reply("AI failed to respond. Please try again later.");
        }

        await reply(`🤖 *AI Response:*\n\n${data.message}`);
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
        console.error("Error in AI command:", e);
        await react("❌");
        reply("An error occurred while communicating with the AI.");
    }
});

//============ OTHER COMMAND ==================
cmd({
    pattern: "vcc",
    desc: "🎴 Generate Virtual Credit Cards (VCCs)",
    react: "💳",
    category: "other",
    filename: __filename,
}, async (conn, mek, m, { reply }) => {
    const apiUrl = `https://api.siputzx.my.id/api/tools/vcc-generator?type=MasterCard&count=5`;

    try {
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            return reply("❌ Unable to generate VCCs. Please try again later.");
        }

        let responseMessage = `🎴 *Generated VCCs* (Type: Mastercard, Count: 5):\n\n`;

        result.data.forEach((card, index) => {
            responseMessage += `#️⃣ *Card ${index + 1}:*\n`;
            responseMessage += `🔢 *Card Number:* ${card.cardNumber}\n`;
            responseMessage += `📅 *Expiration Date:* ${card.expirationDate}\n`;
            responseMessage += `🧾 *Cardholder Name:* ${card.cardholderName}\n`;
            responseMessage += `🔒 *CVV:* ${card.cvv}\n\n`;
        });

        return reply(responseMessage);
    } catch (error) {
        console.error("Error fetching VCC data:", error);
        return reply("❌ An error occurred while generating VCCs. Please try again later.");
    }
});

cmd({
    pattern: "weather",
    desc: "🌤 Get weather information for a location",
    react: "🌤",
    category: "other",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❗ Please provide a city name. Usage: .weather [city name]");
        const apiKey = '2d61a72574c11c4f36173b627f8cb177'; 
        const city = q;
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        const response = await axios.get(url);
        const data = response.data;
        const weather = `╔══╣❍ᴡᴇᴀᴛʜᴇʀ❍╠═══⫸
🌍 *ᴡᴇᴀᴛʜᴇʀ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ꜰᴏʀ ${data.name}, ${data.sys.country}* 🌍
🌡️ *ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ*: ${data.main.temp}°C
🌡️ *ꜰᴇᴇʟꜱ ʟɪᴋᴇ*: ${data.main.feels_like}°C
🌡️ *ᴍɪɴ ᴛᴇᴍᴘ*: ${data.main.temp_min}°C
🌡️ *ᴍᴀx ᴛᴇᴍᴘ*: ${data.main.temp_max}°C
💧 *ʜᴜᴍɪᴅɪᴛʏ*: ${data.main.humidity}%
☁️ *ᴡᴇᴀᴛʜᴇʀ*: ${data.weather[0].main}
🌫️ *ꜱᴇꜱᴄʀɪᴘᴛɪᴏɴ*: ${data.weather[0].description}
💨 *ᴡɪɴᴅ ꜱᴘᴇᴇᴅ*: ${data.wind.speed} m/s
🔽 *ᴘʀᴇꜱꜱᴜʀᴇ*: ${data.main.pressure} hPa
╚═══════════════════⫸

${CREATER}`;
        return reply(weather);
    } catch (e) {
        console.log(e);
        if (e.response && e.response.status === 404) {
            return reply("🚫 City not found. Please check the spelling and try again.");
        }
        return reply("⚠️ An error occurred while fetching the weather information. Please try again later.");
    }
});

cmd({
    pattern: "countryinfo",
    alias: ["cinfo", "country","cinfo2"],
    desc: "Get information about a country",
    category: "other",
    react: "🌍",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a country name.\nExample: `.countryinfo Pakistan`");

        const apiUrl = `https://api.siputzx.my.id/api/tools/countryInfo?name=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.data) {
            await react("❌");
            return reply(`No information found for *${q}*. Please check the country name.`);
        }

        const info = data.data;
        let neighborsText = info.neighbors.length > 0
            ? info.neighbors.map(n => `🌍 *${n.name}*`).join(", ")
            : "No neighboring countries found.";

        const text = `🌍 *Country Information: ${info.name}* 🌍\n\n` +
                     `🏛 *Capital:* ${info.capital}\n` +
                     `📍 *Continent:* ${info.continent.name} ${info.continent.emoji}\n` +
                     `📞 *Phone Code:* ${info.phoneCode}\n` +
                     `📏 *Area:* ${info.area.squareKilometers} km² (${info.area.squareMiles} mi²)\n` +
                     `🚗 *Driving Side:* ${info.drivingSide}\n` +
                     `💱 *Currency:* ${info.currency}\n` +
                     `🔤 *Languages:* ${info.languages.native.join(", ")}\n` +
                     `🌟 *Famous For:* ${info.famousFor}\n` +
                     `🌍 *ISO Codes:* ${info.isoCode.alpha2.toUpperCase()}, ${info.isoCode.alpha3.toUpperCase()}\n` +
                     `🌎 *Internet TLD:* ${info.internetTLD}\n\n` +
                     `🔗 *Neighbors:* ${neighborsText}`;

        await conn.sendMessage(from, {
            image: { url: info.flag },
            caption: text,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: mek });

        await react("✅"); // React after successful response
    } catch (e) {
        console.error("Error in countryinfo command:", e);
        await react("❌");
        reply("An error occurred while fetching country information.");
    }
});


cmd({
    pattern: "githubstalk",
    desc: "Fetch detailed GitHub user profile including profile picture.",
    category: "other",
    react: "📚",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const username = args[0];
        if (!username) {
            return reply("Please provide a GitHub username.");
        }

        const apiUrl = `https://api.github.com/users/${username}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        let userInfo = `╔══╣❍ɢɪᴛʜᴜʙꜱᴛᴀʀʟᴋ❍╠═══⫸
👤 *ᴜꜱᴇʀ ɴᴀᴍᴇ*: ${data.name || data.login}

🔗 *ɢɪᴛʜᴜʙ ᴜʀʟ*:(${data.html_url})

📝 *ʙɪᴏ*: ${data.bio || 'Not available'}

🏙️ *ʟᴏᴄᴀᴛɪᴏɴ*: ${data.location || 'Unknown'}

📊 *ᴘᴜʙʟɪᴄ ʀᴇᴘᴏ*: ${data.public_repos}

👥 *ꜰᴏʟʟᴏᴡᴇʀꜱ*: ${data.followers} | Following: ${data.following}

📅 *ᴄʀᴇᴀᴛʀᴅ ᴅᴀᴛᴇ*: ${new Date(data.created_at).toDateString()}

🔭 *ᴘᴜʙʟɪᴄ ɢɪꜱᴛꜱ*: ${data.public_gists}

╚═══════════════════⫸

${CREATER}`;

        await conn.sendMessage(from, { image: { url: data.avatar_url }, caption: userInfo }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply(`Error fetching data🤕: ${e.response ? e.response.data.message : e.message}`);
    }
});

cmd({
  pattern: "twitterxstalk",
  alias: ["twitterstalk", "twtstalk"],
  desc: "Get details about a Twitter/X user.",
  react: "🔍",
  category: "other",
  filename: __filename
}, async (conn, m, store, { from, quoted, q, reply }) => {
  try {
    if (!q) {
      return reply("❌ Please provide a valid Twitter/X username.");
    }

    await conn.sendMessage(from, {
      react: { text: "⏳", key: m.key }
    });

    const apiUrl = `https://delirius-apiofc.vercel.app/tools/xstalk?username=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl);

    if (!data || !data.status || !data.data) {
      return reply("⚠️ Failed to fetch Twitter/X user details. Ensure the username is correct.");
    }

    const user = data.data;
    const verifiedBadge = user.verified ? "✅" : "❌";

    const caption = `╔══╣❍ᴛᴡɪᴛᴛᴇʀ/xꜱᴛᴀʟᴋ❍╠═══⫸\n`
      + `╠➢👤 *ɴᴀᴍᴇ:* ${user.name}\n`
      + `╠➢🔹 *ᴜꜱᴇʀɴᴀᴍᴇ:* @${user.username}\n`
      + `╠➢✔️ *ᴠᴇʀɪꜰɪᴇᴅ:* ${verifiedBadge}\n`
      + `╠➢👥 *ꜰᴏʟʟᴏᴡᴇʀꜱ:* ${user.followers_count}\n`
      + `╠➢👤 *ꜰᴏʟʟᴏᴡɪɴɢ:* ${user.following_count}\n`
      + `╠➢📝 *ᴛᴡᴇᴇᴛꜱ:* ${user.tweets_count}\n`
      + `╠➢📅 *ᴊᴏɪɴ:* ${user.created}\n`
      + `╠➢🔗 *ᴘʀᴏꜰɪʟᴇ:* [Click Here](${user.url})\n`
      + `╚══════════════════⫸\n`
      + `${CREATER}`;

    await conn.sendMessage(from, {
      image: { url: user.avatar },
      caption: caption
    }, { quoted: m });

  } catch (error) {
    console.error("Error:", error);
    reply("❌ An error occurred while processing your request. Please try again.");
  }
});

//=====================

cmd({
  pattern: "tiktokstalk",
  alias: ["tstalk", "ttstalk"],
  react: "📱",
  desc: "Fetch TikTok user profile details.",
  category: "other",
  filename: __filename
}, async (conn, m, store, { from, args, q, reply }) => {
  try {
    if (!q) {
      return reply("❎ Please provide a TikTok username.\n\n*Example:* .tiktokstalk mrbeast");
    }

    const apiUrl = `https://api.siputzx.my.id/api/stalk/tiktok?username=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl);

    if (!data.status) {
      return reply("❌ User not found. Please check the username and try again.");
    }

    const user = data.data.user;
    const stats = data.data.stats;

    const profileInfo = `🎭 *TikTok Profile Stalker* 🎭

👤 *Username:* @${user.uniqueId}
📛 *Nickname:* ${user.nickname}
✅ *Verified:* ${user.verified ? "Yes ✅" : "No ❌"}
📍 *Region:* ${user.region}
📝 *Bio:* ${user.signature || "No bio available."}
🔗 *Bio Link:* ${user.bioLink?.link || "No link available."}

📊 *Statistics:*
👥 *Followers:* ${stats.followerCount.toLocaleString()}
👤 *Following:* ${stats.followingCount.toLocaleString()}
❤️ *Likes:* ${stats.heartCount.toLocaleString()}
🎥 *Videos:* ${stats.videoCount.toLocaleString()}

📅 *Account Created:* ${new Date(user.createTime * 1000).toLocaleDateString()}
🔒 *Private Account:* ${user.privateAccount ? "Yes 🔒" : "No 🌍"}

🔗 *Profile URL:* https://www.tiktok.com/@${user.uniqueId}
`;

    const profileImage = { image: { url: user.avatarLarger }, caption: profileInfo };

    await conn.sendMessage(from, profileImage, { quoted: m });
  } catch (error) {
    console.error("❌ Error in TikTok stalk command:", error);
    reply("⚠️ An error occurred while fetching TikTok profile data.");
  }
});

//==================

cmd({
  pattern: "ytstalk",
  alias: ["ytinfo"],
  desc: "Get details about a YouTube channel.",
  react: "🔍",
  category: "other",
  filename: __filename
}, async (conn, m, store, { from, quoted, q, reply }) => {
  try {
    if (!q) {
      return reply("❌ Please provide a valid YouTube channel username or ID.");
    }

    await conn.sendMessage(from, {
      react: { text: "⏳", key: m.key }
    });

    const apiUrl = `https://delirius-apiofc.vercel.app/tools/ytstalk?channel=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl);

    if (!data || !data.status || !data.data) {
      return reply("⚠️ Failed to fetch YouTube channel details. Ensure the username or ID is correct.");
    }

    const yt = data.data;
    const caption = `╭━━━〔 *YOUTUBE STALKER* 〕━━━⊷\n`
      + `┃👤 *Username:* ${yt.username}\n`
      + `┃📊 *Subscribers:* ${yt.subscriber_count}\n`
      + `┃🎥 *Videos:* ${yt.video_count}\n`
      + `┃🔗 *Channel Link:* (${yt.channel})\n`
      + `╰━━━⪼\n`
      + `${CREATER}`;

    await conn.sendMessage(from, {
      image: { url: yt.avatar },
      caption: caption
    }, { quoted: m });

  } catch (error) {
    console.error("Error:", error);
    reply("❌ An error occurred while processing your request. Please try again.");
  }
});


//========================

cmd({
    pattern: "trt",
    alias: ["translate"],
    desc: "🌍 Translate text between languages",
    react: "⚡",
    category: "other",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        const args = q.split(' ');
        if (args.length < 2) return reply("❗ Please provide a language code and text. Usage: .translate [language code] [text]");

        const targetLang = args[0];
        const textToTranslate = args.slice(1).join(' ');

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|${targetLang}`;

        const response = await axios.get(url);
        const translation = response.data.responseData.translatedText;

        const translationMessage = `╔══╣❍ᴛʀᴀɴꜱʟᴀᴛᴇᴅ❍╠═══⫸
╠➢*ᴏʀɪɢɪɴᴀʟ*: ${textToTranslate}
╠➢*ᴛʀᴀɴꜱʟᴀᴛᴇᴅ*: ${translation}
╠➢*ʟᴀɴɢᴜᴀɢᴇ*: ${targetLang.toUpperCase()}
╚════════════════════⫸
${CREATER}`;

        return reply(translationMessage);
    } catch (e) {
        console.log(e);
        return reply("⚠️ An error occurred data while translating the your text. Please try again later🤕");
    }
});


cmd({
    pattern: "tts",
    desc: "download songs",
    category: "other",
    react: "👧",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
if(!q) return reply("Need some text.")
    const url = googleTTS.getAudioUrl(q, {
  lang: 'hi-IN',
  slow: false,
  host: 'https://translate.google.com',
})
await conn.sendMessage(from, { audio: { url: url }, mimetype: 'audio/mpeg', ptt: true }, { quoted: mek })
    }catch(a){
reply(`${a}`)
}
})

cmd({
  pattern: "newsletter",
  alias: ["cjid", "id"],
  react: "📡",
  desc: "Get WhatsApp Channel info from link",
  category: "other",
  filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
  try {
    if (!q)
      return reply(`❎ *Please provide a WhatsApp Channel link.*\n\n📌 *Example:*\n.newsletter https://whatsapp.com/channel/xxxxxxxxxx`);

    const match = q.match(/whatsapp\.com\/channel\/([\w-]+)/);
    if (!match)
      return reply(`⚠️ *Invalid channel link!*\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx`);

    const inviteId = match[1];
    let metadata;

    try {
      metadata = await conn.newsletterMetadata("invite", inviteId);
    } catch {
      return reply("🚫 *Failed to fetch channel info.*\nDouble-check the link and try again.");
    }

    if (!metadata?.id)
      return reply("❌ *Channel not found or inaccessible.*");

    const infoText = `
╔══╣❍ɴᴇᴡꜱʟᴇᴛᴛᴇʀ❍╠═══⫸
╠➢ 🔖 *ID:* ${metadata.id}
╠➢ 🗂️ *Name:* ${metadata.name}
╠➢ 👥 *Followers:* ${metadata.subscribers?.toLocaleString() || "N/A"}
╠➢ 🗓️ *Created:* ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString("id-ID") : "Unknown"}
╚════════════════════════⫸

${CREATER}
`;

    if (metadata.preview) {
      await conn.sendMessage(from, {
        image: { url: `https://pps.whatsapp.net${metadata.preview}` },
        caption: infoText
      }, { quoted: m });
    } else {
      reply(infoText);
    }

  } catch (err) {
    console.error("❌ Newsletter Error:", err);
    reply("⚠️ *An unexpected error occurred while fetching the channel info.*");
  }
});

cmd({
  pattern: "bug",
  alias: ["reportbug", "bugreport"],
  desc: "Report a bug to the bot owner",
  category: "other",
  react: "🐞",
  filename: __filename
},
async (conn, mek, m, {
  from,
  q,
  pushname,
  sender,
  reply,
  isOwner
}) => {
  try {
    if (!q) return reply("❗ *Please describe the bug.*\n\n📌 Example:\n.bug The .play command is not working properly.");

    const ownerNumber = ["94721551183@s.whatsapp.net"]; // ⬅️ Replace with your number or multiple owners

    const bugMsg = `*🐞 Bug Report Received!*\n\n` +
                   `👤 *From:* ${pushname} (${sender.split("@")[0]})\n` +
                   `🌐 *Chat:* ${from.endsWith("@g.us") ? "Group" : "Private"}\n` +
                   `📝 *Message:*\n${q}`;

    // Send the bug message to each owner
    for (let admin of ownerNumber) {
      await conn.sendMessage(admin, { text: bugMsg });
    }

    // Confirmation to sender
    reply("✅ *Bug report sent successfully!*\nThank you for your feedback. 🛠️");

  } catch (e) {
    console.error(e);
    reply(`❌ *Error:* ${e.message}`);
  }
});

//==================
cmd({
  pattern: "srepo",
  desc: "Fetch information about a GitHub repository.",
  category: "other",
  react: "🍃",
  filename: __filename
}, async (conn, m, store, { from, args, reply }) => {
  try {
    const repoName = args.join(" ");
    if (!repoName) {
      return reply("❌ Please provide a GitHub repository in the format 📌 `owner/repo`.");
    }

    const apiUrl = `https://api.github.com/repos/${repoName}`;
    const { data } = await axios.get(apiUrl);

    let responseMsg = `📁 *GitHub Repository Info* 📁\n\n`;
    responseMsg += `📌 *Name*: ${data.name}\n`;
    responseMsg += `🔗 *URL*: ${data.html_url}\n`;
    responseMsg += `📝 *Description*: ${data.description || "No description"}\n`;
    responseMsg += `⭐ *Stars*: ${data.stargazers_count}\n`;
    responseMsg += `🍴 *Forks*: ${data.forks_count}\n`;
    responseMsg += `👤 *Owner*: ${data.owner.login}\n`;
    responseMsg += `📅 *Created At*: ${new Date(data.created_at).toLocaleDateString()}\n`;
    responseMsg += `${CREATER}`;

    await conn.sendMessage(from, { text: responseMsg }, { quoted: m });
  } catch (error) {
    console.error("GitHub API Error:", error);
    reply(`❌ Error fetching repository data: ${error.response?.data?.message || error.message}`);
  }
});

//================
cmd({
  pattern: "wpchinfo",
  alias: ["newsletter", "id"],
  react: "📡",
  desc: "Get WhatsApp Channel info from link",
  category: "other",
  filename: __filename
}, async (conn, mek, m, {
  from,
  args,
  q,
  reply
}) => {
  try {
    if (!q) return reply("❎ Please provide a WhatsApp Channel link.\n\n*Example:* .cinfo https://whatsapp.com/channel/123456789");

    const match = q.match(/whatsapp\.com\/channel\/([\w-]+)/);
    if (!match) return reply("⚠️ *Invalid channel link format.*\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx");

    const inviteId = match[1];

    let metadata;
    try {
      metadata = await conn.newsletterMetadata("invite", inviteId);
    } catch (e) {
      return reply("❌ Failed to fetch channel metadata. Make sure the link is correct.");
    }

    if (!metadata || !metadata.id) return reply("❌ Channel not found or inaccessible.");

    const infoText = `*— 乂 Channel Info —*\n\n` +
      `🆔 *ID:* ${metadata.id}\n` +
      `📌 *Name:* ${metadata.name}\n` +
      `👥 *Followers:* ${metadata.subscribers?.toLocaleString() || "N/A"}\n` +
      `📅 *Created on:* ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString("id-ID") : "Unknown"}`;

    if (metadata.preview) {
      await conn.sendMessage(from, {
        image: { url: `https://pps.whatsapp.net${metadata.preview}` },
        caption: infoText
      }, { quoted: m });
    } else {
      await reply(infoText);
    }

  } catch (error) {
    console.error("❌ Error in .cinfo plugin:", error);
    reply("⚠️ An unexpected error occurred.");
  }
});

//===================

cmd({
  pattern: "gpass",
  desc: "Generate a strong password.",
  category: "other",
  react: '🔐',
  filename: __filename
}, async (conn, m, store, {
  from,
  quoted,
  body,
  isCmd,
  command,
  args,
  q,
  isGroup,
  sender,
  senderNumber,
  botNumber2,
  botNumber,
  pushname,
  isMe,
  isOwner,
  groupMetadata,
  groupName,
  participants,
  groupAdmins,
  isBotAdmins,
  isAdmins,
  reply
}) => {
  try {
    // Password length specified by the user, defaults to 12 if not provided
    const passwordLength = args[0] ? parseInt(args[0]) : 12;

    // Validate the password length
    if (isNaN(passwordLength) || passwordLength < 8) {
      return reply("❌ Please provide a valid length for the password (Minimum 8 Characters).");
    }

    // Password generation function
    const generatePassword = (length) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?';
      let password = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, chars.length);
        password += chars[randomIndex];
      }
      return password;
    };

    // Generate the password
    const generatedPassword = generatePassword(passwordLength);

    // Send the message with the generated password
    await conn.sendMessage(from, {
      text: "🔐 *Your Strong Password* 🔐\n\nPlease find your generated password below:\n\n" + generatedPassword + "\n\n> _*created by manisha coder*_"
    }, {
      quoted: quoted
    });
    
  } catch (error) {
    console.error(error);
    reply("❌ Error generating password: " + error.message);
  }
});

//=================

cmd({
    pattern: "ytpost",
    alias: ["ytcommunity", "ytc"],
    desc: "Download a YouTube community post",
    category: "other",
    react: "🎥",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a YouTube community post URL.\nExample: `.ytpost <url>`");

        const apiUrl = `https://api.siputzx.my.id/api/d/ytpost?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.data) {
            await react("❌");
            return reply("Failed to fetch the community post. Please check the URL.");
        }

        const post = data.data;
        let caption = `📢 *YouTube Community Post* 📢\n\n` +
                      `📜 *Content:* ${post.content}`;

        if (post.images && post.images.length > 0) {
            for (const img of post.images) {
                await conn.sendMessage(from, { image: { url: img }, caption }, { quoted: mek });
                caption = ""; // Only add caption once, images follow
            }
        } else {
            await conn.sendMessage(from, { text: caption }, { quoted: mek });
        }

        await react("✅");
    } catch (e) {
        console.error("Error in ytpost command:", e);
        await react("❌");
        reply("An error occurred while fetching the YouTube community post.");
    }
});

//=================== TOOL COMMAND ====================
cmd({
    pattern: "gitclone",
    desc: "Download a GitHub repository as a ZIP file.",
    category: "tool",
    react: "🕊️",
    use: "<github_link>",
    filename: __filename
}, 
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        if (!q) return reply("Where is the link?\nExample:\n.gitclone repolink");

        if (!q.includes("github.com")) return reply("Invalid GitHub link!");

        let match = q.match(/(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i);
        if (!match) return reply("Invalid GitHub link format!");

        let [, owner, repo] = match;
        repo = repo.replace(/.git$/, '');
        let zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

        let response = await fetch(zipUrl, { method: "HEAD" });
        let filename = response.headers.get("content-disposition").match(/attachment; filename=(.*)/)[1];

        await conn.sendMessage(from, {
            document: { url: zipUrl },
            fileName: filename + ".zip",
            mimetype: "application/zip"
        }, { quoted: mek });

    } catch (error) {
        console.error("GitClone Error:", error);
        reply("An error occurred while downloading the repository.");
    }
});

cmd({
    pattern: "tempnum",
    alias: ["fakenum", "tempnumber"],
    desc: "Get temporary numbers & OTP instructions",
    category: "tool",
    react: "📱",
    use: "<country-code>"
},
async (conn, mek, { from, args, reply }) => {
    try {
        // Mandatory country code check
        if (!args || args.length < 1) {
            return reply(`❌ *Usage:* .tempnum <country-code>\nExample: .tempnum us\n\n📦 Use .otpbox <number>* to check OTPs`);
        }

        const countryCode = args[0].toLowerCase();
        
        // API call with validation
        const { data } = await axios.get(
            `https://api.vreden.my.id/api/tools/fakenumber/listnumber?id=${countryCode}`,
            { 
                timeout: 10000,
                validateStatus: status => status === 200
            }
        );

        // Fixed syntax error here - added missing parenthesis
        if (!data?.result || !Array.isArray(data.result)) {
            console.error("Invalid API structure:", data);
            return reply(`⚠ Invalid API response format\nTry .tempnum us`);
        }

        if (data.result.length === 0) {
            return reply(`📭 No numbers available for *${countryCode.toUpperCase()}*\nTry another country code!\n\nUse .otpbox <number> after selection`);
        }

        // Process numbers
        const numbers = data.result.slice(0, 25);
        const numberList = numbers.map((num, i) => 
            `${String(i+1).padStart(2, ' ')}. ${num.number}`
        ).join("\n");

        // Final message with OTP instructions
        await reply(
            `╭──「 📱 TEMPORARY NUMBERS 」\n` +
            `│\n` +
            `│ Country: ${countryCode.toUpperCase()}\n` +
            `│ Numbers Found: ${numbers.length}\n` +
            `│\n` +
            `${numberList}\n\n` +
            `╰──「 📦 USE: .otpbox <number> 」\n` +
            `_Example: .otpbox +1234567890_`
        );

    } catch (err) {
        console.error("API Error:", err);
        const errorMessage = err.code === "ECONNABORTED" ? 
            `⏳ *Timeout*: API took too long\nTry smaller country codes like 'us', 'gb'` :
            `⚠ *Error*: ${err.message}\nUse format: .tempnum <country-code>`;
            
        reply(`${errorMessage}\n\n🔑 Remember: ${prefix}otpinbox <number>`);
    }
});

cmd({
    pattern: "templist",
    alias: ["tempnumberlist", "tempnlist", "listnumbers"],
    desc: "Show list of countries with temp numbers",
    category: "tool",
    react: "🌍",
    filename: __filename,
    use: ".templist"
},
async (conn, mek, { reply }) => {
    try {
        const { data } = await axios.get("https://api.vreden.my.id/api/tools/fakenumber/country");

        if (!data || !data.result) return reply("❌ Couldn't fetch country list.");

        const countries = data.result.map((c, i) => `*${i + 1}.* ${c.title} \`(${c.id})\``).join("\n");

        await reply(`🌍 *Total Available Countries:* ${data.result.length}\n\n${countries}`);
    } catch (e) {
        console.error("TEMP LIST ERROR:", e);
        reply("❌ Failed to fetch temporary number country list.");
    }
});

cmd({
    pattern: "otpbox",
    alias: ["checkotp", "getotp"],
    desc: "Check OTP messages for temporary number",
    category: "tools",
    react: "🔑",
    use: "<full-number>"
},
async (conn, mek, { from, args, reply }) => {
    try {
        // Validate input
        if (!args[0] || !args[0].startsWith("+")) {
            return reply(`❌ *Usage:* .otpbox <full-number>\nExample: .otpbox +9231034481xx`);
        }

        const phoneNumber = args[0].trim();
        
        // Fetch OTP messages
        const { data } = await axios.get(
            `https://api.vreden.my.id/api/tools/fakenumber/message?nomor=${encodeURIComponent(phoneNumber)}`,
            { 
                timeout: 10000,
                validateStatus: status => status === 200
            }
        );

        // Validate response
        if (!data?.result || !Array.isArray(data.result)) {
            return reply("⚠ No OTP messages found for this number");
        }

        // Format OTP messages
        const otpMessages = data.result.map(msg => {
            // Extract OTP code (matches common OTP patterns)
            const otpMatch = msg.content.match(/\b\d{4,8}\b/g);
            const otpCode = otpMatch ? otpMatch[0] : "Not found";
            
            return `┌ *From:* ${msg.from || "Unknown"}
│ *Code:* ${otpCode}
│ *Time:* ${msg.time_wib || msg.timestamp}
└ *Message:* ${msg.content.substring(0, 50)}${msg.content.length > 50 ? "..." : ""}`;
        }).join("\n\n");

        await reply(
            `╭──「 🔑 OTP MESSAGES 」\n` +
            `│ Number: ${phoneNumber}\n` +
            `│ Messages Found: ${data.result.length}\n` +
            `│\n` +
            `${otpMessages}\n` +
            `╰──「 📌 Use .tempnum to get numbers 」`
        );

    } catch (err) {
        console.error("OTP Check Error:", err);
        const errorMsg = err.code === "ECONNABORTED" ?
            "⌛ OTP check timed out. Try again later" :
            `⚠ Error: ${err.response?.data?.error || err.message}`;
        
        reply(`${errorMsg}\n\nUsage: .otpbox +9231034481xx`);
    }
});

cmd({
    pattern: "tempmail",
    alias: ["genmail"],
    desc: "Generate a new temporary email address",
    category: "tool",
    react: "📧",
    filename: __filename
},
async (conn, mek, { from, reply, prefix }) => {
    try {
        const response = await axios.get('https://apis.davidcyriltech.my.id/temp-mail');
        const { email, session_id, expires_at } = response.data;

        // Format the expiration time and date
        const expiresDate = new Date(expires_at);
        const timeString = expiresDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const dateString = expiresDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // Create the complete message
        const message = `
📧 *TEMPORARY EMAIL GENERATED*

✉️ *Email Address:*
${email}

⏳ *Expires:*
${timeString} • ${dateString}

🔑 *Session ID:*
\`\`\`${session_id}\`\`\`

📥 *Check Inbox:*
.inbox ${session_id}

_Email will expire after 24 hours_
`;

        // ✅ Send message with conn.sendMessage
        await conn.sendMessage(
            from,
            { text: message },
            { quoted: mek }
        );

    } catch (e) {
        console.error('TempMail error:', e);
        await conn.sendMessage(
            from,
            { text: `❌ Error: ${e.message}` },
            { quoted: mek }
        );
    }
});

cmd({
    pattern: "checkmail",
    alias: ["inbox", "tmail", "mailinbox"],
    desc: "Check your temporary email inbox",
    category: "tool",
    react: "📬",
    filename: __filename
},
async (conn, mek, { from, reply, args }) => {
    try {
        const sessionId = args[0];
        if (!sessionId) return reply('🔑 Please provide your session ID\nExample: .checkmail YOUR_SESSION_ID');

        const inboxUrl = `https://apis.davidcyriltech.my.id/temp-mail/inbox?id=${encodeURIComponent(sessionId)}`;
        const response = await axios.get(inboxUrl);

        if (!response.data.success) {
            return reply('❌ Invalid session ID or expired email');
        }

        const { inbox_count, messages } = response.data;

        if (inbox_count === 0) {
            return reply('📭 Your inbox is empty');
        }

        let messageList = `📬 *You have ${inbox_count} message(s)*\n\n`;
        messages.forEach((msg, index) => {
            messageList += `━━━━━━━━━━━━━━━━━━\n` +
                          `📌 *Message ${index + 1}*\n` +
                          `👤 *From:* ${msg.from}\n` +
                          `📝 *Subject:* ${msg.subject}\n` +
                          `⏰ *Date:* ${new Date(msg.date).toLocaleString()}\n\n` +
                          `📄 *Content:*\n${msg.body}\n\n`;
        });

        await reply(messageList);

    } catch (e) {
        console.error('CheckMail error:', e);
        reply(`❌ Error checking inbox: ${e.response?.data?.message || e.message}`);
    }
});

cmd({
    pattern: "fetch",
    alias: ["get", "api"],
    desc: "Fetch data from a provided URL or API",
    category: "tool",
    react: "🌐",
    filename: __filename
},
async (conn, mek, { from, quoted, body, args, reply }) => {
    try {
        const q = args.join(' ').trim(); // Extract the URL or API query
        if (!q) return reply('❌ Please provide a valid URL or query.');

        if (!/^https?:\/\//.test(q)) return reply('❌ URL must start with http:// or https://.');

        const data = await fetchJson(q); // Use your fetchJson utility function to get data
        const content = JSON.stringify(data, null, 2);

        await conn.sendMessage(from, {
            text: `🔍 *Fetched Data*:\n\`\`\`${content.slice(0, 2048)}\`\`\``,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardingSourceMessage: 'Your Data Request',
            }
        }, { quoted: mek });
    } catch (e) {
        console.error("Error in fetch command:", e);
        reply(`❌ An error occurred:\n${e.message}`);
    }
});

cmd({
    pattern: "person",
    react: "👤",
    alias: ["userinfo", "profile"],
    desc: "Get complete user profile information",
    category: "tool",
    use: '.person [@tag or reply]',
    filename: __filename
},
async (conn, mek, m, { from, sender, isGroup, reply, quoted, participants }) => {
    try {
        // 1. DETERMINE TARGET USER
        let userJid = quoted?.sender || 
                     mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     sender;

        // 2. VERIFY USER EXISTS
        const [user] = await conn.onWhatsApp(userJid).catch(() => []);
        if (!user?.exists) return reply("❌ User not found on WhatsApp");

        // 3. GET PROFILE PICTURE
        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(userJid, 'image');
        } catch {
            ppUrl = 'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png';
        }

        // 4. GET NAME (MULTI-SOURCE FALLBACK)
        let userName = userJid.split('@')[0];
        try {
            // Try group participant info first
            if (isGroup) {
                const member = participants.find(p => p.id === userJid);
                if (member?.notify) userName = member.notify;
            }
            
            // Try contact DB
            if (userName === userJid.split('@')[0] && conn.contactDB) {
                const contact = await conn.contactDB.get(userJid).catch(() => null);
                if (contact?.name) userName = contact.name;
            }
            
            // Try presence as final fallback
            if (userName === userJid.split('@')[0]) {
                const presence = await conn.presenceSubscribe(userJid).catch(() => null);
                if (presence?.pushname) userName = presence.pushname;
            }
        } catch (e) {
            console.log("Name fetch error:", e);
        }

        // 5. GET BIO/ABOUT
        let bio = {};
        try {
            // Try personal status
            const statusData = await conn.fetchStatus(userJid).catch(() => null);
            if (statusData?.status) {
                bio = {
                    text: statusData.status,
                    type: "Personal",
                    updated: statusData.setAt ? new Date(statusData.setAt * 1000) : null
                };
            } else {
                // Try business profile
                const businessProfile = await conn.getBusinessProfile(userJid).catch(() => null);
                if (businessProfile?.description) {
                    bio = {
                        text: businessProfile.description,
                        type: "Business",
                        updated: null
                    };
                }
            }
        } catch (e) {
            console.log("Bio fetch error:", e);
        }

        // 6. GET GROUP ROLE
        let groupRole = "";
        if (isGroup) {
            const participant = participants.find(p => p.id === userJid);
            groupRole = participant?.admin ? "👑 Admin" : "👥 Member";
        }

        // 7. FORMAT OUTPUT
        const formattedBio = bio.text ? 
            `${bio.text}\n└─ 📌 ${bio.type} Bio${bio.updated ? ` | 🕒 ${bio.updated.toLocaleString()}` : ''}` : 
            "No bio available";

        const userInfo = `
*GC MEMBER INFORMATION 🧊*

📛 *Name:* ${userName}
🔢 *Number:* ${userJid.replace(/@.+/, '')}
📌 *Account Type:* ${user.isBusiness ? "💼 Business" : user.isEnterprise ? "🏢 Enterprise" : "👤 Personal"}

*📝 About:*
${formattedBio}

*⚙️ Account Info:*
✅ Registered: ${user.isUser ? "Yes" : "No"}
🛡️ Verified: ${user.verifiedName ? "✅ Verified" : "❌ Not verified"}
${isGroup ? `👥 *Group Role:* ${groupRole}` : ''}
`.trim();

        // 8. SEND RESULT
        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption: userInfo,
            mentions: [userJid]
        }, { quoted: mek });

    } catch (e) {
        console.error("Person command error:", e);
        reply(`❌ Error: ${e.message || "Failed to fetch profile"}`);
    }
});



cmd({
  pattern: "caption",
  alias: ["cap", "recaption", "c"],
  react: '✏️',
  desc: "Add or change caption of media/document",
  category: "tool",
  filename: __filename
}, async (conn, message, match, { from }) => {
  try {
    if (!message.quoted) {
      return await conn.sendMessage(from, {
        text: "*🍁 Please reply to a media message (image/video/document) to add caption!*\n\n*Usage:*\n- Reply to media with .caption [your text]\n- Or just .caption [text] to add caption to previous media"
      }, { quoted: message });
    }

    const quotedMsg = message.quoted;
    if (!quotedMsg || !quotedMsg.download) {
      return await conn.sendMessage(from, {
        text: "❌ The quoted message is not valid media"
      }, { quoted: message });
    }

    const buffer = await quotedMsg.download();
    const mtype = quotedMsg.mtype;
    
    // Get the caption text (everything after the command)
    const cmdText = message.body.split(' ')[0].toLowerCase();
    const newCaption = message.body.slice(cmdText.length).trim();

    if (!buffer) {
      return await conn.sendMessage(from, {
        text: "❌ Failed to download the media"
      }, { quoted: message });
    }

    // Create the base message content
    const messageContent = {
      caption: newCaption,
      mimetype: quotedMsg.mimetype
    };

    // Add the appropriate media property based on type
    switch (mtype) {
      case "imageMessage":
        messageContent.image = buffer;
        messageContent.mimetype = messageContent.mimetype || "image/jpeg";
        break;
      case "videoMessage":
        messageContent.video = buffer;
        messageContent.mimetype = messageContent.mimetype || "video/mp4";
        break;
      case "documentMessage":
        messageContent.document = buffer;
        messageContent.mimetype = messageContent.mimetype || "application/octet-stream";
        break;
      case "audioMessage":
        messageContent.audio = buffer;
        messageContent.mimetype = messageContent.mimetype || "audio/mp4";
        messageContent.ptt = quotedMsg.ptt || false;
        break;
      default:
        return await conn.sendMessage(from, {
          text: "❌ Only image, video, document and audio messages can be recaptioned"
        }, { quoted: message });
    }

    // Send the message with media and caption
    await conn.sendMessage(from, messageContent, { quoted: message });

  } catch (error) {
    console.error("Caption Error:", error);
    await conn.sendMessage(from, {
      text: "❌ Error adding caption:\n" + (error.message || error.toString())
    }, { quoted: message });
  }
});

cmd({
  pattern: "send",
  alias: ["sendme", 'save'],
  react: '📤',
  desc: "Forwards quoted message back to user",
  category: "tool",
  filename: __filename
}, async (client, message, match, { from }) => {
  try {
    if (!match.quoted) {
      return await client.sendMessage(from, {
        text: "*🍁 Please reply to a message!*"
      }, { quoted: message });
    }

    const buffer = await match.quoted.download();
    const mtype = match.quoted.mtype;
    const options = { quoted: message };

    let messageContent = {};
    switch (mtype) {
      case "imageMessage":
        messageContent = {
          image: buffer,
          caption: match.quoted.text || '',
          mimetype: match.quoted.mimetype || "image/jpeg"
        };
        break;
      case "videoMessage":
        messageContent = {
          video: buffer,
          caption: match.quoted.text || '',
          mimetype: match.quoted.mimetype || "video/mp4"
        };
        break;
      case "audioMessage":
        messageContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: match.quoted.ptt || false
        };
        break;
      default:
        return await client.sendMessage(from, {
          text: "❌ Only image, video, and audio messages are supported"
        }, { quoted: message });
    }

    await client.sendMessage(from, messageContent, options);
  } catch (error) {
    console.error("Forward Error:", error);
    await client.sendMessage(from, {
      text: "❌ Error forwarding message:\n" + error.message
    }, { quoted: message });
  }
});

cmd({
    pattern: "report",
    alias: ["ask", "bug", "request"],
    desc: "Report a bug or request a feature",
    category: "tool",
    filename: __filename
}, async (conn, mek, m, {
    from, body, command, args, senderNumber, reply
}) => {
    try {
        const botOwner = conn.user.id.split(":")[0]; // Extract the bot owner's number
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }
        
        if (!args.length) {
            return reply(`Example: ${config.PREFIX}report Play command is not working`);
        }

        const reportedMessages = {};
        const devNumber = "94721551183"; // Bot owner's number
        const messageId = m.key.id;

        if (reportedMessages[messageId]) {
            return reply("This report has already been forwarded to the owner. Please wait for a response.");
        }
        reportedMessages[messageId] = true;

        const reportText = `*| REQUEST/BUG |*\n\n*User*: @${m.sender.split("@")[0]}\n*Request/Bug*: ${args.join(" ")}`;
        const confirmationText = `Hi ${m.pushName}, your request has been forwarded to the owner. Please wait...`;

        await conn.sendMessage(`${devNumber}@s.whatsapp.net`, {
            text: reportText,
            mentions: [m.sender]
        }, { quoted: m });

        reply(confirmationText);
    } catch (error) {
        console.error(error);
        reply("An error occurred while processing your report.");
    }
});

//===============
cmd({
    pattern: 'savecontact',
    alias: ["vcf","scontact","savecontacts"],
    desc: 'gc vcard',
    category: 'tool',
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply("This command is for groups only.");
        if (!isOwner) return reply("*_This command is for the owner only_*");

        let card = quoted || m; // Handle if quoted message exists
        let cmiggc = groupMetadata;
        const { participants } = groupMetadata;
        
        let orgiggc = participants.map(a => a.id);
        let vcard = '';
        let noPort = 0;
        
        for (let a of cmiggc.participants) {
            vcard += `BEGIN:VCARD\nVERSION:3.0\nFN:[${noPort++}] +${a.id.split("@")[0]}\nTEL;type=CELL;type=VOICE;waid=${a.id.split("@")[0]}:+${a.id.split("@")[0]}\nEND:VCARD\n`;
        }

        let nmfilect = './contacts.vcf';
        reply('Saving ' + cmiggc.participants.length + ' participants contact');

        fs.writeFileSync(nmfilect, vcard.trim());
        await sleep(2000);

        await conn.sendMessage(from, {
            document: fs.readFileSync(nmfilect), 
            mimetype: 'text/vcard', 
            fileName: 'manisha-md.vcf', 
            caption: `\nDone saving.\nGroup Name: *${cmiggc.subject}*\nContacts: *${cmiggc.participants.length}*${CREATER}`}, { quoted: mek });

        fs.unlinkSync(nmfilect); // Cleanup the file after sending
    } catch (err) {
        reply(err.toString());
    }
});

//============= SEARCH COMMAND ========================
cmd({
    pattern: "yts",
    alias: ["ytsearch"],
    use: '.yts ',
    react: "🔎",
    desc: "Search and get details from youtube.",
    category: "search",
    filename: __filename

},

async(conn, mek, m,{from, l, quoted, body, isCmd, umarmd, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
if (!q) return reply('*Please give me words to search*')
try {
let yts = require("yt-search")
var arama = await yts(q);
} catch(e) {
    l(e)
return await conn.sendMessage(from , { text: '*Error !!*' }, { quoted: mek } )
}
var mesaj = '';
arama.all.map((video) => {
mesaj += ' *🖲️' + video.title + '*\n🔗 ' + video.url + '\n\n'
});
await conn.sendMessage(from , { text:  mesaj }, { quoted: mek } )
} catch (e) {
    l(e)
  reply('*Error !!*')
}
});

//===================

cmd({
    pattern: "mvs",
    desc: "Fetch detailed information about a movie.",
    category: "search",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const movieName = args.join(' ');
        if (!movieName) {
            return reply("📽️ ρℓєαѕє ρяσνι∂є тнє ηαмє σƒ тнє мσνιє.");
        }

        const apiUrl = `http://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&apikey=76cb7f39`;
        const response = await axios.get(apiUrl);

        const data = response.data;
        if (data.Response === "False") {
            return reply("🚫 Movie not found.");
        }

        const movieInfo = `╔══╣❍ᴍᴏᴠɪᴇ ɪɴꜰᴏ❍╠═══⫸
╠➢🎥 *ᴛɪᴛʟᴇ:* ${data.Title}
╠➢📅 *ʏᴇᴀʀ:* ${data.Year}
╠➢🌟 *ʀᴀᴛᴇᴅ:* ${data.Rated}
╠➢📆 *ʀᴇʟᴇᴀꜱᴇᴅ:* ${data.Released}
╠➢⏳ *ʀᴜɴᴛɪᴍᴇ:* ${data.Runtime}
╠➢🎭 *ɢᴇɴʀᴇ:* ${data.Genre}
╠➢🎬 *ᴅɪʀᴇᴄᴛᴏʀ:* ${data.Director}
╠➢✍️ *ᴡʀɪᴛᴇʀ:* ${data.Writer}
╠➢🎭 *ᴀᴄᴛᴏʀꜱ:* ${data.Actors}
╠➢📝 *ᴘʟᴏᴛ:* ${data.Plot}
╠➢🌍 *ʟᴀɴɢᴜᴀɢᴇ:* ${data.Language}
╠➢🇺🇸 *ᴄᴏᴜɴᴛʀʏ:* ${data.Country}
╠➢🏆 *ᴀᴡᴀʀᴅꜱ:* ${data.Awards}
╠➢⭐ *ɪᴍᴅʙ ʀᴀᴛɪɴɢ:* ${data.imdbRating}
╠➢🗳️ *ɪᴍᴅʙ ᴠᴏᴛᴇꜱ:* ${data.imdbVotes}
╚═══════════════════⫸
`;

        // Define the image URL
        const imageUrl = data.Poster && data.Poster !== 'N/A' ? data.Poster : 'https://i.ibb.co/6RzcnLWR/jpg.jpg';

        // Send the movie information along with the poster image
        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: `${movieInfo}\n${BOT}`
        }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply(`❌ єяяσя: ${e.message}`);
    }
});

//==================
cmd({
  pattern: "npm",
  desc: "Search for a package on npm.",
  react: '📦',
  category: "search",
  filename: __filename,
  use: ".npm <package-name>"
}, async (conn, mek, msg, { from, args, reply }) => {
  try {
    // Check if a package name is provided
    if (!args.length) {
      return reply("Please provide the name of the npm package you want to search for. Example: .npm express");
    }

    const packageName = args.join(" ");
    const apiUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

    // Fetch package details from npm registry
    const response = await axios.get(apiUrl);
    if (response.status !== 200) {
      throw new Error("Package not found or an error occurred.");
    }

    const packageData = response.data;
    const latestVersion = packageData["dist-tags"].latest;
    const description = packageData.description || "No description available.";
    const npmUrl = `https://www.npmjs.com/package/${packageName}`;
    const license = packageData.license || "Unknown";
    const repository = packageData.repository ? packageData.repository.url : "Not available";

    // Create the response message
    const message = `╔══╣❍ɴᴘᴍ ꜱᴇᴀʀᴄʜ❍╠═══⫸
╠➢*🔰 ɴᴘᴍ ᴘᴀᴄᴋᴀɢᴇ:* ${packageName}
╠➢*📄 ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ:* ${description}
╠➢*⏸️ ʟᴀꜱᴛ ᴠᴇʀꜱɪᴏɴ:* ${latestVersion}
╠➢*🪪 ʟɪᴄᴇɴꜱᴇ:* ${license}
╠➢*🪩 ʀᴇᴘᴏꜱɪᴛᴏʀʏ:* ${repository}
╠➢*🔗 ɴᴘᴍ ᴜʀʟ:* ${npmUrl}
╚═══════════════════⫸

${CREATER}`;

    // Send the message
    await conn.sendMessage(from, { text: message }, { quoted: mek });

  } catch (error) {
    console.error("Error:", error);

    // Send detailed error logs to WhatsApp
    const errorMessage = `
*❌ NPM Command Error Logs*

*Error Message:* ${error.message}
*Stack Trace:* ${error.stack || "Not available"}
*Timestamp:* ${new Date().toISOString()}
`;

    await conn.sendMessage(from, { text: errorMessage }, { quoted: mek });
    reply("An error occurred while fetching the npm package details.");
  }
});

//===================

cmd({
    pattern: "define",
    desc: "📖 Get the definition of a word",
    react: "🔍",
    category: "search",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Please provide a word to define.\n\n📌 *Usage:* .define [word]");

        const word = q.trim();
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

        const response = await axios.get(url);
        const definitionData = response.data[0];

        const definition = definitionData.meanings[0].definitions[0].definition;
        const example = definitionData.meanings[0].definitions[0].example || '❌ No example available';
        const synonyms = definitionData.meanings[0].definitions[0].synonyms.join(', ') || '❌ No synonyms available';
        const phonetics = definitionData.phonetics[0]?.text || '🔇 No phonetics available';
        const audio = definitionData.phonetics[0]?.audio || null;

        const wordInfo = `
📖 *Word*: *${definitionData.word}*  
🗣️ *Pronunciation*: _${phonetics}_  
📚 *Definition*: ${definition}  
✍️ *Example*: ${example}  
📝 *Synonyms*: ${synonyms}  

${CREATER}`;

        if (audio) {
            await conn.sendMessage(from, { audio: { url: audio }, mimetype: 'audio/mpeg' }, { quoted: mek });
        }

        return reply(wordInfo);
    } catch (e) {
        console.error("❌ Error:", e);
        if (e.response && e.response.status === 404) {
            return reply("🚫 *Word not found.* Please check the spelling and try again.");
        }
        return reply("⚠️ An error occurred while fetching the definition. Please try again later.");
    }
});

//===============FUN COMMAND============

//============ animegirl ==================
cmd({
    pattern: "animegirl",
    desc: "Fetch a random anime girl image.",
    category: "fun",
    react: "👩‍🦰",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const apiUrl = `https://api.waifu.pics/sfw/waifu`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        await conn.sendMessage(from, { image: { url: data.url }, caption: `*${BOT} RANDOM ANIME GIRL IMAGES* ♥️\n${CREATER}` }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply(`*Error Fetching Anime girl image*: ${e.message}`);
    }
});


cmd({
    pattern: "dog",
    desc: "Fetch a random dog image.",
    category: "fun",
    react: "🐶",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const apiUrl = `https://dog.ceo/api/breeds/image/random`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        await conn.sendMessage(from, { image: { url: data.message }, caption: `*${BOT} DOWNLOAD DOG IMAGE\n${CREATER}` }, { quoted: mek });
    } catch (e) {
        console.log(e);
        reply(`Error Fetching Dog Image: ${e.message}`);
    }
});

cmd({
  pattern: "joke",
  desc: "😂 Get a random joke",
  react: "🤣",
  category: "fun",
  filename: __filename
}, async (conn, m, store, { reply }) => {
  try {
    const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
    const joke = response.data;

    if (!joke || !joke.setup || !joke.punchline) {
      return reply("❌ Failed to fetch a joke. Please try again.");
    }

    const jokeMessage = `🤣 *Here's a random joke for you!* 🤣\n\n*${joke.setup}*\n\n${joke.punchline} 😆\n${CREATER}`;

    return reply(jokeMessage);
  } catch (error) {
    console.error("❌ Error in joke command:", error);
    return reply("⚠️ An error occurred while fetching the joke. Please try again.");
  }
});

cmd({
  pattern: "fact",
  desc: "🧠 Get a random fun fact",
  react: "🧠",
  category: "fun",
  filename: __filename
}, async (conn, m, store, { reply }) => {
  try {
    const response = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
    const fact = response.data.text;

    if (!fact) {
      return reply("❌ Failed to fetch a fun fact. Please try again.");
    }

    const factMessage = `🧠 *Random Fun Fact* 🧠\n\n${fact}\n\nIsn't that interesting? 😄\n${CREATER}`;

    return reply(factMessage);
  } catch (error) {
    console.error("❌ Error in fact command:", error);
    return reply("⚠️ An error occurred while fetching a fun fact. Please try again later.");
  }
});

cmd({
    pattern: "hack",
    desc: "Displays a dynamic and playful 'Hacking' message for fun.",
    category: "fun",
    react: "👨‍💻",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const steps = [
            '💻 *MANISHA-MD HACK STARTING...* 💻',
            '',
            '*Initializing hacking tools...* 🛠️',
            '*Connecting to remote servers...* 🌐',
            '',
            '```[██████████] 10%``` ⏳'                                            ,
            '```[████████████████████] 20%``` ⏳'                                   ,
            '```[██████████████████████████████] 30%``` ⏳'                               ,
            '```[████████████████████████████████████████] 40%``` ⏳'                            ,
            '```[██████████████████████████████████████████████████] 50%``` ⏳'                       ,
            '```[████████████████████████████████████████████████████████████] 60%``` ⏳'                 ,
            '```[██████████████████████████████████████████████████████████████████████] 70%``` ⏳'            ,
            '```[████████████████████████████████████████████████████████████████████████████████] 80%``` ⏳'        ,
            '```[██████████████████████████████████████████████████████████████████████████████████████████] 90%``` ⏳'    ,
            '```[████████████████████████████████████████████████████████████████████████████████████████████████████] 100%``` ✅',
            '',
            '🔒 *System Breach: Successful!* 🔓',
            '🚀 *Command Execution: Complete!* 🎯',
            '',
            '*📡 Transmitting data...* 📤',
            '*🕵️‍♂️ Ensuring stealth...* 🤫',
            '*🔧 Finalizing operations...* 🏁',
            '*🔧 Awais Get Your All Data...* 🎁',
            '',
            '⚠️ *Note:* All actions are for demonstration purposes only.',
            '⚠️ *Reminder:* Ethical hacking is the only way to ensure security.',
            '⚠️ *Reminder:* Strong hacking is the only way to ensure security.',
            '',
            ' * YOUR DATA HACK SUCCESSFULLY*'
        ];

        for (const line of steps) {
            await conn.sendMessage(from, { text: line }, { quoted: mek });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust the delay as needed
        }
    } catch (e) {
        console.log(e);
        reply(`❌ *Error!* ${e.message}`);
    }
});

cmd(
  {
    pattern: "boom",
    alias: ["textmsg"],
    desc: "Repeat a message multiple times",
    category: "fun",
    filename: __filename,
  },
  async (conn, mek, m, { from, args, reply }) => {
    try {
      if (args.length < 2) {
        return reply("❎ Usage: .boom <count> <message>");
      }

      const count = parseInt(args[0]);

      if (isNaN(count) || count < 1 || count > 50) {
        return reply("❎ Please provide a valid number between 1 and 50.");
      }

      const message = args.slice(1).join(" ");

      for (let i = 0; i < count; i++) {
        await conn.sendMessage(from, { text: message }, { quoted: mek });
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay to prevent ban
      }
    } catch (e) {
      console.error(e);
      reply("❌ Error occurred: " + (e.message || e));
    }
  }
);
//==================CONVERT COMMAND====================

//================ Sticker =====================

cmd(
    {
        pattern: 'take',
        alias: ['rename', 'stake'],
        desc: 'Create a sticker with a custom pack name.',
        category: 'convert',
        use: '<reply media or URL>',
        filename: __filename,
    },
    async (conn, mek, m, { quoted, args, q, reply, from }) => {
        if (!mek.quoted) return reply(`*Reply to any sticker.*`);
        if (!q) return reply(`*Please provide a pack name using .take <packname>*`);

        let mime = mek.quoted.mtype;
        let pack = q;

        if (mime === "imageMessage" || mime === "stickerMessage") {
            let media = await mek.quoted.download();
            let sticker = new Sticker(media, {
                pack: pack, 
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: "12345",
                quality: 75,
                background: 'transparent',
            });
            const buffer = await sticker.toBuffer();
            return conn.sendMessage(mek.chat, { sticker: buffer }, { quoted: mek });
        } else {
            return reply("*Uhh, Please reply to an image.*");
        }
    }
);

//========== Sticker create ===========

cmd(
    {
        pattern: 'sticker',
        alias: ['s', 'stickergif'],
        desc: 'Create a sticker from an image, video, or URL.',
        category: 'convert',
        use: '<reply media or URL>',
        filename: __filename,
    },
    async (conn, mek, m, { quoted, args, q, reply, from }) => {
        if (!mek.quoted) return reply(`*Reply to any Image or Video, Sir.*`);
        let mime = mek.quoted.mtype;
        let pack = "my pack";
        
        if (mime === "imageMessage" || mime === "stickerMessage") {
            let media = await mek.quoted.download();
            let sticker = new Sticker(media, {
                pack: pack, 
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"], 
                id: "12345",
                quality: 75, 
                background: 'transparent',
            });
            const buffer = await sticker.toBuffer();
            return conn.sendMessage(mek.chat, { sticker: buffer }, { quoted: mek });
        } else {
            return reply("*Uhh, Please reply to an image.*");
        }
    }
);

//=================
cmd(
  {
    pattern: 'vsticker',
    alias: ['gsticker', 'g2s', 'gs', 'v2s', 'vs',],
    desc: 'Convert GIF/Video to a sticker.',
    category: 'convert',
    use: '<reply media or URL>',
    filename: __filename,
  },
  async (conn, mek, m, { quoted, args, reply }) => {
    try {
      if (!mek.quoted) return reply('*Reply to a video or GIF to convert it to a sticker!*');

      const mime = mek.quoted.mtype;
      if (!['videoMessage', 'imageMessage'].includes(mime)) {
        return reply('*Please reply to a valid video or GIF.*');
      }

      // Download the media file
      const media = await mek.quoted.download();

      // Convert the video to a WebP buffer
      const webpBuffer = await videoToWebp(media);

      // Generate sticker metadata
      const sticker = new Sticker(webpBuffer, {
        pack: 'My Pack',
        author: '', // Leave blank or customize
        type: StickerTypes.FULL, // FULL for regular stickers
        categories: ['🤩', '🎉'], // Emoji categories
        id: '12345', // Optional ID
        quality: 75, // Set quality for optimization
        background: 'transparent', // Transparent background
      });

      // Convert sticker to buffer and send
      const stickerBuffer = await sticker.toBuffer();
      return conn.sendMessage(mek.chat, { sticker: stickerBuffer }, { quoted: mek });
    } catch (error) {
      console.error(error);
      reply(`❌ An error occurred: ${error.message}`);
    }
  }
);    

//============

cmd({
    pattern: "attp",
    desc: "Convert text to a GIF sticker.",
    react: "✨",
    category: "convert",
    use: ".attp HI",
    filename: __filename,
}, async (conn, mek, m, { args, reply }) => {
    try {
        if (!args[0]) return reply("*Please provide text!*");

        const gifBuffer = await fetchGif(`https://api-fix.onrender.com/api/maker/attp?text=${encodeURIComponent(args[0])}`);
        const stickerBuffer = await gifToSticker(gifBuffer);

        await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: mek });
    } catch (error) {
        reply(`❌ ${error.message}`);
    }
});


//=====================

cmd({
  pattern: "url",
  alias: ["url"],
  react: '🖇',
  desc: "Convert media to Catbox URL",
  category: "convert",
  use: ".url [reply to media]",
  filename: __filename
}, async (client, message, args, { reply }) => {
  try {
    // Check if quoted message exists and has media
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';
    
    if (!mimeType) {
      throw "PLEASE RIPLY IMG, VIDEO, AUDIO";
    }

    // Download the media
    const mediaBuffer = await quotedMsg.download();
    const tempFilePath = path.join(os.tmpdir(), `catbox_upload_${Date.now()}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Get file extension based on mime type
    let extension = '';
    if (mimeType.includes('image/jpeg')) extension = '.jpg';
    else if (mimeType.includes('image/png')) extension = '.png';
    else if (mimeType.includes('video')) extension = '.mp4';
    else if (mimeType.includes('audio')) extension = '.mp3';
    
    const fileName = `file${extension}`;

    // Prepare form data for Catbox
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tempFilePath), fileName);
    form.append('reqtype', 'fileupload');

    // Upload to Catbox
    const response = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders()
    });

    if (!response.data) {
      throw "ERROR";
    }

    const mediaUrl = response.data;
    fs.unlinkSync(tempFilePath);

    // Determine media type for response
    let mediaType = 'File';
    if (mimeType.includes('image')) mediaType = 'Image';
    else if (mimeType.includes('video')) mediaType = 'Video';
    else if (mimeType.includes('audio')) mediaType = 'Audio';

    // Send response
    await reply(
      `*${mediaType} ${BOT} URL🔰*\n\n` +
      `URL🖇️ ${mediaUrl}\n` +
      `${CREATER}`
    );

  } catch (error) {
    console.error(error);
    await reply(`Error: ${error.message || error}`);
  }
});

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

//=====================

cmd({
    pattern: "topdf",
    alias: ["pdf","topdf"],use: '.topdf',
    desc: "Convert provided text to a PDF file.",
    react: "📄",
    category: "convert",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply("Please provide the text you want to convert to PDF. *Eg* `.topdf` *Sri Lanka Colombo 🌿*");

        // Create a new PDF document
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);

            // Send the PDF file
            await conn.sendMessage(from, {
                document: pdfData,
                mimetype: 'application/pdf',
                fileName: 'manishacoder.pdf',
                caption: `
*📄 PDF created successully!*

${CREATER}`
            }, { quoted: mek });
        });

        // Add text to the PDF
        doc.text(q);

        // Finalize the PDF and end the stream
        doc.end();

    } catch (e) {
        console.error(e);
        reply(`Error: ${e.message}`);
    }
});

//==============
cmd({
    pattern: "tiny",
    alias: ['short', 'shorturl'],
    react: "🫧",
    desc: "Makes URL tiny.",
    category: "convert",
    use: "<url>",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, isOwner, isAdmins, reply, args }) => {
    console.log("Command tiny triggered"); // Ajoutez ceci pour vérifier si la commande est déclenchée

    if (!args[0]) {
        console.log("No URL provided"); // Ajoutez ceci pour vérifier si l'URL est fournie
        return reply("*🏷️ ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴍᴇ ᴀ ʟɪɴᴋ.*");
    }

    try {
        const link = args[0];
        console.log("URL to shorten:", link); // Ajoutez ceci pour vérifier l'URL fournie
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${link}`);
        const shortenedUrl = response.data;

        console.log("Shortened URL:", shortenedUrl); // Ajoutez ceci pour vérifier l'URL raccourcie
        return reply(`*🛡️YOUR SHORTENED URL*\n\n${shortenedUrl}`);
    } catch (e) {
        console.error("Error shortening URL:", e);
        return reply("An error occurred while shortening the URL. Please try again.");
    }
});

//============== GROUP COMMAND ================

// delete 

cmd({
pattern: "delete",
react: "❌",
alias: ["del"],
desc: "delete message",
category: "group",
use: '.del',
filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants,  isItzcp, groupAdmins, isBotAdmins, isAdmins, reply}) => {
if (!isOwner ||  !isAdmins) return;
try{
if (!m.quoted) return reply(mg.notextfordel);
const key = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.quoted.id,
            participant: m.quoted.sender
        }
        await conn.sendMessage(m.chat, { delete: key })
} catch(e) {
console.log(e);
reply('successful..👨‍💻✅')
} 
})

// Command to list all pending group join requests
cmd({
    pattern: "requestlist",
    desc: "Shows pending group join requests",
    category: "group",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        await conn.sendMessage(from, {
            react: { text: '⏳', key: m.key }
        });

        if (!isGroup) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ This command can only be used in groups.");
        }
        if (!isAdmins) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ Only group admins can use this command.");
        }
        if (!isBotAdmins) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ I need to be an admin to view join requests.");
        }

        const requests = await conn.groupRequestParticipantsList(from);
        
        if (requests.length === 0) {
            await conn.sendMessage(from, {
                react: { text: 'ℹ️', key: m.key }
            });
            return reply("ℹ️ No pending join requests.");
        }

        let text = `📋 *Pending Join Requests (${requests.length})*\n\n`;
        requests.forEach((user, i) => {
            text += `${i+1}. @${user.jid.split('@')[0]}\n`;
        });

        await conn.sendMessage(from, {
            react: { text: '✅', key: m.key }
        });
        return reply(text, { mentions: requests.map(u => u.jid) });
    } catch (error) {
        console.error("Request list error:", error);
        await conn.sendMessage(from, {
            react: { text: '❌', key: m.key }
        });
        return reply("❌ Failed to fetch join requests.");
    }
});

// Command to accept all pending join requests
cmd({
    pattern: "acceptall",
    desc: "Accepts all pending group join requests",
    category: "group",
    react: "✅",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        await conn.sendMessage(from, {
            react: { text: '⏳', key: m.key }
        });

        if (!isGroup) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ This command can only be used in groups.");
        }
        if (!isAdmins) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ Only group admins can use this command.");
        }
        if (!isBotAdmins) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ I need to be an admin to accept join requests.");
        }

        const requests = await conn.groupRequestParticipantsList(from);
        
        if (requests.length === 0) {
            await conn.sendMessage(from, {
                react: { text: 'ℹ️', key: m.key }
            });
            return reply("ℹ️ No pending join requests to accept.");
        }

        const jids = requests.map(u => u.jid);
        await conn.groupRequestParticipantsUpdate(from, jids, "approve");
        
        await conn.sendMessage(from, {
            react: { text: '👍', key: m.key }
        });
        return reply(`✅ Successfully accepted ${requests.length} join requests.`);
    } catch (error) {
        console.error("Accept all error:", error);
        await conn.sendMessage(from, {
            react: { text: '❌', key: m.key }
        });
        return reply("❌ Failed to accept join requests.");
    }
});

// Command to reject all pending join requests
cmd({
    pattern: "rejectall",
    desc: "Rejects all pending group join requests",
    category: "group",
    react: "❌",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        await conn.sendMessage(from, {
            react: { text: '⏳', key: m.key }
        });

        if (!isGroup) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ This command can only be used in groups.");
        }
        if (!isAdmins) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ Only group admins can use this command.");
        }
        if (!isBotAdmins) {
            await conn.sendMessage(from, {
                react: { text: '❌', key: m.key }
            });
            return reply("❌ I need to be an admin to reject join requests.");
        }

        const requests = await conn.groupRequestParticipantsList(from);
        
        if (requests.length === 0) {
            await conn.sendMessage(from, {
                react: { text: 'ℹ️', key: m.key }
            });
            return reply("ℹ️ No pending join requests to reject.");
        }

        const jids = requests.map(u => u.jid);
        await conn.groupRequestParticipantsUpdate(from, jids, "reject");
        
        await conn.sendMessage(from, {
            react: { text: '👎', key: m.key }
        });
        return reply(`✅ Successfully rejected ${requests.length} join requests.`);
    } catch (error) {
        console.error("Reject all error:", error);
        await conn.sendMessage(from, {
            react: { text: '❌', key: m.key }
        });
        return reply("❌ Failed to reject join requests.");
    }
});

cmd({
    pattern: "join",
    react: "📬",
    alias: ["joinme", "f_join"],
    desc: "To Join a Group from Invite link",
    category: "group",
    use: '.join < Group Link >',
    filename: __filename
}, async (conn, mek, m, { from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isCreator, isDev, isAdmins, reply }) => {
    try {
        const msr = {
            own_cmd: "You don't have permission to use this command."
        };

        // Only allow the creator to use the command
        if (!isOwner) return reply(msr.own_cmd);

        // If there's no input, check if the message is a reply with a link
        if (!q && !quoted) return reply("*Please write the Group Link*️ 🖇️");

        let groupLink;

        // If the message is a reply to a group invite link
        if (quoted && quoted.type === 'conversation' && isUrl(quoted.text)) {
            groupLink = quoted.text.split('https://chat.whatsapp.com/')[1];
        } else if (q && isUrl(q)) {
            // If the user provided the link in the command
            groupLink = q.split('https://chat.whatsapp.com/')[1];
        }

        if (!groupLink) return reply("❌ *Invalid Group Link* 🖇️");

        // Accept the group invite
        await conn.groupAcceptInvite(groupLink);
        await conn.sendMessage(from, { text: `✔️ *Successfully Joined*` }, { quoted: mek });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        console.log(e);
        reply(`❌ *Error Occurred!!*\n\n${e}`);
    }
});

cmd({
    pattern: "lockgc",
    alias: ["lock"],
    react: "🔒",
    desc: "Lock the group (Prevents new members from joining).",
    category: "group",
    filename: __filename
},           
async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to lock the group.");

        await conn.groupSettingUpdate(from, "locked");
        reply("✅ Group has been locked. New members cannot join.");
    } catch (e) {
        console.error("Error locking group:", e);
        reply("❌ Failed to lock the group. Please try again.");
    }
});

cmd({
    pattern: "unlockgc",
    alias: ["unlock"],
    react: "🔓",
    desc: "Unlock the group (Allows new members to join).",
    category: "group",
    filename: __filename
},           
async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to unlock the group.");

        await conn.groupSettingUpdate(from, "unlocked");
        reply("✅ Group has been unlocked. New members can now join.");
    } catch (e) {
        console.error("Error unlocking group:", e);
        reply("❌ Failed to unlock the group. Please try again.");
    }
});

    
cmd({
    pattern: "mute",
    alias: ["groupmute"],
    react: "🔇",
    desc: "Mute the group (Only admins can send messages).",
    category: "group",
    filename: __filename
},           
async (conn, mek, m, { from, isGroup, senderNumber, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to mute the group.");

        await conn.groupSettingUpdate(from, "announcement");
        reply("✅ Group has been muted. Only admins can send messages.");
    } catch (e) {
        console.error("Error muting group:", e);
        reply("❌ Failed to mute the group. Please try again.");
    }
});

cmd({
    pattern: "unmute",
    alias: ["groupunmute"],
    react: "🔊",
    desc: "Unmute the group (Everyone can send messages).",
    category: "group",
    filename: __filename
},           
async (conn, mek, m, { from, isGroup, senderNumber, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to unmute the group.");

        await conn.groupSettingUpdate(from, "not_announcement");
        reply("✅ Group has been unmuted. Everyone can send messages.");
    } catch (e) {
        console.error("Error unmuting group:", e);
        reply("❌ Failed to unmute the group. Please try again.");
    }
});

cmd({
    pattern: "revoke",
    react: "🖇️",
    alias: ["revokegrouplink", "resetglink", "revokelink", "f_revoke"],
    desc: "To Reset the group link",
    category: "group",
    use: '.revoke',
    filename: __filename
},
async (conn, mek, m, {
    from, isCmd, isGroup, sender, isBotAdmins,
    isAdmins, reply
}) => {
    try {
        if (!isGroup) return reply(`❌ This command only works in groups.`);
        if (!isAdmins) return reply(`⛔ You must be a *Group Admin* to use this command.`);
        if (!isBotAdmins) return reply(`❌ I need to be *admin* to reset the group link.`);

        await conn.groupRevokeInvite(from);
        await conn.sendMessage(from, {
            text: `✅ *Group Link has been reset successfully!*`
        }, { quoted: mek });

    } catch (err) {
        console.error(err);
        reply(`❌ Error resetting group link.`);
    }
});


cmd({
    pattern: "updategdesc",
    alias: ["upgdesc", "gdesc"],
    react: "📜",
    desc: "Change the group description.",
    category: "group",
    filename: __filename
},           
async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, args, q, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to update the group description.");
        if (!q) return reply("❌ Please provide a new group description.");

        await conn.groupUpdateDescription(from, q);
        reply("✅ Group description has been updated.");
    } catch (e) {
        console.error("Error updating group description:", e);
        reply("❌ Failed to update the group description. Please try again.");
    }
});

cmd({
  pattern: "hidetag",
  alias: ["tag", "h"],  
  react: "🔊",
  desc: "To Tag all Members for Any Message/Media",
  category: "group",
  use: '.hidetag Hello',
  filename: __filename
},
async (conn, mek, m, {
  from, q, isGroup, isCreator, isAdmins,
  participants, reply
}) => {
  try {
    const isUrl = (url) => {
      return /https?:\/\/(www\.)?[\w\-@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([\w\-@:%_\+.~#?&//=]*)/.test(url);
    };

    if (!isGroup) return reply("❌ This command can only be used in groups.");
    if (!isAdmins && !isCreator) return reply("❌ Only group admins can use this command.");

    const mentionAll = { mentions: participants.map(u => u.id) };

    // If no message or reply is provided
    if (!q && !m.quoted) {
      return reply("❌ Please provide a message or reply to a message to tag all members.");
    }

    // If a reply to a message
    if (m.quoted) {
      const type = m.quoted.mtype || '';
      
      // If it's a text message (extendedTextMessage)
      if (type === 'extendedTextMessage') {
        return await conn.sendMessage(from, {
          text: m.quoted.text || 'No message content found.',
          ...mentionAll
        }, { quoted: mek });
      }

      // Handle media messages
      if (['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(type)) {
        try {
          const buffer = await m.quoted.download?.();
          if (!buffer) return reply("❌ Failed to download the quoted media.");

          let content;
          switch (type) {
            case "imageMessage":
              content = { image: buffer, caption: m.quoted.text || "📷 Image", ...mentionAll };
              break;
            case "videoMessage":
              content = { 
                video: buffer, 
                caption: m.quoted.text || "🎥 Video", 
                gifPlayback: m.quoted.message?.videoMessage?.gifPlayback || false, 
                ...mentionAll 
              };
              break;
            case "audioMessage":
              content = { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: m.quoted.message?.audioMessage?.ptt || false, 
                ...mentionAll 
              };
              break;
            case "stickerMessage":
              content = { sticker: buffer, ...mentionAll };
              break;
            case "documentMessage":
              content = {
                document: buffer,
                mimetype: m.quoted.message?.documentMessage?.mimetype || "application/octet-stream",
                fileName: m.quoted.message?.documentMessage?.fileName || "file",
                caption: m.quoted.text || "",
                ...mentionAll
              };
              break;
          }

          if (content) {
            return await conn.sendMessage(from, content, { quoted: mek });
          }
        } catch (e) {
          console.error("Media download/send error:", e);
          return reply("❌ Failed to process the media. Sending as text instead.");
        }
      }

      // Fallback for any other message type
      return await conn.sendMessage(from, {
        text: m.quoted.text || "📨 Message",
        ...mentionAll
      }, { quoted: mek });
    }

    // If no quoted message, but a direct message is sent
    if (q) {
      // If the direct message is a URL, send it as a message
      if (isUrl(q)) {
        return await conn.sendMessage(from, {
          text: q,
          ...mentionAll
        }, { quoted: mek });
      }

      // Otherwise, just send the text without the command name
      await conn.sendMessage(from, {
        text: q, // Sends the message without the command name
        ...mentionAll
      }, { quoted: mek });
    }

  } catch (e) {
    console.error(e);
    reply(`❌ *Error Occurred !!*\n\n${e.message}`);
  }
});

//=============

cmd({
    pattern: "updategname",
    alias: ["upgname", "gname"],
    react: "📝",
    desc: "Change the group name.",
    category: "group",
    filename: __filename
},           
async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, args, q, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to update the group name.");
        if (!q) return reply("❌ Please provide a new group name.");

        await conn.groupUpdateSubject(from, q);
        reply(`✅ Group name has been updated to: *${q}*`);
    } catch (e) {
        console.error("Error updating group name:", e);
        reply("❌ Failed to update the group name. Please try again.");
    }
});

//==========

cmd({
    pattern: "ginfo",
    react: "🥏",
    alias: ["groupinfo"],
    desc: "Get group information.",
    category: "group",
    use: '.ginfo',
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, isCmd, isGroup, sender, isBotAdmins,
    isAdmins, isDev, reply, groupMetadata, participants
}) => {
    try {
        // Requirements
        if (!isGroup) return reply(`❌ This command only works in group chats.`);
        if (!isAdmins && !isDev) return reply(`⛔ Only *Group Admins* or *Bot Dev* can use this.`);
        if (!isBotAdmins) return reply(`❌ I need *admin* rights to fetch group details.`);

        const fallbackPpUrls = [
            'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
            'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
        ];
        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(from, 'image');
        } catch {
            ppUrl = fallbackPpUrls[Math.floor(Math.random() * fallbackPpUrls.length)];
        }

        const metadata = await conn.groupMetadata(from);
        const groupAdmins = participants.filter(p => p.admin);
        const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
        const owner = metadata.owner || groupAdmins[0]?.id || "unknown";

        const gdata = `*「 Group Information 」*\n
*Group Name* : ${metadata.subject}
*Group ID* : ${metadata.id}
*Participants* : ${metadata.size}
*Group Creator* : @${owner.split('@')[0]}
*Description* : ${metadata.desc?.toString() || 'No description'}\n
*Admins (${groupAdmins.length})*:\n${listAdmin}`

        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption: gdata,
            mentions: groupAdmins.map(v => v.id).concat([owner])
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ An error occurred:\n\n${e}`);
    }
});

//======================
// remove only member

cmd({
    pattern: "removemembers",
    alias: ["kickall", "endgc", "endgroup"],
    desc: "Remove all non-admin members from the group.",
    react: "🎉",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, {
    from, groupMetadata, groupAdmins, isBotAdmins, senderNumber, reply, isGroup
}) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) {
            return reply("This command can only be used in groups.");
        }

        // Get the bot owner's number dynamically
        const botOwner = conn.user.id.split(":")[0];
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }

        if (!isBotAdmins) {
            return reply("I need to be an admin to execute this command.");
        }

        const allParticipants = groupMetadata.participants;
        const nonAdminParticipants = allParticipants.filter(member => !groupAdmins.includes(member.id));

        if (nonAdminParticipants.length === 0) {
            return reply("There are no non-admin members to remove.");
        }

        reply(`Starting to remove ${nonAdminParticipants.length} non-admin members...`);

        for (let participant of nonAdminParticipants) {
            try {
                await conn.groupParticipantsUpdate(from, [participant.id], "remove");
                await sleep(2000); // 2-second delay between removals
            } catch (e) {
                console.error(`Failed to remove ${participant.id}:`, e);
            }
        }

        reply("Successfully removed all non-admin members from the group.");
    } catch (e) {
        console.error("Error removing non-admin users:", e);
        reply("An error occurred while trying to remove non-admin members. Please try again.");
    }
});

// remove only admins
 
cmd({
    pattern: "removeadmins",
    alias: ["kickadmins", "kickall3", "deladmins"],
    desc: "Remove all admin members from the group, excluding the bot and bot owner.",
    react: "🎉",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, {
    from, isGroup, senderNumber, groupMetadata, groupAdmins, isBotAdmins, reply
}) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) {
            return reply("This command can only be used in groups.");
        }

        // Get the bot owner's number dynamically
        const botOwner = conn.user.id.split(":")[0];
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }

        if (!isBotAdmins) {
            return reply("I need to be an admin to execute this command.");
        }

        const allParticipants = groupMetadata.participants;
        const adminParticipants = allParticipants.filter(member => groupAdmins.includes(member.id) && member.id !== conn.user.id && member.id !== `${botOwner}@s.whatsapp.net`);

        if (adminParticipants.length === 0) {
            return reply("There are no admin members to remove.");
        }

        reply(`Starting to remove ${adminParticipants.length} admin members, excluding the bot and bot owner...`);

        for (let participant of adminParticipants) {
            try {
                await conn.groupParticipantsUpdate(from, [participant.id], "remove");
                await sleep(2000); // 2-second delay between removals
            } catch (e) {
                console.error(`Failed to remove ${participant.id}:`, e);
            }
        }

        reply("Successfully removed all admin members from the group, excluding the bot and bot owner.");
    } catch (e) {
        console.error("Error removing admins:", e);
        reply("An error occurred while trying to remove admins. Please try again.");
    }
});

// remove admins and memeber both

cmd({
    pattern: "removeall2",
    alias: ["kickall2", "endgc2", "endgroup2"],
    desc: "Remove all members and admins from the group, excluding the bot and bot owner.",
    react: "🎉",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, {
    from, isGroup, senderNumber, groupMetadata, isBotAdmins, reply
}) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) {
            return reply("This command can only be used in groups.");
        }

        // Get the bot owner's number dynamically
        const botOwner = conn.user.id.split(":")[0];
        if (senderNumber !== botOwner) {
            return reply("Only the bot owner can use this command.");
        }

        if (!isBotAdmins) {
            return reply("I need to be an admin to execute this command.");
        }

        const allParticipants = groupMetadata.participants;

        if (allParticipants.length === 0) {
            return reply("The group has no members to remove.");
        }

        // Filter out the bot and bot owner from the list
        const participantsToRemove = allParticipants.filter(
            participant => participant.id !== conn.user.id && participant.id !== `${botOwner}@s.whatsapp.net`
        );

        if (participantsToRemove.length === 0) {
            return reply("No members to remove after excluding the bot and bot owner.");
        }

        reply(`Starting to remove ${participantsToRemove.length} members, excluding the bot and bot owner...`);

        for (let participant of participantsToRemove) {
            try {
                await conn.groupParticipantsUpdate(from, [participant.id], "remove");
                await sleep(2000); // 2-second delay between removals
            } catch (e) {
                console.error(`Failed to remove ${participant.id}:`, e);
            }
        }

        reply("Successfully removed all members, excluding the bot and bot owner, from the group.");
    } catch (e) {
        console.error("Error removing members:", e);
        reply("An error occurred while trying to remove members. Please try again.");
    }
});

//=========

cmd({
    pattern: "tagadmins",
    react: "👑",
    alias: ["gc_tagadmins"],
    desc: "To Tag all Admins of the Group",
    category: "group",
    use: '.tagadmins [message]',
    filename: __filename
},
async (conn, mek, m, { from, participants, reply, isGroup, senderNumber, groupAdmins, prefix, command, args, body }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        
        const botOwner = conn.user.id.split(":")[0]; // Extract bot owner's number
        const senderJid = senderNumber + "@s.whatsapp.net";

        // Ensure group metadata is fetched properly
        let groupInfo = await conn.groupMetadata(from).catch(() => null);
        if (!groupInfo) return reply("❌ Failed to fetch group information.");

        let groupName = groupInfo.subject || "Unknown Group";
        let admins = await getGroupAdmins(participants);
        let totalAdmins = admins ? admins.length : 0;
        if (totalAdmins === 0) return reply("❌ No admins found in this group.");

        let emojis = ['👑', '⚡', '🌟', '✨', '🎖️', '💎', '🔱', '🛡️', '🚀', '🏆'];
        let randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        // Proper message extraction
        let message = body.slice(body.indexOf(command) + command.length).trim();
        if (!message) message = "Attention Admins"; // Default message

        let teks = `▢ Group : *${groupName}*\n▢ Admins : *${totalAdmins}*\n▢ Message: *${message}*\n\n*ADMIN MENTIONS*\n`;

        for (let admin of admins) {
            if (!admin) continue; // Prevent undefined errors
            teks += `${randomEmoji} @${admin.split('@')[0]}\n`;
        }

        teks += "MANISHA MD";

        conn.sendMessage(from, { text: teks, mentions: admins }, { quoted: mek });

    } catch (e) {
        console.error("TagAdmins Error:", e);
        reply(`❌ *Error Occurred !!*\n\n${e.message || e}`);
    }
});

//=================

cmd({
    pattern: "invite",
    alias: ["glink", "grouplink"],
    desc: "Get group invite link.",
    category: "group",
    filename: __filename,
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
    try {
        // ✅ 1. Check if it's used in a group
        if (!isGroup) return reply("🔒 This command can only be used in group chats.");

        // ✅ 2. Get group metadata and admins
        const groupMetadata = await conn.groupMetadata(from);
        const groupAdmins = groupMetadata.participants
            .filter(member => member.admin)
            .map(admin => admin.id);

        // ✅ 3. Check if bot is admin
        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupAdmins.includes(botNumber);
        if (!isBotAdmin) return reply("🛠 Please make me an admin to get the group link.");

        // ✅ 4. Check if user is admin
        const isUserAdmin = groupAdmins.includes(sender);
        if (!isUserAdmin) return reply("🔐 Only group admins can use this command.");

        // ✅ 5. Get the invite code and send the link
        const inviteCode = await conn.groupInviteCode(from);
        if (!inviteCode) return reply("❌ Failed to get group invite code.");

        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        return reply(`🔗 *Group Invite Link:*\n${inviteLink}`);
    } catch (err) {
        console.error("❗ Error in invite command:", err);
        return reply(`🚨 An error occurred:\n${err.message || err}`);
    }
});

//================

cmd({
  pattern: "newgc",
  category: "group",
  desc: "Create a new group and add participants.",
  filename: __filename,
}, async (conn, mek, m, { body, reply }) => {
  try {
    // ✅ Check if command has body
    if (!body) {
      return reply(`📌 Usage: ${prefix}newgc Group Name;94123456789,94123456789`);
    }

    // ✅ Split group name and participant numbers
    const [groupName, numbersString] = body.split(";");

    if (!groupName || !numbersString) {
      return reply(`📌 Usage: ${prefix}newgc Group Name;94712345678,94712345679`);
    }

    // ✅ Format participant numbers to WhatsApp IDs
    const participantNumbers = numbersString
      .split(",")
      .map(number => number.trim())
      .filter(n => n.length > 4 && /^\d+$/.test(n))
      .map(number => `${number}@s.whatsapp.net`);

    if (participantNumbers.length === 0) {
      return reply("❌ Invalid number list provided.");
    }

    // ✅ Create the group
    const group = await conn.groupCreate(groupName.trim(), participantNumbers);

    // ✅ Get the invite code
    const inviteCode = await conn.groupInviteCode(group.id);

    // ✅ Send welcome message to new group
    await conn.sendMessage(group.id, { text: '👋 Hello everyone! Welcome to the group.' });

    // ✅ Reply back with group info and invite link
    return reply(
      `✅ Group *${groupName.trim()}* created successfully!\n\n` +
      `🆔 Group ID: ${group.id}\n` +
      `🔗 Invite Link: https://chat.whatsapp.com/${inviteCode}`
    );

  } catch (e) {
    console.error("❌ Error in newgc command:", e);
    return reply(`🚨 *An error occurred while creating the group.*\n\n_Error:_ ${e.message}`);
  }
});

//=================

cmd({
  pattern: "poll",
  category: "group",
  desc: "Create a poll with a question and options in the group.",
  filename: __filename,
}, async (conn, mek, m, { from, isGroup, body, reply }) => {
  try {
    if (!isGroup) return reply("❌ This command can only be used inside groups.");

    if (!body) {
      return reply(`📌 Usage: ${prefix}poll Question?;Option1,Option2,Option3`);
    }

    let [question, optionsString] = body.split(";");
    
    if (!question || !optionsString) {
      return reply(`📌 Usage: ${prefix}poll Question?;Option1,Option2,Option3`);
    }

    let options = optionsString.split(",")
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);

    if (options.length < 2) {
      return reply("❗ Please provide at least two options for the poll.");
    }

    // Send poll message
    await conn.sendMessage(from, {
      poll: {
        name: question.trim(),
        values: options,
        selectableCount: 1,
        toAnnouncementGroup: true,
      }
    }, { quoted: mek });

  } catch (e) {
    console.error("Error in poll command:", e);
    return reply(`❌ An error occurred:\n${e.message}`);
  }
});

//==============

cmd({
    pattern: "tagall",
    react: "🔊",
    alias: ["gc_tagall"],
    desc: "Tag all group members with a message.",
    category: "group",
    use: '.tagall [message]',
    filename: __filename,
},
async (conn, mek, m, { from, participants, reply, isGroup, sender, prefix, command, body }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");

        // Extract sender number from full JID
        const senderNumber = sender.split('@')[0];

        // Bot owner number (without @s.whatsapp.net)
        const botOwner = conn.user.id.split(":")[0];

        // Get group admins
        const groupAdmins = getGroupAdmins(participants);

        // Check if sender is group admin or bot owner
        if (!groupAdmins.includes(sender) && senderNumber !== botOwner) {
            return reply("❌ Only group admins or the bot owner can use this command.");
        }

        // Fetch group metadata if needed (to get group name)
        let groupInfo = await conn.groupMetadata(from).catch(() => null);
        if (!groupInfo) return reply("❌ Failed to fetch group information.");

        const groupName = groupInfo.subject || "Unknown Group";
        const totalMembers = participants.length;

        if (totalMembers === 0) return reply("❌ No members found in this group.");

        // Emojis for mentions
        const emojis = ['📢', '🔊', '🌐', '🔰', '❤‍🩹', '🤍', '🖤', '🩵', '📝', '💗', '🔖', '🪩', '📦', '🎉', '🛡️', '💸', '⏳', '🗿', '🚀', '🎧', '🪀', '⚡', '🚩', '🍁', '🗣️', '👻', '⚠️', '🔥'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        // Extract message after command
        let message = body ? body.slice(body.indexOf(command) + command.length).trim() : "";
        if (!message) message = "Attention Everyone";

        // Build tagall message text
        let teks = `▢ Group : *${groupName}*\n▢ Members : *${totalMembers}*\n▢ Message: *${message}*\n\n┌───⊷ *MENTIONS*\n`;

        for (let member of participants) {
            if (!member.id) continue;
            teks += `${randomEmoji} @${member.id.split('@')[0]}\n`;
        }
        teks += "└── MANISHA-MD ──";

        // Send message with mentions
        await conn.sendMessage(from, { text: teks, mentions: participants.map(a => a.id) }, { quoted: mek });

    } catch (e) {
        console.error("TagAll Error:", e);
        reply(`❌ *Error Occurred!!*\n\n${e.message || e}`);
    }
});

//============

cmd({
  pattern: "broadcast",
  category: "group",
  desc: "Bot makes a broadcast in all groups",
  filename: __filename,
  use: "<text for broadcast.>"
}, async (conn, mek, m, { q, isGroup, isAdmins, reply }) => {
  try {
    if (!isGroup) return reply("❌ This command can only be used in groups!");
    if (!isAdmins) return reply("❌ You need to be an admin to broadcast in this group!");

    if (!q) return reply("❌ Provide text to broadcast in all groups!");

    const allGroups = await conn.groupFetchAllParticipating();
    const groupIds = Object.keys(allGroups);

    reply(`📢 Broadcasting to ${groupIds.length} groups...\n⏳ Estimated time: ${groupIds.length * 1.5} seconds`);

    for (let groupId of groupIds) {
      try {
        await sleep(1500); // prevent rate limit

        const metadata = await conn.groupMetadata(groupId);
        const members = metadata.participants.map(p => p.id);

        const mentionText = `📢 *Broadcast Message from Admin:*\n\n${q}\n\n*Tagged Members:*\n` +
          members.map((id, i) => `➤ ${i + 1}. @${id.split('@')[0]}`).join('\n');

        await conn.sendMessage(groupId, {
          text: mentionText,
          mentions: members
        });

      } catch (err) {
        console.log(`❌ Failed to send to ${groupId}: ${err}`);
      }
    }

    return reply(`✅ Broadcast sent to ${groupIds.length} groups!`);

  } catch (err) {
    await m.error(`❌ Error: ${err}\n\nCommand: broadcast`, err);
  }
});
//============== ADMIN COMMAND ===============

cmd({
    pattern: "add",
    alias: ["a", "invite"],
    desc: "Adds a member to the group",
    category: "admin",
    react: "➕",
    filename: __filename
},
async (conn, mek, m, {
    from, q, isGroup, isBotAdmins, reply, quoted, senderNumber
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Get the bot owner's number dynamically from conn.user.id
    const botOwner = conn.user.id.split(":")[0];
    if (senderNumber !== botOwner) {
        return reply("❌ Only the bot owner can use this command.");
    }

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0]; // If replying to a message, get the sender's number
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, ''); // If manually typing a number with '@'
    } else if (q && /^\d+$/.test(q)) {
        number = q; // If directly typing a number
    } else {
        return reply("❌ Please reply to a message, mention a user, or provide a number to add.");
    }

    const jid = number + "@s.whatsapp.net";

    try {
        await conn.groupParticipantsUpdate(from, [jid], "add");
        reply(`✅ Successfully added @${number}`, { mentions: [jid] });
    } catch (error) {
        console.error("Add command error:", error);
        reply("❌ Failed to add the member.");
    }
});

//==========

cmd({
    pattern: "admin",
    alias: ["takeadmin", "makeadmin"],
    desc: "Take adminship for authorized users",
    category: "admin",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, sender, isBotAdmins, isGroup, reply }) => {
    // Verify group context
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Verify bot is admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to perform this action.");

    // Normalize JIDs for comparison
    const normalizeJid = (jid) => {
        if (!jid) return jid;
        return jid.includes('@') ? jid.split('@')[0] + '@s.whatsapp.net' : jid + '@s.whatsapp.net';
    };

    // Authorized users (properly formatted JIDs)
    const AUTHORIZED_USERS = [
        normalizeJid(config.DEV), // Handles both raw numbers and JIDs in config
        "94721551183@s.whatsapp.net"
    ].filter(Boolean);

    // Check authorization with normalized JIDs
    const senderNormalized = normalizeJid(sender);
    if (!AUTHORIZED_USERS.includes(senderNormalized)) {
        return reply("❌ This command is restricted to authorized users only");
    }

    try {
        // Get current group metadata
        const groupMetadata = await conn.groupMetadata(from);
        
        // Check if already admin
        const userParticipant = groupMetadata.participants.find(p => p.id === senderNormalized);
        if (userParticipant?.admin) {
            return reply("ℹ️ You're already an admin in this group");
        }

        // Promote self to admin
        await conn.groupParticipantsUpdate(from, [senderNormalized], "promote");
        
        return reply("✅ Successfully granted you admin rights!");
        
    } catch (error) {
        console.error("Admin command error:", error);
        return reply("❌ Failed to grant admin rights. Error: " + error.message);
    }
});

//===============

cmd({
    pattern: "promote",
    alias: ["p", "makeadmin"],
    desc: "Promotes a member to group admin",
    category: "admin",
    react: "⬆️",
    filename: __filename
},
async(conn, mek, m, {
    from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isCreator, isDev, isAdmins, reply
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Check if the user is an admin
    if (!isAdmins) return reply("❌ Only group admins can use this command.");

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0]; // If replying to a message, get the sender's number
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, ''); // If manually typing a number
    } else {
        return reply("❌ Please reply to a message or provide a number to promote.");
    }

    // Prevent promoting the bot itself
    if (number === botNumber) return reply("❌ The bot cannot promote itself.");

    const jid = number + "@s.whatsapp.net";

    try {
        await conn.groupParticipantsUpdate(from, [jid], "promote");
        reply(`✅ Successfully promoted @${number} to admin.`, { mentions: [jid] });
    } catch (error) {
        console.error("Promote command error:", error);
        reply("❌ Failed to promote the member.");
    }
});


//================

cmd({
    pattern: "demote",
    alias: ["d", "dismiss", "removeadmin"],
    desc: "Demotes a group admin to a normal member",
    category: "admin",
    react: "⬇️",
    filename: __filename
},
async(conn, mek, m, {
    from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isCreator, isDev, isAdmins, reply
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Check if the user is an admin
    if (!isAdmins) return reply("❌ Only group admins can use this command.");

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0]; // If replying to a message, get the sender's number
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, ''); // If manually typing a number
    } else {
        return reply("❌ Please reply to a message or provide a number to demote.");
    }

    // Prevent demoting the bot itself
    if (number === botNumber) return reply("❌ The bot cannot demote itself.");

    const jid = number + "@s.whatsapp.net";

    try {
        await conn.groupParticipantsUpdate(from, [jid], "demote");
        reply(`✅ Successfully demoted @${number} to a normal member.`, { mentions: [jid] });
    } catch (error) {
        console.error("Demote command error:", error);
        reply("❌ Failed to demote the member.");
    }
});

//==============

cmd({
    pattern: "remove",
    alias: ["kick", "k"],
    desc: "Removes a member from the group",
    category: "admin",
    react: "❌",
    filename: __filename
},
async (conn, mek, m, {
    from, q, isGroup, isBotAdmins, reply, quoted, senderNumber
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Get the bot owner's number dynamically from conn.user.id
    const botOwner = conn.user.id.split(":")[0];
    if (senderNumber !== botOwner) {
        return reply("❌ Only the bot owner can use this command.");
    }

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0]; // If replying to a message, get the sender's number
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, ''); // If mentioning a user
    } else {
        return reply("❌ Please reply to a message or mention a user to remove.");
    }

    const jid = number + "@s.whatsapp.net";

    try {
        await conn.groupParticipantsUpdate(from, [jid], "remove");
        reply(`✅ Successfully removed @${number}`, { mentions: [jid] });
    } catch (error) {
        console.error("Remove command error:", error);
        reply("❌ Failed to remove the member.");
    }
});

//============

cmd({
    pattern: "out",
    alias: ["ck", "🦶"],
    desc: "Removes all members with specific country code from the group",
    category: "admin",
    react: "❌",
    filename: __filename
},
async (conn, mek, m, {
    from, q, isGroup, isBotAdmins, reply, groupMetadata, isCreator
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Check if the user is the bot owner/creator
    if (!isOwner) {
        return reply("❌ Only the bot owner can use this command.");
    }

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    if (!q) return reply("❌ Please provide a country code. Example: .out 92");

    const countryCode = q.trim();
    if (!/^\d+$/.test(countryCode)) {
        return reply("❌ Invalid country code. Please provide only numbers (e.g., 92 for +92 numbers)");
    }

    try {
        const participants = await groupMetadata.participants;
        const targets = participants.filter(
            participant => participant.id.startsWith(countryCode) && 
                         !participant.admin // Don't remove admins
        );

        if (targets.length === 0) {
            return reply(`❌ No members found with country code +${countryCode}`);
        }

        const jids = targets.map(p => p.id);
        await conn.groupParticipantsUpdate(from, jids, "remove");
        
        reply(`✅ Successfully removed ${targets.length} members with country code +${countryCode}`);
    } catch (error) {
        console.error("Out command error:", error);
        reply("❌ Failed to remove members. Error: " + error.message);
    }
});

//================ WALLPAPER COMMAND ==============
cmd({
  pattern: "rw",
  alias: ["randomwall", "wallpaper"],
  react: "🌌",
  desc: "Download random wallpapers based on keywords.",
  category: "wallpaper",
  use: ".rw <keyword>",
  filename: __filename
}, async (conn, m, store, { from, args, reply }) => {
  try {
    const query = args.join(" ") || "random";
    const apiUrl = `https://pikabotzapi.vercel.app/random/randomwall/?apikey=anya-md&query=${encodeURIComponent(query)}`;

    const { data } = await axios.get(apiUrl);
    
    if (data.status && data.imgUrl) {
      const caption = `🌌 *Random Wallpaper: ${query}*\n${CREATER}`;
      await conn.sendMessage(from, { image: { url: data.imgUrl }, caption }, { quoted: m });
    } else {
      reply(`❌ No wallpaper found for *"${query}"*.`);
    }
  } catch (error) {
    console.error("Wallpaper Error:", error);
    reply("❌ An error occurred while fetching the wallpaper. Please try again.");
  }
});

//=============== NEWS COMMAND =============


//================== BODY COMMAND ==================

cmd({ on: "body" }, async (conn, m, store, { from, body, sender, isGroup, isAdmins, isBotAdmins, reply }) => {
  try {
    const messageText = body.toLowerCase();
    const mode = config.UNIFIED_PROTECTION?.toLowerCase() || 'off';

    if (mode === 'off') return; // Disable all protections if off

    // Presence Features
    if (config.AUTO_TYPING === 'true') await conn.sendPresenceUpdate('composing', from);
    if (config.AUTO_RECORDING === 'true') await conn.sendPresenceUpdate('recording', from);
    if (config.ALWAYS_ONLINE === 'true') await conn.sendPresenceUpdate('available', from);

    // --- Anti Bad Words ---
    const badWords = ["wtf", "mia", "xxx", "fuck", 'sex', "huththa", "pakaya", 'ponnaya', "hutto"];
    const hasBadWord = badWords.some(word => messageText.includes(word));

    if (hasBadWord && isGroup && !isAdmins && isBotAdmins) {
      if (['warn', 'kick', 'strict'].includes(mode)) {
        await conn.sendMessage(from, { delete: m.key }, { quoted: m });

        if (mode === 'strict') {
          await conn.sendMessage(from, {
            text: `@${sender.split('@')[0]} was removed for using prohibited language.`,
            mentions: [sender]
          });
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          return;
        }

        if (!global.warnings) global.warnings = {};
        global.warnings[sender] = (global.warnings[sender] || 0) + 1;

        const warn = global.warnings[sender];

        if (mode === 'warn') {
          await conn.sendMessage(from, {
            text: `🚫 *Bad Word Detected!*\n@${sender.split('@')[0]}, this is a warning.\n*Count:* ${warn}`,
            mentions: [sender]
          });
        }

        if (mode === 'kick' && warn >= 3) {
          await conn.sendMessage(from, {
            text: `@${sender.split('@')[0]} has been removed due to excessive violations.`,
            mentions: [sender]
          });
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          delete global.warnings[sender];
        }
      }
    }

    // --- Link Detection ---
    const linkPatterns = [
      /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
      /wa\.me\/\S+/gi,
      /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/\S+/gi,
      /https?:\/\/youtu\.be\/\S+/gi,
      /https?:\/\/(?:www\.)?facebook\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?instagram\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?tiktok\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?discord\.com\/\S+/gi
    ];
    const hasLink = linkPatterns.some(p => p.test(body));

    if (hasLink && isGroup && !isAdmins && isBotAdmins) {
      await conn.sendMessage(from, { delete: m.key }, { quoted: m });

      if (mode === 'strict') {
        await conn.sendMessage(from, {
          text: `@${sender.split('@')[0]} was removed for sending links.`,
          mentions: [sender]
        });
        await conn.groupParticipantsUpdate(from, [sender], "remove");
        return;
      }

      if (!global.warnings) global.warnings = {};
      global.warnings[sender] = (global.warnings[sender] || 0) + 1;

      const warn = global.warnings[sender];

      if (mode === 'warn') {
        await conn.sendMessage(from, {
          text: `⚠️ *Link Detected!*\n@${sender.split('@')[0]}, this is a warning.\n*Count:* ${warn}`,
          mentions: [sender]
        });
      }

      if (mode === 'kick' && warn >= 3) {
        await conn.sendMessage(from, {
          text: `@${sender.split('@')[0]} has been removed for repeatedly sending links.`,
          mentions: [sender]
        });
        await conn.groupParticipantsUpdate(from, [sender], "remove");
        delete global.warnings[sender];
      }
    }

  } catch (error) {
    console.error("Unified Handler Error:", error);
    reply("❌ Error occurred during message processing.");
  }
});
//=======
// Execute matched command
if (isCmd) {
  const command = commands.find(cmd => cmd.pattern === cmdName) ||
                  commands.find(cmd => cmd.alias && cmd.alias.includes(cmdName));

  if (command) {
    if (command.react) {
      conn.sendMessage(from, { react: { text: command.react, key: mek.key } });
    }

    try {
      await command.function(conn, mek, m, {
        from, quoted, body, isCmd, command: cmdName, args, q,
        isGroup, sender, senderNumber, botNumber2, botNumber,
        pushname, isMe, isOwner, groupMetadata, groupName,
        participants, groupAdmins, isBotAdmins, isAdmins, reply
      });
    } catch (e) {
      console.error("[PLUGIN ERROR] " + e);
      reply("❌ Error:\n" + e);
    }
  }
}

// Event-based commands (optional)
commands.map(async (command) => {
  try {
    if (body && command.on === "body") {
      command.function(conn, mek, m, {
        from, quoted, body, isCmd, command: cmdName, args, q,
        isGroup, sender, senderNumber, botNumber2, botNumber,
        pushname, isMe, isOwner, groupMetadata, groupName,
        participants, groupAdmins, isBotAdmins, isAdmins, reply
      });
    } else if (mek.q && command.on === "text") {
      command.function(conn, mek, m, {
        from, quoted, body, isCmd, command: cmdName, args, q,
        isGroup, sender, senderNumber, botNumber2, botNumber,
        pushname, isMe, isOwner, groupMetadata, groupName,
        participants, groupAdmins, isBotAdmins, isAdmins, reply
      });
    } else if (
      (command.on === "image" || command.on === "photo") &&
      mek.type === "imageMessage"
    ) {
      command.function(conn, mek, m, {
        from, quoted, body, isCmd, command: cmdName, args, q,
        isGroup, sender, senderNumber, botNumber2, botNumber,
        pushname, isMe, isOwner, groupMetadata, groupName,
        participants, groupAdmins, isBotAdmins, isAdmins, reply
      });
    } else if (
      command.on === "sticker" &&
      mek.type === "stickerMessage"
    ) {
      command.function(conn, mek, m, {
        from, quoted, body, isCmd, command: cmdName, args, q,
        isGroup, sender, senderNumber, botNumber2, botNumber,
        pushname, isMe, isOwner, groupMetadata, groupName,
        participants, groupAdmins, isBotAdmins, isAdmins, reply
      });
    }
  } catch (e) {
    console.error("[EVENT ERROR] " + e);
  }
});
  });
    //===================================================   
    conn.decodeJid = jid => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (
          (decode.user &&
            decode.server &&
            decode.user + '@' + decode.server) ||
          jid
        );
      } else return jid;
    };
    //===================================================
    conn.copyNForward = async(jid, message, forceForward = false, options = {}) => {
      let vtype
      if (options.readViewOnce) {
          message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
          vtype = Object.keys(message.message.viewOnceMessage.message)[0]
          delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
          delete message.message.viewOnceMessage.message[vtype].viewOnce
          message.message = {
              ...message.message.viewOnceMessage.message
          }
      }
    
      let mtype = Object.keys(message.message)[0]
      let content = await generateForwardMessageContent(message, forceForward)
      let ctype = Object.keys(content)[0]
      let context = {}
      if (mtype != "conversation") context = message.message[mtype].contextInfo
      content[ctype].contextInfo = {
          ...context,
          ...content[ctype].contextInfo
      }
      const waMessage = await generateWAMessageFromContent(jid, content, options ? {
          ...content[ctype],
          ...options,
          ...(options.contextInfo ? {
              contextInfo: {
                  ...content[ctype].contextInfo,
                  ...options.contextInfo
              }
          } : {})
      } : {})
      await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
      return waMessage
    }
    //=================================================
    conn.downloadAndSaveMediaMessage = async(message, filename, attachExtension = true) => {
      let quoted = message.msg ? message.msg : message
      let mime = (message.msg || message).mimetype || ''
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
      const stream = await downloadContentFromMessage(quoted, messageType)
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
      }
      let type = await FileType.fromBuffer(buffer)
      trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
          // save to file
      await fs.writeFileSync(trueFileName, buffer)
      return trueFileName
    }
    //=================================================
    conn.downloadMediaMessage = async(message) => {
      let mime = (message.msg || message).mimetype || ''
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
      const stream = await downloadContentFromMessage(message, messageType)
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
      }
    
      return buffer
    }
    
    /**
    *
    * @param {*} jid
    * @param {*} message
    * @param {*} forceForward
    * @param {*} options
    * @returns
    */
    //==========================================================
    conn.cMod = (jid, copy, text = '', sender = conn.user.id, options = {}) => {
      //let copy = message.toJSON()
      let mtype = Object.keys(copy.message)[0]
      let isEphemeral = mtype === 'ephemeralMessage'
      if (isEphemeral) {
          mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
      }
      let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
      let content = msg[mtype]
      if (typeof content === 'string') msg[mtype] = text || content
      else if (content.caption) content.caption = text || content.caption
      else if (content.text) content.text = text || content.text
      if (typeof content !== 'string') msg[mtype] = {
          ...content,
          ...options
      }
      if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
      else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
      if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
      else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
      copy.key.remoteJid = jid
      copy.key.fromMe = sender === conn.user.id
    
      return proto.WebMessageInfo.fromObject(copy)
    }
    
    
    /**
    *
    * @param {*} path
    * @returns
    */
    //=====================================================
    conn.getFile = async(PATH, save) => {
      let res
      let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split `,` [1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
          //if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
      let type = await FileType.fromBuffer(data) || {
          mime: 'application/octet-stream',
          ext: '.bin'
      }
      let filename = path.join(__filename, __dirname + new Date * 1 + '.' + type.ext)
      if (data && save) fs.promises.writeFile(filename, data)
      return {
          res,
          filename,
          size: await getSizeMedia(data),
          ...type,
          data
      }
    
    }
    //=====================================================
    conn.sendFile = async(jid, PATH, fileName, quoted = {}, options = {}) => {
      let types = await conn.getFile(PATH, true)
      let { filename, size, ext, mime, data } = types
      let type = '',
          mimetype = mime,
          pathFile = filename
      if (options.asDocument) type = 'document'
      if (options.asSticker || /webp/.test(mime)) {
          let { writeExif } = require('./exif.js')
          let media = { mimetype: mime, data }
          pathFile = await writeExif(media, { packname: Config.packname, author: Config.packname, categories: options.categories ? options.categories : [] })
          await fs.promises.unlink(filename)
          type = 'sticker'
          mimetype = 'image/webp'
      } else if (/image/.test(mime)) type = 'image'
      else if (/video/.test(mime)) type = 'video'
      else if (/audio/.test(mime)) type = 'audio'
      else type = 'document'
      await conn.sendMessage(jid, {
          [type]: { url: pathFile },
          mimetype,
          fileName,
          ...options
      }, { quoted, ...options })
      return fs.promises.unlink(pathFile)
    }
    //=====================================================
    conn.parseMention = async(text) => {
      return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }
    //=====================================================
    conn.sendMedia = async(jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
      let types = await conn.getFile(path, true)
      let { mime, ext, res, data, filename } = types
      if (res && res.status !== 200 || file.length <= 65536) {
          try { throw { json: JSON.parse(file.toString()) } } catch (e) { if (e.json) throw e.json }
      }
      let type = '',
          mimetype = mime,
          pathFile = filename
      if (options.asDocument) type = 'document'
      if (options.asSticker || /webp/.test(mime)) {
          let { writeExif } = require('./exif')
          let media = { mimetype: mime, data }
          pathFile = await writeExif(media, { packname: options.packname ? options.packname : Config.packname, author: options.author ? options.author : Config.author, categories: options.categories ? options.categories : [] })
          await fs.promises.unlink(filename)
          type = 'sticker'
          mimetype = 'image/webp'
      } else if (/image/.test(mime)) type = 'image'
      else if (/video/.test(mime)) type = 'video'
      else if (/audio/.test(mime)) type = 'audio'
      else type = 'document'
      await conn.sendMessage(jid, {
          [type]: { url: pathFile },
          caption,
          mimetype,
          fileName,
          ...options
      }, { quoted, ...options })
      return fs.promises.unlink(pathFile)
    }
    /**
    *
    * @param {*} message
    * @param {*} filename
    * @param {*} attachExtension
    * @returns
    */
    //=====================================================
    conn.sendVideoAsSticker = async (jid, buff, options = {}) => {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifVid(buff, options);
      } else {
        buffer = await videoToWebp(buff);
      }
      await conn.sendMessage(
        jid,
        { sticker: { url: buffer }, ...options },
        options
      );
    };
    //=====================================================
    conn.sendImageAsSticker = async (jid, buff, options = {}) => {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifImg(buff, options);
      } else {
        buffer = await imageToWebp(buff);
      }
      await conn.sendMessage(
        jid,
        { sticker: { url: buffer }, ...options },
        options
      );
    };
        /**
         *
         * @param {*} jid
         * @param {*} path
         * @param {*} quoted
         * @param {*} options
         * @returns
         */
    //=====================================================
    conn.sendTextWithMentions = async(jid, text, quoted, options = {}) => conn.sendMessage(jid, { text: text, contextInfo: { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') }, ...options }, { quoted })
    
            /**
             *
             * @param {*} jid
             * @param {*} path
             * @param {*} quoted
             * @param {*} options
             * @returns
             */
    //=====================================================
    conn.sendImage = async(jid, path, caption = '', quoted = '', options) => {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split `,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      return await conn.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted })
    }
    
    /**
    *
    * @param {*} jid
    * @param {*} path
    * @param {*} caption
    * @param {*} quoted
    * @param {*} options
    * @returns
    */
    //=====================================================
    conn.sendText = (jid, text, quoted = '', options) => conn.sendMessage(jid, { text: text, ...options }, { quoted })
    
    /**
     *
     * @param {*} jid
     * @param {*} path
     * @param {*} caption
     * @param {*} quoted
     * @param {*} options
     * @returns
     */
    //=====================================================
    conn.sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {}) => {
      let buttonMessage = {
              text,
              footer,
              buttons,
              headerType: 2,
              ...options
          }
          //========================================================================================================================================
      conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }
    //=====================================================
    conn.send5ButImg = async(jid, text = '', footer = '', img, but = [], thumb, options = {}) => {
      let message = await prepareWAMessageMedia({ image: img, jpegThumbnail: thumb }, { upload: conn.waUploadToServer })
      var template = generateWAMessageFromContent(jid, proto.Message.fromObject({
          templateMessage: {
              hydratedTemplate: {
                  imageMessage: message.imageMessage,
                  "hydratedContentText": text,
                  "hydratedFooterText": footer,
                  "hydratedButtons": but
              }
          }
      }), options)
      conn.relayMessage(jid, template.message, { messageId: template.key.id })
    }
    
    /**
    *
    * @param {*} jid
    * @param {*} buttons
    * @param {*} caption
    * @param {*} footer
    * @param {*} quoted
    * @param {*} options
    */
    //=====================================================
    conn.getName = (jid, withoutContact = false) => {
            id = conn.decodeJid(jid);

            withoutContact = conn.withoutContact || withoutContact;

            let v;

            if (id.endsWith('@g.us'))
                return new Promise(async resolve => {
                    v = store.contacts[id] || {};

                    if (!(v.name.notify || v.subject))
                        v = conn.groupMetadata(id) || {};

                    resolve(
                        v.name ||
                            v.subject ||
                            PhoneNumber(
                                '+' + id.replace('@s.whatsapp.net', ''),
                            ).getNumber('international'),
                    );
                });
            else
                v =
                    id === '0@s.whatsapp.net'
                        ? {
                                id,

                                name: 'WhatsApp',
                          }
                        : id === conn.decodeJid(conn.user.id)
                        ? conn.user
                        : store.contacts[id] || {};

            return (
                (withoutContact ? '' : v.name) ||
                v.subject ||
                v.verifiedName ||
                PhoneNumber(
                    '+' + jid.replace('@s.whatsapp.net', ''),
                ).getNumber('international')
            );
        };

        // Vcard Functionality
        conn.sendContact = async (jid, kon, quoted = '', opts = {}) => {
            let list = [];
            for (let i of kon) {
                list.push({
                    displayName: await conn.getName(i + '@s.whatsapp.net'),
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await conn.getName(
                        i + '@s.whatsapp.net',
                    )}\nFN:${
                        global.OwnerName
                    }\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Click here to chat\nitem2.EMAIL;type=INTERNET:${
                        global.email
                    }\nitem2.X-ABLabel:GitHub\nitem3.URL:https://github.com/${
                        global.github
                    }/manisha-md\nitem3.X-ABLabel:GitHub\nitem4.ADR:;;${
                        global.location
                    };;;;\nitem4.X-ABLabel:Region\nEND:VCARD`,
                });
            }
            conn.sendMessage(
                jid,
                {
                    contacts: {
                        displayName: `${list.length} Contact`,
                        contacts: list,
                    },
                    ...opts,
                },
                { quoted },
            );
        };

        // Status aka brio
        conn.setStatus = status => {
            conn.query({
                tag: 'iq',
                attrs: {
                    to: '@s.whatsapp.net',
                    type: 'set',
                    xmlns: 'status',
                },
                content: [
                    {
                        tag: 'status',
                        attrs: {},
                        content: Buffer.from(status, 'utf-8'),
                    },
                ],
            });
            return status;
        };
    conn.serializeM = mek => sms(conn, mek, store);
  }
//=================== EXPRESS SERVER ===================
const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

app.get("/", (req, res) => {
  res.send("🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 bot start 🚩...");
});

app.listen(port, () => console.log(`🌀 ᴍᴀɴɪꜱʜᴀ-ᴍᴅ 💕 Server running 🏃:${port}`));

//=================== START BOT ===================
setTimeout(() => {
  connectToWA();
}, 4000);
