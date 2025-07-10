from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ConversationHandler, ContextTypes
)
import json, os, smtplib, imaplib, email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.header import decode_header
from email import encoders
from crypto_utils import generate_key, encrypt_password, decrypt_password

generate_key()

temp_data = {}
send_temp_data = {}

ASK_EMAIL, ASK_PASSWORD = range(2)
TO_EMAIL_ONE, SUBJECT_ONE, BODY_ONE = range(3, 6)
TO_EMAIL_ALL, SUBJECT_ALL, BODY_ALL = range(6, 9)
CHOOSE_DELETE = 9

welcome_text = """👋 مرحباً بك في بوت الإيميلات

🔐 تأكد إن معلوماتك بأمان، كلمات السر بنخزنها بشكل مشفر.

📌 الأوامر المتاحة:
- ربط حساب Gmail
- 📂 حساباتي
- ❌ حذف حساب
- 📥 استلام
- 📥 استلام من الكل
- 📤 إرسال
- 📤 إرسال من الكل
- 📞 تواصل مع المطور
- مرفق؟ فقط أرسل الملف أو الصورة

📎 البوت مصمم لتسهيل إدارة الإيميلات، ونحاول دايماً نطوّرو بشكل أفضل."""

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await context.bot.send_photo(chat_id=chat_id, photo="https://files.catbox.moe/jt6lea.jpg")
    await context.bot.send_audio(chat_id=chat_id, audio="https://files.catbox.moe/2okh85.mp3")
    await context.bot.send_message(chat_id=chat_id, text=welcome_text)
    await inbox_menu(update, context)

async def inbox_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        ["📥 استلام", "📥 استلام من الكل"],
        ["📤 إرسال", "📤 إرسال من الكل"],
        ["📂 حساباتي", "❌ حذف حساب"],
        ["📞 تواصل مع المطور"],
        ["🔗 ربط حساب"]
    ]
    markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    await update.message.reply_text("اختر خيار من القائمة يا دباب:", reply_markup=markup)

async def link_account(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📨 أرسل إيميل Gmail بتاعك يا دباب:")
    return ASK_EMAIL

async def ask_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    temp_data[update.effective_user.id] = {"email": update.message.text}
    await update.message.reply_text("🔐 أرسل كلمة المرور يا دباب:")
    return ASK_PASSWORD

async def ask_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    email_ = temp_data[update.effective_user.id]["email"]
    encrypted = encrypt_password(update.message.text)

    if not os.path.exists("users.json"):
        with open("users.json", "w") as f:
            json.dump({}, f)

    with open("users.json") as f:
        data = json.load(f)

    if user_id not in data:
        data[user_id] = []

    data[user_id].append({"email": email_, "password": encrypted})

    with open("users.json", "w") as f:
        json.dump(data, f, indent=2)

    await update.message.reply_text(f"✅ تم ربط الحساب {email_} بنجاح يا دباب.")
    return ConversationHandler.END

def get_last_emails(email_user, encrypted_password, limit=5):
    try:
        password = decrypt_password(encrypted_password)
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(email_user, password)
        mail.select("inbox")
        _, msgnums = mail.search(None, "ALL")
        ids = msgnums[0].split()[-limit:]
        messages = []
        for msg_id in ids[::-1]:
            _, msg_data = mail.fetch(msg_id, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            subject = decode_header(msg["subject"])[0][0]
            if isinstance(subject, bytes):
                subject = subject.decode()
            from_ = msg["from"]
            messages.append(f"📩 {subject}\n👤 {from_}")
        mail.logout()
        return messages
    except Exception as e:
        return [f"❌ خطأ في استلام البريد:\n{e}"]

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    text = update.message.text

    if not os.path.exists("users.json"):
        with open("users.json", "w") as f:
            json.dump({}, f)

    with open("users.json") as f:
        data = json.load(f)

    if text == "📥 استلام":
        if user_id not in data or not data[user_id]:
            await update.message.reply_text("❗ يا دباب، ما عندك حساب مربوط.")
            return
        acc = data[user_id][0]
        msgs = get_last_emails(acc["email"], acc["password"])
        await update.message.reply_text("\n\n".join(msgs[:5]))

    elif text == "📥 استلام من الكل":
        if user_id not in data:
            await update.message.reply_text("❗ يا دباب، ما عندك أي حسابات.")
            return
        result = ""
        for acc in data[user_id]:
            msgs = get_last_emails(acc["email"], acc["password"], limit=1)
            result += f"\n📬 {acc['email']}\n{msgs[0]}\n"
        await update.message.reply_text(result or "📭 ما في أي رسائل حالياً يا دباب.")

    elif text == "📞 تواصل مع المطور":
        await update.message.reply_text("💬 للتواصل مع المطور يا دباب:\n🔗 https://wa.me/+249126083647?text=السلام%20عليكم،%20داير%20مساعدة%20في%20البوت")

    elif text == "🔗 ربط حساب":
        await link_account(update, context)

    elif text == "📂 حساباتي":
        if user_id not in data or not data[user_id]:
            await update.message.reply_text("📭 ما عندك حسابات محفوظة يا دباب.")
        else:
            emails = [acc["email"] for acc in data[user_id]]
            await update.message.reply_text("📂 حساباتك:\n" + "\n".join(emails))

    elif text == "❌ حذف حساب":
        if user_id in data:
            del data[user_id]
            with open("users.json", "w") as f:
                json.dump(data, f, indent=2)
            await update.message.reply_text("✅ تم حذف حساباتك يا دباب.")
        else:
            await update.message.reply_text("📭 ما عندك أي حسابات يا دباب.")

# تشغيل البوت
app = ApplicationBuilder().token("8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U").build()

app.add_handler(CommandHandler("start", start))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

# إذا عندك ConversationHandler لربط الحساب
conv_handler = ConversationHandler(
    entry_points=[MessageHandler(filters.Regex("🔗 ربط حساب"), link_account)],
    states={
        ASK_EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_email)],
        ASK_PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_password)],
    },
    fallbacks=[]
)

app.add_handler(conv_handler)
app.run_polling()