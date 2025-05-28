process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
// تعيين متغير بيئة ليقبل شهادات TLS حتى لو كانت غير موثوقة

import './settings.js'
// استيراد ملف الإعدادات

// استيراد مكتبات وأدوات متعددة ضرورية لتشغيل البوت
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, rmSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { tmpdir } from 'os'
import { format } from 'util'
import P from 'pino'
import pino from 'pino'
import Pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import store from './lib/store.js'

// استيراد مكتبة baileys المسؤولة عن الاتصال بالواتساب
const { proto } = (await import('@whiskeysockets/baileys')).default
const { DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, jidNormalizedUser, PHONENUMBER_MCC } = await import('@whiskeysockets/baileys')

import readline from 'readline'
import NodeCache from 'node-cache'

const { CONNECTING } = ws
const { chain } = lodash

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000
// تعيين رقم البورت من البيئة أو رقم 3000 افتراضياً

// تهيئة أنواع البروتوكولات للبايليز
protoType()
serialize()

// تعريف دوال لمساعدتنا بتحويل المسارات وتحميل الوحدات
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
};
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

// تعريف دالة لتكوين روابط API مع المفاتيح الخاصة
global.API = (name, path = '/', query = {}, apikeyqueryname) => 
  (name in global.APIs ? global.APIs[name] : name) 
  + path 
  + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({...query, ...(apikeyqueryname ? {[apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]} : {})})) : '');

// حفظ توقيت بداية التشغيل
global.timestamp = { start: new Date }

// تعيين مجلد العمل الأساسي
const __dirname = global.__dirname(import.meta.url)

// قراءة خيارات التشغيل من متغيرات الأوامر
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[' + (opts['prefix'] || '‎z/#$%.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

// إعداد قاعدة البيانات باستخدام lowdb مع ملف JSON
global.db = new Low(new JSONFile(`storage/databases/database.json`))
global.DATABASE = global.db 

// دالة لتحميل قاعدة البيانات مع التعامل مع التزامن
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) return new Promise((resolve) => setInterval(async function () {
    if (!global.db.READ) {
      clearInterval(this)
      resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
    }
  }, 1000))
  if (global.db.data !== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {})
  }
  global.db.chain = chain(global.db.data)
}
loadDatabase()

// تحديد ملف جلسات المصادقة
global.authFile = `sessions`
const { state, saveCreds } = await useMultiFileAuthState(global.authFile)

// جلب أحدث نسخة من مكتبة baileys
const { version } = await fetchLatestBaileysVersion()

// إنشاء واجهة لإدخال الأسئلة في الطرفية
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

// إلغاء console.info لجعله صامت
console.info = () => {} 

// إنشاء لوجر pino لتسجيل الأحداث
const logger = pino({
  timestamp: () => `,"time":"${new Date().toJSON()}"`,
}).child({ class: "client" })
logger.level = "fatal"

// خيارات اتصال الواتساب مع إعدادات خاصة
const connectionOptions = {
  version: [2, 3000, 1015901307],
  logger,
  printQRInTerminal: false,
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
  },
  browser: Browsers.ubuntu("Chrome"),
  markOnlineOnclientect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: true,
  retryRequestDelayMs: 10,
  transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
  defaultQueryTimeoutMs: undefined,
  maxMsgRetryCount: 15,
  appStateMacVerification: {
    patch: false,
    snapshot: false,
  },
  getMessage: async (key) => {
    const jid = jidNormalizedUser(key.remoteJid)
    const msg = await store.loadMessage(jid, key.id)
    return msg?.message || ""
  },
}

// إنشاء اتصال الواتساب
global.conn = makeWASocket(connectionOptions)

// إذا البوت غير مسجل، يطلب رقم الهاتف من المستخدم لتفعيل الاتصال
if (!conn.authState.creds.registered) {
  let phoneNumber = await question(chalk.blue('Ingresa el número de WhatsApp en el cual estará la Bot\n'))
  phoneNumber = phoneNumber.replace(/\D/g, '')
  if (phoneNumber.startsWith('52') && phoneNumber.length === 12) {
    phoneNumber = `521${phoneNumber.slice(2)}`
  } else if (phoneNumber.startsWith('52')) {
    phoneNumber = `521${phoneNumber.slice(2)}`
  } else if (phoneNumber.startsWith('0')) {
    phoneNumber = phoneNumber.replace(/^0/, '')
  }
  if (conn.requestPairingCode) {
    let code = await conn.requestPairingCode(phoneNumber)
    code = code?.match(/.{1,4}/g)?.join("-") || code
    console.log(chalk.cyan('Su código es:', code))
  }
}

conn.isInit = false
conn.well = false

// إذا لم يكن في وضع الاختبار، يبدأ في حفظ قاعدة البيانات بشكل دوري وتنظيف الملفات المؤقتة
if (!opts['test']) {
  if (global.db) {
    setInterval(async () => {
      if (global.db.data) await global.db.write();
      if (opts['autocleartmp'] && (global.support || {}).find) (tmp = [os.tmpdir(), 'tmp', 'serbot'], tmp.forEach((filename) => cp.spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])));
    }, 30000);
  }
}

// دالة تنظيف الملفات المؤقتة التي مضى عليها أكثر من 3 دقائق
function clearTmp() {
  const tmp = [join(__dirname, './tmp')];
  const filename = [];
  tmp.forEach((dirname) => readdirSync(dirname).forEach((file) => filename.push(join(dirname, file))))
  return filename.map((file) => {
    const stats = statSync(file)
    if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 3)) return unlinkSync(file)
    return false
  })
}

// تنظيف دوري كل 3 دقائق
setInterval(async () => {
  if (stopped === 'close' || !conn || !conn.user) return
  const a = await clearTmp()
}, 180000)

// دالة تحديث حالة الاتصال بالواتساب
async function connectionUpdate(update) {
  const {connection, lastDisconnect, isNewLogin} = update;
  global.stopped = connection;
  if (isNewLogin) conn.isInit = true;
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error)
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();
  if (connection == 'open') {
    console.log(chalk.yellow('Conectado correctamente.'))