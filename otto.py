import os
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)
import smtplib
from email.mime.text import MIMEText

# --- معلومات أساسية ---
OWNER_ID = 7753511487
BOT_TOKEN = "8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U"

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

# --- جميع إيميلات دعم واتساب ---
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

# --- دالة الإرسال ---
def send_email(from_email, password, to_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_email, password)
        server.send_message(msg)

# --- دالة البدء ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id != OWNER_ID:
        await update.message.reply_text("❌ غير مصرح لك باستخدام هذا البوت.")
        return ConversationHandler.END

    # رسالة ترحيبية
    await update.message.reply_text(
        "🌟 عملتة ليكم البوت دا عشان يساعدكم تشدو في ارقامكم المحظورة ..\n"
        "كل الحقوق محفوظة لمكتب:\n"
        "🏛️ 𝐎𝐓𝐓𝐎² • اوتـــــو"
               )
    # أزرار السيرفرات + زر المطور
    buttons = []
    row = []
    for i in range(len(SUPPORT_EMAILS)):
        row.append(KeyboardButton(f"🔥 سيرفر {i + 1} 🌹"))
        if len(row) == 3:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    buttons.append([KeyboardButton("👑 المطوّر")])

    reply_markup = ReplyKeyboardMarkup(buttons, resize_keyboard=True)
    await update.message.reply_text("📨 اختر السيرفر المراد الإرسال إليه:", reply_markup=reply_markup)
    return GET_EMAIL

# --- اختيار السيرفر أو المطور ---
async def get_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    selected = update.message.text.strip()

    # زر المطوّر
    if "المطوّر" in selected:
        await update.message.reply_text("👑 هذا البوت تم تطويره بواسطة مكتب 𝐎𝐓𝐓𝐎² • اوتـــــو 󱢏")
        return GET_EMAIL

    # زر السيرفر
    if "سيرفر" in selected:
        for i in range(1, len(SUPPORT_EMAILS) + 1):
            if f"سيرفر {i}" in selected:
                context.user_data["to_email"] = SUPPORT_EMAILS[i - 1]
                await update.message.reply_text("📝 أرسل عنوان الرسالة (الموضوع):")
                return GET_SUBJECT

    await update.message.reply_text("❌ اختيار غير صالح. أعد المحاولة.")
    return GET_EMAIL

# --- الموضوع ---
async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("✉️ أرسل نص الرسالة:")
    return GET_BODY

# --- الرسالة ---
async def get_body(update: Update, context: ContextTypes.DEFAULT_TYPE):
    to_email = context.user_data["to_email"]
    subject = context.user_data["subject"]
    body = update.message.text

    for idx, acc in enumerate(ACCOUNTS):
        try:
            send_email(acc["email"], acc["password"], to_email, subject, body)
            await update.message.reply_text(f"✅ تم الإرسال من الحساب رقم {idx + 1}")
        except Exception as e:
            await update.message.reply_text(f"❌ فشل في الإرسال من الحساب رقم {idx + 1}\n{str(e)}")

    return ConversationHandler.END

# --- إلغاء ---
async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ تم الإلغاء.")
    return ConversationHandler.END

# --- تشغيل البوت ---
if __name__ == "__main__":
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

    app.run_polling()
