import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { getMainKeyboard } from './utils/keyboard.js';
import { MESSAGES } from './utils/messages.js';
import { initializeScheduler } from './services/scheduler.js';
import { handleFacebookCommands, processFacebookInput } from './commands/facebook.js';
import { handleInstagramCommands, processInstagramInput } from './commands/instagram.js';
import { handleWhatsAppCommands, processWhatsAppInput, initializeWhatsApp } from './commands/whatsapp.js';
import { handleTelegramCommands, processTelegramInput, setBotInstance } from './commands/telegram.js';
import { handleSettingsCommands, processSettingsInput } from './commands/settings.js';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

let isInitialized = false;

async function initializeBot() {
  if (isInitialized) return;
  
  console.log('🚀 Starting Social Media Management Bot...');
  
  try {
    await initializeScheduler();
    console.log('✅ Scheduler initialized');
    
    if (process.env.WHATSAPP_ENABLED === 'true') {
      try {
        console.log('📱 Initializing WhatsApp...');
        initializeWhatsApp();
      } catch (error) {
        console.log('⚠️ WhatsApp initialization skipped (requires additional system dependencies)');
      }
    }
    
    setBotInstance(bot);
    
    handleFacebookCommands(bot);
    handleInstagramCommands(bot);
    handleWhatsAppCommands(bot);
    handleTelegramCommands(bot);
    handleSettingsCommands(bot);
    
    isInitialized = true;
    console.log('✅ All modules loaded successfully');
    console.log('🤖 Bot is running...');
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (ADMIN_TELEGRAM_ID && chatId.toString() !== ADMIN_TELEGRAM_ID) {
    await bot.sendMessage(chatId, MESSAGES.unauthorized);
    return;
  }
  
  await bot.sendMessage(chatId, MESSAGES.welcome, {
    reply_markup: getMainKeyboard(),
    parse_mode: 'HTML'
  });
});

bot.on('message', async (msg) => {
  if (!msg.text && !msg.photo && !msg.video) return;
  
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption || '';
  const photo = msg.photo;
  const video = msg.video;
  
  if (text.startsWith('/')) return;
  
  try {
    const processed = 
      await processFacebookInput(bot, msg, text, photo, video) ||
      await processInstagramInput(bot, msg, text, photo, video) ||
      await processWhatsAppInput(bot, msg, text, photo, video) ||
      await processTelegramInput(bot, msg, text, photo, video) ||
      await processSettingsInput(bot, msg, text);
    
    if (!processed && text && !isCommandButton(text)) {
    }
    
  } catch (error) {
    console.error('Message processing error:', error);
    await bot.sendMessage(chatId, MESSAGES.error, {
      reply_markup: getMainKeyboard()
    });
  }
});

function isCommandButton(text) {
  const buttons = [
    '📘 Facebook', '📸 Instagram', '💬 WhatsApp', '✈️ Telegram',
    '📅 الجدولة', '⚙️ الإعدادات', '📊 الإحصائيات', '🔄 النشر التلقائي',
    '💡 اقتراحات', '🐛 أخطاء', '📝 ملاحظات', '🔙 رجوع للقائمة الرئيسية'
  ];
  return buttons.includes(text);
}

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

initializeBot();
