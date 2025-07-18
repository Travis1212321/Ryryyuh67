from telegram import (
    Update, ReplyKeyboardMarkup,
    InputMediaPhoto, InputMediaAudio
)
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)
import imaplib, smtplib, email
from email.mime.text import MIMEText

OWNER_ID = 7753511487
BOT_TOKEN = "8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U"

GET_SUBJECT, GET_BODY = range(2)

ACCOUNTS = [
    {"email": "rekardo647@gmail.com", "password": "ntfersdmsxtivceg"},
    {"email": "waadaltom674@gmail.com", "password": "bglqqfvrybxotmdf"},
    {"email": "rre383033@gmail.com", "password": "wnvbfjhtwrujronr"},
    {"email": "jhh835443@gmail.com", "password": "orybkiajibsptqif"},
    {"email": "ottofjfghh@gmail.com", "password": "qnebbkeyayqyidyz"},
    {"email": "fufhfieudb@gmail.com", "password": "yjobyzcjjglglejp"},
    {"email": "vjhmgkbx@gmail.com", "password": "ewqezwacmtrwiucx"},
    {"email": "uyfy014@gmail.com", "password": "xyuprvnxlsjtpgbe"},
    {"email": "ifihbndvkfytj@gmail.com", "password": "gquiduzoiuezmdjx"},
]

TO_EMAILS = [
    "support@support.whatsapp.com",
    "android@support.whatsapp.com",
    "smb@support.whatsapp.com",
    "android_web@support.whatsapp.com",
    "jan@whatsapp.com",
    "press@whatsapp.com"
]

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
    keyboard = []

    if user_id == OWNER_ID:
        keyboard = [["📥 استلام من الكل", "📤 إرسال من الكل"]]

    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

    image_url = "https://files.catbox.moe/jt6lea.jpg"
    audio_url = "https://files.catbox.moe/2okh85.mp3"

    await context.bot.send_media_group(
        chat_id=update.effective_chat.id,
        media=[
            InputMediaPhoto(media=image_url, caption="أهلاً بيك في البوت 🤖"),
            InputMediaAudio(media=audio_url, caption="🎵 دي الأغنية بتاعتنا 🎶"),
        ]
    )

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="اختر من القائمة:",
        reply_markup=reply_markup
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    msg = update.message.text

    if msg == "📥 استلام من الكل" and user_id == OWNER_ID:
        await update.message.reply_text("🔄 جاري التحقق من رسائل واتساب فقط...")
        for idx, acc in enumerate(ACCOUNTS):
            try:
                mail = imaplib.IMAP4_SSL("imap.gmail.com")
                mail.login(acc["email"], acc["password"])
                mail.select("inbox")

                status, messages = mail.search(None, "ALL")
                mail_ids = messages[0].split()
                count = 0

                for mail_id in reversed(mail_ids[-20:]):
                    res, msg_data = mail.fetch(mail_id, "(RFC822)")
                    raw_email = msg_data[0][1]
                    msg_obj = email.message_from_bytes(raw_email)

                    from_ = msg_obj["From"] or ""
                    subject = msg_obj["Subject"] or ""
                    body = ""

                    if msg_obj.is_multipart():
                        for part in msg_obj.walk():
                            if part.get_content_type() == "text/plain":
                                body = part.get_payload(decode=True).decode(errors="ignore")
                                break
                    else:
                        body = msg_obj.get_payload(decode=True).decode(errors="ignore")

                    is_whatsapp_sender = any(w in from_.lower() for w in [
                        "support.whatsapp.com", "messaging-support@whatsapp.com"
                    ])

                    has_verification_code = (
                        "رمز" in body or "code" in body.lower() or
                        any(len(word) == 6 and word.isdigit() for word in body.split())
                    )

                    if is_whatsapp_sender and not has_verification_code:
                        count += 1
                        await update.message.reply_text(
                            f"📨 من فريق واتساب:\n*{subject}*\n\n{body[:1000]}",
                            parse_mode="Markdown"
                        )

                await update.message.reply_text(f"📥 الحساب رقم {idx + 1} فيه {count} رسالة من واتساب.")
                mail.logout()
            except Exception:
                await update.message.reply_text(f"❌ فشل في التحقق من الحساب رقم {idx + 1}")

    elif msg == "📤 إرسال من الكل" and user_id == OWNER_ID:
        await update.message.reply_text(
            "✉️ سيتم الإرسال إلى هذه العناوين:\n" + "\n".join(TO_EMAILS) +
            "\n\n📝 أرسل عنوان الرسالة (الموضوع):"
        )
        return GET_SUBJECT

async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("✉️ أرسل نص الرسالة:")
    return GET_BODY

async def get_body(update: Update, context: ContextTypes.DEFAULT_TYPE):
    subject = context.user_data["subject"]
    body = update.message.text

    for idx, acc in enumerate(ACCOUNTS):
        for to_email in TO_EMAILS:
            try:
                send_email(acc["email"], acc["password"], to_email, subject, body)
                await update.message.reply_text(f"✅ تم الإرسال إلى {to_email} من الحساب رقم {idx + 1}")
            except Exception:
                await update.message.reply_text(f"❌ فشل الإرسال إلى {to_email} من الحساب رقم {idx + 1}")

    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ تم الإلغاء.")
    return ConversationHandler.END

if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))

    app.add_handler(ConversationHandler(
        entry_points=[MessageHandler(filters.TEXT & filters.Regex("📤 إرسال من الكل"), handle_message)],
        states={
            GET_SUBJECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_subject)],
            GET_BODY: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_body)],
        },
        fallbacks=[CommandHandler("cancel", cancel)]
    ))

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    app.run_polling()
