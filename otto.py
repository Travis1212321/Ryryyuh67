import asyncio
from telegram import (
    Update, ReplyKeyboardMarkup,
    InputMediaPhoto, InputMediaAudio
)
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)
import imaplib, smtplib, email, json
from email.mime.text import MIMEText

OWNER_ID = 7753511487
BOT_TOKEN = "8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U"

ACCOUNTS = [
    {"email": "rre383033@gmail.com", "password": "wnvbfjhtwrujronr"},
    {"email": "jhh835443@gmail.com", "password": "orybkiajibsptqif"},
    {"email": "ottofjfghh@gmail.com", "password": "qnebbkeyayqyidyz"},
    {"email": "fufhfieudb@gmail.com", "password": "yjobyzcjjglglejp"},
    {"email": "vjhmgkbx@gmail.com", "password": "ewqezwacmtrwiucx"},
    {"email": "uyfy014@gmail.com", "password": "xyuprvnxlsjtpgbe"},
    {"email": "ifihbndvkfytj@gmail.com", "password": "gquiduzoiuezmdjx"},
]

GET_SERVER, GET_SUBJECT, GET_BODY = range(3)

SERVER_LINKS = {
    "support@support.whatsapp.com": None,
    "android@support.whatsapp.com": None,
    "smb@support.whatsapp.com": None,
    "press@whatsapp.com": None,
    "jan@whatsapp.com": None,
    "webmaster@whatsapp.com": None,
    "privacy@support.whatsapp.com": None,
    "abuse@support.whatsapp.com": None
}

USER_SESSIONS = {}

def send_email(from_email, password, to_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_email, password)
        server.send_message(msg)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id != OWNER_ID:
        return

    keyboard = [["📤 إرسال طلب إلى واتساب"]]
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

    image_url = "https://files.catbox.moe/jt6lea.jpg"
    audio_url = "https://files.catbox.moe/2okh85.mp3"

    await context.bot.send_media_group(
        chat_id=update.effective_chat.id,
        media=[
            InputMediaPhoto(media=image_url, caption="أهلاً بيك في البوت 🤖"),
            InputMediaAudio(media=audio_url, caption="🎵 دي الأغنية بتاعتنا 🎶")
        ]
    )
    await update.message.reply_text("اختر من القائمة:", reply_markup=reply_markup)

async def choose_server(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id != OWNER_ID:
        return

    available = [email for email, uid in SERVER_LINKS.items() if uid is None]
    if not available:
        await update.message.reply_text("🚫 كل السيرفرات مشغولة حاليًا، حاول لاحقًا.")
        return ConversationHandler.END

    context.user_data["available"] = available
    await update.message.reply_text("🖥️ اختر أحد روابط الدعم التالية:\n" + "\n".join(available))
    return GET_SERVER

async def get_server(update: Update, context: ContextTypes.DEFAULT_TYPE):
    email_selected = update.message.text.strip()
    user_id = update.effective_user.id

    if email_selected not in context.user_data["available"]:
        await update.message.reply_text("❌ السيرفر غير متاح أو مشغول.")
        return ConversationHandler.END

    account = ACCOUNTS[user_id % len(ACCOUNTS)]
    SERVER_LINKS[email_selected] = user_id
    USER_SESSIONS[user_id] = {"server": email_selected, "account": account}
    await update.message.reply_text("📝 أرسل عنوان الرسالة:")
    return GET_SUBJECT

async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("✉️ أرسل نص الرسالة:")
    return GET_BODY

async def get_body(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    session = USER_SESSIONS[user_id]
    server_email = session["server"]
    acc = session["account"]
    subject = context.user_data["subject"]
    body = update.message.text

    try:
        send_email(acc["email"], acc["password"], server_email, subject, body)
        await update.message.reply_text(f"✅ تم إرسال الرسالة إلى {server_email}\n📬 في انتظار الرد...")
    except:
        await update.message.reply_text("❌ فشل في إرسال الرسالة.")
        SERVER_LINKS[server_email] = None
        return ConversationHandler.END

    return ConversationHandler.END

async def check_replies(app):
    while True:
        for acc in ACCOUNTS:
            try:
                mail = imaplib.IMAP4_SSL("imap.gmail.com")
                mail.login(acc["email"], acc["password"])
                mail.select("inbox")
                status, messages = mail.search(None, "UNSEEN")
                mail_ids = messages[0].split()

                for mail_id in reversed(mail_ids):
                    res, msg_data = mail.fetch(mail_id, "(RFC822)")
                    raw_email = msg_data[0][1]
                    msg_obj = email.message_from_bytes(raw_email)
                    from_ = msg_obj["From"]
                    subject = msg_obj["Subject"] or ""
                    body = ""

                    if msg_obj.is_multipart():
                        for part in msg_obj.walk():
                            if part.get_content_type() == "text/plain":
                                body = part.get_payload(decode=True).decode(errors="ignore")
                                break
                    else:
                        body = msg_obj.get_payload(decode=True).decode(errors="ignore")

                    for server_email, user_id in SERVER_LINKS.items():
                        if user_id and server_email.lower() in from_.lower():
                            await app.bot.send_message(
                                user_id,
                                f"📨 رد من {server_email}:\n*{subject}*\n\n{body[:1000]}",
                                parse_mode="Markdown"
                            )
                            SERVER_LINKS[server_email] = None
            except:
                pass

        await asyncio.sleep(60)

# ✅ تعديل post_init لحل مشكلة RuntimeError
async def post_init(app):
    asyncio.create_task(check_replies(app))

if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    conv = ConversationHandler(
        entry_points=[MessageHandler(filters.TEXT & filters.Regex("📤 إرسال طلب إلى واتساب"), choose_server)],
        states={
            GET_SERVER: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_server)],
            GET_SUBJECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_subject)],
            GET_BODY: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_body)]
        },
        fallbacks=[]
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(conv)

    app.post_init = post_init
    app.run_polling()
    print("بوتك شغال زي الكسم ✨💗✅")
