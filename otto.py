import os
import smtplib
import imaplib
import email
import asyncio
from email.mime.text import MIMEText
from email.header import decode_header
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)

# --- معلومات أساسية ---
OWNER_ID = 7753511487
BOT_TOKEN = "8117880248:AAGHbJKDcn-KINHdMuzTAgRg0wUm--example"  # ← غيّري التوكن لو احتجتي

GET_EMAIL, GET_SUBJECT, GET_BODY = range(3)

# --- حسابات البريد المستخدمة للإرسال ---
ACCOUNTS = [
    {"email": "rre383033@gmail.com", "password": "wnvbfjhtwrujronr"},
    {"email": "jhh835443@gmail.com", "password": "orybkiajibsptqif"},
    {"email": "ottofjfghh@gmail.com", "password": "qnebbkeyayqyidyz"},
    {"email": "fufhfieudb@gmail.com", "password": "yjobyzcjjglglejp"},
    {"email": "vjhmgkbx@gmail.com", "password": "ewqezwacmtrwiucx"},
    {"email": "uyfy014@gmail.com", "password": "xyuprvnxlsjtpgbe"},
    {"email": "ifihbndvkfytj@gmail.com", "password": "gquiduzoiuezmdjx"},
]

# --- إيميلات دعم واتساب ---
SUPPORT_EMAILS = [
    "support@support.whatsapp.com",
    "android@support.whatsapp.com",
    "smb@support.whatsapp.com",
    "android_web@support.whatsapp.com",
    "ios@support.whatsapp.com",
    "payments@support.whatsapp.com",
    "security@support.whatsapp.com",
    "report@support.whatsapp.com",
    "business@support.whatsapp.com",
    "web@support.whatsapp.com",
    "email.support@whatsapp.com",
    "response@support.whatsapp.com",
    "verify@support.whatsapp.com",
    "server1@support.whatsapp.com",
    "server2@support.whatsapp.com",
    "help@whatsapp.com",
    "support@whatsapp.com",
    "feedback@support.whatsapp.com",
    "jan@whatsapp.com",
    "press@whatsapp.com",
]

# --- تتبع الردود ---
last_uids = {}
email_to_server_index = {acc["email"]: idx for idx, acc in enumerate(ACCOUNTS)}

def decode_mime_words(s):
    decoded_fragments = []
    for word, charset in decode_header(s):
        if isinstance(word, bytes):
            try:
                decoded_fragments.append(word.decode(charset or 'utf-8'))
            except:
                decoded_fragments.append(word.decode('utf-8', errors='ignore'))
        else:
            decoded_fragments.append(word)
    return ''.join(decoded_fragments)

# --- فحص البريد كل دقيقة ---
async def check_emails_periodically(app):
    while True:
        for idx, acc in enumerate(ACCOUNTS):
            try:
                imap = imaplib.IMAP4_SSL("imap.gmail.com")
                imap.login(acc["email"], acc["password"])
                imap.select("inbox")

                status, messages = imap.search(None, 'FROM "support@support.whatsapp.com"')
                if status != "OK":
                    imap.logout()
                    continue

                msg_ids = messages[0].split()
                if not msg_ids:
                    imap.logout()
                    continue

                last_seen_uid = last_uids.get(acc["email"])
                new_msg_id = None
                for msg_id in reversed(msg_ids):
                    if msg_id > last_seen_uid:
                        new_msg_id = msg_id
                        break

                if new_msg_id:
                    status, msg_data = imap.fetch(new_msg_id, "(RFC822)")
                    if status != "OK":
                        imap.logout()
                        continue

                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            subject = decode_mime_words(msg["Subject"])
                            body = ""

                            if msg.is_multipart():
                                for part in msg.walk():
                                    if part.get_content_type() == "text/plain":
                                        body = part.get_payload(decode=True).decode(errors='ignore')
                                        break
                            else:
                                body = msg.get_payload(decode=True).decode(errors='ignore')

                            server_index = email_to_server_index.get(acc["email"])
                            if app.bot_data.get("busy_servers") and server_index in app.bot_data["busy_servers"]:
                                app.bot_data["busy_servers"].remove(server_index)

                            await app.bot.send_message(
                                chat_id=OWNER_ID,
                                text=(
                                    f"\n📬 *وصل رد جديد من واتساب*\n"
                                    f"🔢 الحساب رقم: {idx + 1}\n"
                                    f"✉️ الموضوع: {subject}\n\n"
                                    f"📨 الرسالة:\n{body[:2000]}"
                                ),
                                parse_mode="Markdown"
                            )

                            last_uids[acc["email"]] = new_msg_id

                imap.logout()

            except Exception as e:
                print(f"📛 خطأ أثناء التحقق من بريد {acc['email']}: {e}")

        await asyncio.sleep(60)

