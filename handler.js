import { smsg } from './lib/simple.js'
import { format } from 'util' 
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'

const { proto } = (await import('@whiskeysockets/baileys')).default

// دالة تتحقق إذا المتغير رقم فعلاً
const isNumber = x => typeof x === 'number' && !isNaN(x)

// دالة تأخير (توقف مؤقت) لمدة ms ميلي ثانية
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
    clearTimeout(this)
    resolve()
}, ms))

// الدالة الرئيسية لمعالجة التحديثات الواردة في الدردشة
export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    if (!chatUpdate)
        return
    // إضافة الرسائل الجديدة إلى قائمة الرسائل
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m)
        return
    if (global.db.data == null)
        await global.loadDatabase()  // تحميل قاعدة البيانات لو لم تكن محملة

    try {
        // تحويل الرسالة بصيغة معينة لتحسين التعامل معها
        m = smsg(this, m) || m
        if (!m)
            return

        // تعيين خصائص افتراضية للرسالة
        m.exp = 0
        m.limit = false

        try {
            // الحصول على بيانات المستخدم من قاعدة البيانات
            let user = global.db.data.users[m.sender]
            if (typeof user !== 'object')
                global.db.data.users[m.sender] = {}

            if (user) {
                // التأكد من وجود الخصائص الأساسية مع قيم افتراضية إذا لم تكن موجودة
                if (!isNumber(user.exp))
                    user.exp = 0
                if (!isNumber(user.limit))
                    user.limit = 10
                if (!('premium' in user)) 
                    user.premium = false
                if (!user.premium) 
                    user.premiumTime = 0
                if (!('registered' in user))
                    user.registered = false
                if (!user.registered) {
                    if (!('name' in user))
                        user.name = m.name
                    if (!isNumber(user.age))
                        user.age = -1
                    if (!isNumber(user.regTime))
                        user.regTime = -1
                }
                if (!isNumber(user.afk))
                    user.afk = -1
                if (!('afkReason' in user))
                    user.afkReason = ''
                if (!('banned' in user))
                    user.banned = false
                if (!('useDocument' in user))
                    user.useDocument = false
                if (!isNumber(user.level))
                    user.level = 0
                if (!isNumber(user.bank))
                    user.bank = 0
            } else
                // إذا المستخدم جديد، إنشاء بيانات افتراضية له
                global.db.data.users[m.sender] = {
                    exp: 0,
                    limit: 10,
                    registered: false,
                    name: m.name,
                    age: -1,
                    regTime: -1,
                    afk: -1,
                    afkReason: '',
                    banned: false,
                    useDocument: true,
                    bank: 0,
                    level: 0,
                }

            // بيانات المحادثة/المجموعة
            let chat = global.db.data.chats[m.chat]
            if (typeof chat !== 'object')
                global.db.data.chats[m.chat] = {}

            if (chat) {
                if (!('isBanned' in chat))
                    chat.isBanned = false
                if (!('bienvenida' in chat))
                    chat.bienvenida = true 
                if (!('antiLink' in chat))
                    chat.antiLink = false
                if (!('onlyLatinos' in chat))
                    chat.onlyLatinos = false
                if (!('nsfw' in chat))
                    chat.nsfw = false
                if (!isNumber(chat.expired))
                    chat.expired = 0
            } else
                global.db.data.chats[m.chat] = {
                    isBanned: false,
                    bienvenida: true,
                    antiLink: false,
                    onlyLatinos: false,
                    nsfw: false, 
                    expired: 0, 
                }

            // إعدادات خاصة بالمستخدم (البوت)
            var settings = global.db.data.settings[this.user.jid]
            if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {}
            if (settings) {
                if (!('self' in settings)) settings.self = false
                if (!('autoread' in settings)) settings.autoread = false
            } else global.db.data.settings[this.user.jid] = {
                self: false,
                autoread: false,
                status: 0
            }
        } catch (e) {
            console.error(e)
        }

        // لو مفتاح "nyimak" مفعّل، نوقف التنفيذ هنا
        if (opts['nyimak'])  return

        // لو الرسالة مش من البوت والخيارات مفعلة بوضع "self"، نوقف
        if (!m.fromMe && opts['self'])  return

        // لو مفعّل "swonly" والرسالة مش من حالة البث، نوقف
        if (opts['swonly'] && m.chat !== 'status@broadcast')  return

        if (typeof m.text !== 'string')
            m.text = ''
        
        let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender]

        // تحقق هل المرسل هو مالك البوت أو مالك رئيسي
        const isROwner = [conn.decodeJid(global.conn.user.id), ...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isOwner = isROwner || m.fromMe

        // تحقق هل هو من المشرفين
        const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)

        // تحقق هل هو مستخدم بريميوم
        const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender) || _user.prem == true

        // لو مفعّل نظام الطابور، ونص الرسالة موجود، والمستخدم ليس مشرفًا أو بريميوم
        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)
            setInterval(async function () {
                if (queque.indexOf(previousID) === -1) clearInterval(this)
                await delay(time)
            }, time)
        }

        // لو الرسالة مرسلة بواسطة النظام نفسه، نوقف
        if (m.isBaileys)
            return

        // إضافة خبرة عشوائية للرسالة
        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix
        
        // معلومات المجموعة والاعضاء
        const groupMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}) || {}
        const participants = (m.isGroup ? groupMetadata.participants : []) || []
        const user = (m.isGroup ? participants.find(u => conn.decodeJid(u.id) === m.sender) : {}) || {}
        const bot = (m.isGroup ? participants.find(u => conn.decodeJid(u.id) == this.user.jid) : {}) || {}

        // صلاحيات المستخدم والباتش بوت في المجموعة
        const isRAdmin = user?.admin == 'superadmin' || false
        const isAdmin = isRAdmin || user?.admin == 'admin' || false
        const isBotAdmin = bot?.admin || false

        // مجلد الاضافات (البلاجنز)
        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')

        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin)
                continue
            if (plugin.disabled)
                continue
            const __filename = join(___dirname, name)

            // تنفيذ دالة all في البلاجن لو كانت موجودة
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error(e)
                }
            }

            if (!opts['restrict'])
                if (plugin.tags && plugin.tags.includes('admin')) {
                    continue
                }
            
            // دوال لالتقاط البريفكس وتفعيل الأوامر ...

            // (هنا يختصر بقيّة الكود لأنه طويل جداً)

        }
    } catch (e) {
        console.error(e)
    }
}