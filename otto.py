from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)
import smtplib
from email.mime.text import MIMEText

# بيانات البوت
OWNER_ID = 7753511487
BOT_TOKEN = "8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U"

# المراحل بتاعت المحادثة
GET_EMAIL, GET_SUBJECT, GET_BODY = range(3)

# الحسابات المرسلة
ACCOUNTS = [
    {"email": "rre383033@gmail.com", "password": "wnvbfjhtwrujronr"},
    {"email": "jhh835443@gmail.com", "password": "orybkiajibsptqif"},
    {"email": "ottofjfghh@gmail.com", "password": "qnebbkeyayqyidyz"},
    {"email": "fufhfieudb@gmail.com", "password": "yjobyzcjjglglejp"},
    {"email": "vjhmgkbx@gmail.com", "password": "ewqezwacmtrwiucx"},
    {"email": "uyfy014@gmail.com", "password": "xyuprvnxlsjtpgbe"},
    {"email": "ifihbndvkfytj@gmail.com", "password": "gquiduzoiuezmdjx"},
]

# دالة الإرسال عبر SMTP
def send_email(from_email, password, to_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_email, password)
        server.send_message(msg)

# دالة /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    keyboard = [["📤 إرسال من الكل"]] if user_id == OWNER_ID else []
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    
    await update.message.reply_text("مرحب بيك في البوت! 👋", reply_markup=reply_markup)

# أول خطوة في الإرسال
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    msg = update.message.text

    if msg == "📤 إرسال من الكل" and user_id == OWNER_ID:
        await update.message.reply_text("📨 أرسل البريد المراد الإرسال إليه:")
        return GET_EMAIL

# استلام البريد
async def get_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["to_email"] = update.message.text
    await update.message.reply_text("📝 أرسل عنوان الرسالة (الموضوع):")
    return GET_SUBJECT

# استلام الموضوع
async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("✉️ أرسل نص الرسالة:")
    return GET_BODY

# استلام الجسم وإرسال الرسالة
async def get_body(update: Update, context: ContextTypes.DEFAULT_TYPE):
    to_email = context.user_data["to_email"]
    subject = context.user_data["subject"]
    body = update.message.text

    for idx, acc in enumerate(ACCOUNTS):
        try:
            send_email(acc["email"], acc["password"], to_email, subject, body)
            await update.message.reply_text(f"✅ تم الإرسال من الحساب رقم {idx + 1}")
        except Exception as e:
            await update.message.reply_text(f"❌ فشل من الحساب رقم {idx + 1}\n{e}")

    return ConversationHandler.END

# إلغاء
async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ تم الإلغاء.")
    return ConversationHandler.END

# التشغيل
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
