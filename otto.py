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

# --- Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø£Ø³Ø§Ø³ÙŠØ© ---
OWNER_ID = 7753511487
BOT_TOKEN = "8117880248:AAHWSYLfnbSlnO0UlVBlGJmmpCoH_Z_1O9U"

GET_EMAIL, GET_SUBJECT, GET_BODY = range(3)

# --- Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© Ù„Ù„Ø¥Ø±Ø³Ø§Ù„ ---
ACCOUNTS = [
    {"email": "rre383033@gmail.com", "password": "wnvbfjhtwrujronr"},
    {"email": "jhh835443@gmail.com", "password": "orybkiajibsptqif"},
    {"email": "ottofjfghh@gmail.com", "password": "qnebbkeyayqyidyz"},
    {"email": "fufhfieudb@gmail.com", "password": "yjobyzcjjglglejp"},
    {"email": "vjhmgkbx@gmail.com", "password": "ewqezwacmtrwiucx"},
    {"email": "uyfy014@gmail.com", "password": "xyuprvnxlsjtpgbe"},
    {"email": "ifihbndvkfytj@gmail.com", "password": "gquiduzoiuezmdjx"},
]

# --- Ø¥ÙŠÙ…ÙŠÙ„Ø§Øª Ø¯Ø¹Ù… ÙˆØ§ØªØ³Ø§Ø¨ ---
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

# --- ØªØªØ¨Ø¹ Ø§Ù„Ø±Ø¯ÙˆØ¯ ---
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

# --- ÙØ­Øµ Ø§Ù„Ø¨Ø±ÙŠØ¯ ÙƒÙ„ Ø¯Ù‚ÙŠÙ‚Ø© ---
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
                    if last_seen_uid is None or msg_id > last_seen_uid:
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
                                    f"\nðŸ“¬ *ÙˆØµÙ„ Ø±Ø¯ Ø¬Ø¯ÙŠØ¯ Ù…Ù† ÙˆØ§ØªØ³Ø§Ø¨*\n"
                                    f"ðŸ”¢ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø±Ù‚Ù…: {idx + 1}\n"
                                    f"âœ‰ï¸ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹: {subject}\n\n"
                                    f"ðŸ“¨ Ø§Ù„Ø±Ø³Ø§Ù„Ø©:\n{body[:2000]}"
                                ),
                                parse_mode="Markdown"
                            )

                            last_uids[acc["email"]] = new_msg_id

                imap.logout()

            except Exception as e:
                print(f"ðŸ“‹ Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¨Ø±ÙŠØ¯ {acc['email']}: {e}")

        await asyncio.sleep(60)

# --- Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ ---
def send_email(from_email, password, to_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_email, password)
        server.send_message(msg)

# --- Ø¹Ø±Ø¶ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø³ÙŠØ±ÙØ±Ø§Øª ---
async def show_server_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    buttons = []
    row = []
    busy_servers = context.bot_data.get("busy_servers", set())

    for i in range(len(SUPPORT_EMAILS)):
        if i not in busy_servers:
            row.append(KeyboardButton(f"ðŸ”¥ Ø³ÙŠØ±ÙØ± {i + 1} ðŸŒ¹"))
            if len(row) == 3:
                buttons.append(row)
                row = []
    if row:
        buttons.append(row)

    buttons.append([KeyboardButton("ðŸ‘‘ Ø§Ù„Ù…Ø·ÙˆÙ‘Ø±")])
    buttons.append([KeyboardButton("ðŸ”™ Ø±Ø¬ÙˆØ¹"), KeyboardButton("âŒ Ø¥Ù„ØºØ§Ø¡")])

    reply_markup = ReplyKeyboardMarkup(buttons, resize_keyboard=True)
    await update.message.reply_text("ðŸ“¨ Ø§Ø®ØªØ± Ø§Ù„Ø³ÙŠØ±ÙØ± Ø§Ù„Ù…Ø±Ø§Ø¯ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¥Ù„ÙŠÙ‡:", reply_markup=reply_markup)