# --- إرسال البريد ---
def send_email(from_email, password, to_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_email, password)
        server.send_message(msg)

# --- عرض قائمة السيرفرات ---
async def show_server_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    buttons = []
    row = []
    busy_servers = context.bot_data.get("busy_servers", set())

    for i in range(len(SUPPORT_EMAILS)):
        if i not in busy_servers:
            row.append(KeyboardButton(f"🔥 سيرفر {i + 1} 🌹"))
            if len(row) == 3:
                buttons.append(row)
                row = []
    if row:
        buttons.append(row)

    buttons.append([KeyboardButton("التواصل مع المطور اوتـو🌹")])
    buttons.append([KeyboardButton("🔙 رجوع"), KeyboardButton("❌ إلغاء")])

    reply_markup = ReplyKeyboardMarkup(buttons, resize_keyboard=True)
    await update.message.reply_text("📨 اختر السيرفر المراد الإرسال إليه:", reply_markup=reply_markup)

# --- وظائف البوت ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id != OWNER_ID:
        await update.message.reply_text("❌ غير مصرح لك باستخدام هذا البوت.")
        return ConversationHandler.END

    context.user_data.clear()
    if "busy_servers" not in context.bot_data:
        context.bot_data["busy_servers"] = set()

    await update.message.reply_text(
        "🌟 عملتة ليكم البوت دا عشان يساعدكم تشدو في ارقامكم المحظورة ..\n"
        "كل الحقوق محفوظة لمكتب:\n🏛️ 𝐎𝐓𝐓𝐎² • اوتـــــو "
    )
    await show_server_menu(update, context)
    return GET_EMAIL

async def get_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    selected = update.message.text.strip()

    if selected == "التواصل مع المطور اوتـو🌹":
        await update.message.reply_text("📞 تواصل مع المطوّر عبر واتساب:\nwa.me/249126083647")
        return GET_EMAIL

    if selected == "🔙 رجوع":
        await show_server_menu(update, context)
        return GET_EMAIL

    if selected == "❌ إلغاء":
        await update.message.reply_text("❌ تم الإلغاء. ابدأ مجددًا بالأمر /start.")
        return ConversationHandler.END

    if "سيرفر" in selected:
        try:
            index = int(selected.split(" ")[1]) - 1
            if index in context.bot_data.get("busy_servers", set()):
                await update.message.reply_text("⚠️ السيرفر مشغول بانتظار الرد من واتساب.")
                return GET_EMAIL

            context.user_data["to_email"] = SUPPORT_EMAILS[index]
            context.user_data["server_index"] = index
            await update.message.reply_text("📝 أرسل عنوان الرسالة (الموضوع):")
            return GET_SUBJECT
        except:
            pass

    await update.message.reply_text("❌ اختيار غير صالح. أعد المحاولة.")
    return GET_EMAIL

async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("✉️ أرسل نص الرسالة:")
    return GET_BODY

async def get_body(update: Update, context: ContextTypes.DEFAULT_TYPE):
    to_email = context.user_data["to_email"]
    subject = context.user_data["subject"]
    body = update.message.text
    index = context.user_data.get("server_index")
    success = False

    for idx, acc in enumerate(ACCOUNTS):
        try:
            send_email(acc["email"], acc["password"], to_email, subject, body)
            await update.message.reply_text(f"✅ تم الإرسال من الحساب رقم {idx + 1}")
            success = True
        except Exception as e:
            await update.message.reply_text(f"❌ فشل من الحساب رقم {idx + 1}\n{str(e)}")

    if success and index is not None:
        context.bot_data["busy_servers"].add(index)
        await update.message.reply_text("📛 السيرفر الآن مشغول لحين وصول رد من واتساب.")

    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ تم الإلغاء.")
    return ConversationHandler.END

# --- تشغيل البوت بشكل آمن ---
async def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            GET_EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_email)],
            GET_SUBJECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_subject)],
            GET_BODY: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_body)],
        },
        fallbacks=[CommandHandler("cancel", cancel)]
    ))

    asyncio.create_task(check_emails_periodically(app))
    await app.run_polling()

if __name__ == "__main__":
    asyncio.run(main())
