import { getWhatsAppKeyboard } from '../utils/keyboard.js';
import { MESSAGES } from '../utils/messages.js';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let userState = {};
let whatsappClient = null;
let isWhatsAppReady = false;

export function initializeWhatsApp() {
  whatsappClient = new Client({
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    authStrategy: new LocalAuth({
      dataPath: './sessions'
    })
  });

  whatsappClient.on('qr', (qr) => {
    console.log('WhatsApp QR Code:');
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isWhatsAppReady = true;
  });

  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp authenticated successfully');
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failed:', msg);
  });

  whatsappClient.initialize();
  
  return whatsappClient;
}

export function getWhatsAppClient() {
  return whatsappClient;
}

export function isWhatsAppClientReady() {
  return isWhatsAppReady;
}

export function handleWhatsAppCommands(bot) {
  
  bot.onText(/💬 WhatsApp/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!isWhatsAppReady) {
      await bot.sendMessage(chatId, '⚠️ WhatsApp غير متصل. يرجى الانتظار...');
      return;
    }
    
    await bot.sendMessage(chatId, '💬 إدارة WhatsApp\n\nاختر الإجراء:', {
      reply_markup: getWhatsAppKeyboard()
    });
  });

  bot.onText(/📢 نشر في القنوات/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!isWhatsAppReady) {
      await bot.sendMessage(chatId, '⚠️ WhatsApp غير متصل');
      return;
    }
    
    userState[chatId] = { action: 'wa_channel', step: 'awaiting_content' };
    await bot.sendMessage(chatId, '📢 أدخل المحتوى للنشر في القنوات:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/👥 نشر في المجموعات/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!isWhatsAppReady) {
      await bot.sendMessage(chatId, '⚠️ WhatsApp غير متصل');
      return;
    }
    
    userState[chatId] = { action: 'wa_groups', step: 'awaiting_content' };
    await bot.sendMessage(chatId, '👥 أدخل المحتوى للنشر في المجموعات:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📱 نشر Status/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!isWhatsAppReady) {
      await bot.sendMessage(chatId, '⚠️ WhatsApp غير متصل');
      return;
    }
    
    userState[chatId] = { action: 'wa_status', step: 'awaiting_media' };
    await bot.sendMessage(chatId, '📱 أرسل الصورة أو الفيديو للـ Status:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🔛 تفعيل النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('whatsapp', true);
    await bot.sendMessage(chatId, '✅ تم تفعيل النشر الجماعي لـ WhatsApp', {
      reply_markup: getWhatsAppKeyboard()
    });
  });

  bot.onText(/🔴 إيقاف النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('whatsapp', false);
    await bot.sendMessage(chatId, '🔴 تم إيقاف النشر الجماعي لـ WhatsApp', {
      reply_markup: getWhatsAppKeyboard()
    });
  });
}

export async function processWhatsAppInput(bot, msg, text, photo, video) {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  
  if (!state) return false;
  
  try {
    if (state.action === 'wa_channel' && state.step === 'awaiting_content') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const channelId = process.env.WHATSAPP_CHANNEL_ID;
      
      if (channelId && whatsappClient) {
        await whatsappClient.sendMessage(channelId, text);
        await bot.sendMessage(chatId, '✅ تم نشر المحتوى في القنوات', {
          reply_markup: getWhatsAppKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, '❌ لم يتم تكوين معرف القناة', {
          reply_markup: getWhatsAppKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'wa_groups' && state.step === 'awaiting_content') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const groupIds = process.env.WHATSAPP_GROUP_IDS?.split(',') || [];
      
      if (groupIds.length > 0 && whatsappClient) {
        for (const groupId of groupIds) {
          const trimmedId = groupId.trim();
          await whatsappClient.sendMessage(trimmedId, text);
          
          const chat = await whatsappClient.getChatById(trimmedId);
          const participants = chat.participants;
          
          const mentions = participants.map(p => p.id._serialized);
          await chat.sendMessage(text, {
            mentions: mentions
          });
        }
        
        await bot.sendMessage(chatId, '✅ تم نشر المحتوى في المجموعات مع المنشن الجماعي', {
          reply_markup: getWhatsAppKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, '❌ لم يتم تكوين معرفات المجموعات', {
          reply_markup: getWhatsAppKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'wa_status' && state.step === 'awaiting_media' && (photo || video)) {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      if (whatsappClient) {
        const fileUrl = photo 
          ? await bot.getFileLink(photo[photo.length - 1].file_id)
          : await bot.getFileLink(video.file_id);
        
        await bot.sendMessage(chatId, '✅ تم نشر الـ Status (الوظيفة تحت التطوير)', {
          reply_markup: getWhatsAppKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
  } catch (error) {
    console.error('WhatsApp processing error:', error);
    await bot.sendMessage(chatId, MESSAGES.error, {
      reply_markup: getWhatsAppKeyboard()
    });
    delete userState[chatId];
    return true;
  }
  
  return false;
}