# --- ÙˆØ¸Ø§Ø¦Ù Ø§Ù„Ø¨ÙˆØª ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id != OWNER_ID:
        await update.message.reply_text("âŒ ØºÙŠØ± Ù…ØµØ±Ø­ Ù„Ùƒ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù‡Ø°Ø§ Ø§Ù„Ø¨ÙˆØª.")
        return ConversationHandler.END

    context.user_data.clear()
    if "busy_servers" not in context.bot_data:
        context.bot_data["busy_servers"] = set()

    await update.message.reply_text(
        "ðŸŒŸ Ø¹Ù…Ù„ØªØ© Ù„ÙŠÙƒÙ… Ø§Ù„Ø¨ÙˆØª Ø¯Ø§ Ø¹Ø´Ø§Ù† ÙŠØ³Ø§Ø¹Ø¯ÙƒÙ… ØªØ´Ø¯Ùˆ ÙÙŠ Ø§Ø±Ù‚Ø§Ù…ÙƒÙ… Ø§Ù„Ù…Ø­Ø¸ÙˆØ±Ø© ..\n"
        "ÙƒÙ„ Ø§Ù„Ø­Ù‚ÙˆÙ‚ Ù…Ø­ÙÙˆØ¸Ø© Ù„Ù…ÙƒØªØ¨:\nðŸ›ï¸ ð˜ð“ð“ð â€¢ Ø§ÙˆØªÙ€Ù€Ù€Ù€Ù€Ùˆ ðŸ”"
    )
    await show_server_menu(update, context)
    return GET_EMAIL

async def get_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    selected = update.message.text.strip()

    if selected == "ðŸ‘‘ Ø§Ù„Ù…Ø·ÙˆÙ‘Ø±":
        await update.message.reply_text("ðŸ“ž ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ù…Ø·ÙˆÙ‘Ø± Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨:\nhttps://wa.me/201234567890")
        return GET_EMAIL

    if selected == "ðŸ”™ Ø±Ø¬ÙˆØ¹":
        await show_server_menu(update, context)
        return GET_EMAIL

    if selected == "âŒ Ø¥Ù„ØºØ§Ø¡":
        await update.message.reply_text("âŒ ØªÙ… Ø§Ù„Ø¥Ù„ØºØ§Ø¡. Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø¯Ø¯Ù‹Ø§ Ø¨Ø§Ù„Ø£Ù…Ø± /start.")
        return ConversationHandler.END

    if selected.startswith("ðŸ”¥ Ø³ÙŠØ±ÙØ±") and selected.endswith("ðŸŒ¹"):
        try:
            number = selected.replace("ðŸ”¥ Ø³ÙŠØ±ÙØ±", "").replace("ðŸŒ¹", "").strip()
            index = int(number) - 1

            if index in context.bot_data.get("busy_servers", set()):
                await update.message.reply_text("âš ï¸ Ø§Ù„Ø³ÙŠØ±ÙØ± Ù…Ø´ØºÙˆÙ„ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø±Ø¯ Ù…Ù† ÙˆØ§ØªØ³Ø§Ø¨.")
                return GET_EMAIL

            context.user_data["to_email"] = SUPPORT_EMAILS[index]
            context.user_data["server_index"] = index
            await update.message.reply_text("ðŸ“ Ø£Ø±Ø³Ù„ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø±Ø³Ø§Ù„Ø© (Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹):")
            return GET_SUBJECT

        except Exception as e:
            await update.message.reply_text("âŒ Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø³ÙŠØ±ÙØ±.")
            return GET_EMAIL

    await update.message.reply_text("âŒ Ø§Ø®ØªÙŠØ§Ø± ØºÙŠØ± ØµØ§Ù„Ø­. Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©.")
    return GET_EMAIL

async def get_subject(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["subject"] = update.message.text
    await update.message.reply_text("âœ‰ï¸ Ø£Ø±Ø³Ù„ Ù†Øµ Ø§Ù„Ø±Ø³Ø§Ù„Ø©:")
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
            await update.message.reply_text(f"âœ… ØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ù…Ù† Ø§Ù„Ø­Ø³Ø§Ø¨ Ø±Ù‚Ù… {idx + 1}")
            success = True
        except Exception as e:
            await update.message.reply_text(f"âŒ ÙØ´Ù„ Ù…Ù† Ø§Ù„Ø­Ø³Ø§Ø¨ Ø±Ù‚Ù… {idx + 1}\n{str(e)}")

    if success and index is not None:
        context.bot_data["busy_servers"].add(index)
        await update.message.reply_text("ðŸ“‹ Ø§Ù„Ø³ÙŠØ±ÙØ± Ø§Ù„Ø¢Ù† Ù…Ø´ØºÙˆÙ„ Ù„Ø­ÙŠÙ† ÙˆØµÙˆÙ„ Ø±Ø¯ Ù…Ù† ÙˆØ§ØªØ³Ø§Ø¨.")

    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("âŒ ØªÙ… Ø§Ù„Ø¥Ù„ØºØ§Ø¡.")
    return ConversationHandler.END

# --- ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¨ÙˆØª ---
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
    import nest_asyncio
    nest_asyncio.apply()
    asyncio.get_event_loop().run_until_complete(main())
