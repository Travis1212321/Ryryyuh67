from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)
import json, imaplib, smtplib
from email.mime.text import MIMEText

OWNER_ID = 7753511487 # <-- غيّر دا للـ Telegram ID بتاعك
BOT_TOKEN = "8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U"  # <-- غيّر دا لتوكن البوت

GET_EMAIL, GET_SUBJECT, GET_BODY = range(3)

def load_bot_accounts():
    with open("accounts.json", "r") as f:
        return json.load(f)

def save_bot_accounts(accounts):
    with open("accounts.json", "w") as f:
        json.dump(accounts, f, indent=4)

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
        keyboard = [
            ["➕ إضافة حساب"],
            ["📥 استلام من الكل", "📤 إرسال من الكل"]
        ]

    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    await update.message.reply_text("أهلاً بيك في البوت 🤖", reply_markup=reply_markup)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    msg = update.message.text

    if msg == "➕ إضافة حساب":
        if user_id != OWNER_ID:
            await update.message.reply_text("🚫 ما مسموح ليك.")
            return
        await update.message.reply_text("أرسل الإيميل وكلمة السر بصيغة:\n`email:password`", parse_mode="Markdown")
        return

    if ":" in msg and user_id == OWNER_ID:
        try:
            email_, password_ = msg.split(":", 1)
            accounts = load_bot_accounts()
            accounts.append({"email": email_.strip(), "password": password_.strip()})
            save_bot_accounts(accounts)
            await update.message.reply_text(f"✅ تم إضافة الحساب: {email_}")
        except Exception as e:
            await update.message.reply_text(f"❌ فشل: {e}")

    elif msg == "📥 استلام من الكل" and user_id == OWNER_ID:
        await update.message.reply_text("🔄 جاري التحقق من الإيميلات...")
        accounts = load_bot_accounts()
        for acc in accounts:
            try:
                mail = imaplib.IMAP4_SSL("imap.gmail.com")
                mail.login(acc["email"], acc["password"])
                mail.select("inbox")
                status, messages = mail.search(None, "ALL")
                count = len(messages[0].split())
                await update.message.reply_text(f"{acc['email']} فيه {count} رسالة.")
                mail.logout()
            except Exception as e:
                await update.message.reply_text(f"❌ خطأ مع {acc['email']}: {e}")

    elif msg == "📤 إرسال من الكل" and user_id == OWNER_ID:
        await update.message.reply_text("📨 أرسل البريد المراد الإرسال إليه:")
        return GET_EMAIL

async def get_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["to_email"] = update.message.text
    await update.message.reply_text("📝 أرسل عنوان الرسالة (الموضوع):")
    return GET_SUBJECT

async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("✉️ أرسل نص الرسالة:")
    return GET_BODY

async def get_body(update: Update, context: ContextTypes.DEFAULT_TYPE):
    to_email = context.user_data["to_email"]
    subject = context.user_data["subject"]
    body = update.message.text

    accounts = load_bot_accounts()
    for acc in accounts:
        try:
            send_email(acc["email"], acc["password"], to_email, subject, body)
            await update.message.reply_text(f"✅ تم الإرسال من {acc['email']}")
        except Exception as e:
            await update.message.reply_text(f"❌ فشل من {acc['email']}: {e}")

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
            GET_EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_email)],
            GET_SUBJECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_subject)],
            GET_BODY: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_body)],
        },
        fallbacks=[CommandHandler("cancel", cancel)]
    ))

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    app.run_polling()
