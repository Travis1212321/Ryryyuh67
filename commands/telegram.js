import { getTelegramKeyboard } from '../utils/keyboard.js';
import { MESSAGES } from '../utils/messages.js';

let userState = {};
let botInstance = null;

export function setBotInstance(bot) {
  botInstance = bot;
}

export function handleTelegramCommands(bot) {
  
  bot.onText(/✈️ Telegram/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '✈️ إدارة Telegram\n\nاختر الإجراء:', {
      reply_markup: getTelegramKeyboard()
    });
  });

  bot.onText(/📢 نشر في القناة/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'tg_channel', step: 'awaiting_content' };
    await bot.sendMessage(chatId, '📢 أدخل المحتوى للنشر في القناة:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/👥 نشر في المجموعة/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'tg_group', step: 'awaiting_content' };
    await bot.sendMessage(chatId, '👥 أدخل المحتوى للنشر في المجموعة:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📱 نشر Story/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'tg_story', step: 'awaiting_media' };
    await bot.sendMessage(chatId, '📱 أرسل الصورة أو الفيديو للـ Story:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🔛 تفعيل النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('telegram', true);
    await bot.sendMessage(chatId, '✅ تم تفعيل النشر الجماعي لـ Telegram', {
      reply_markup: getTelegramKeyboard()
    });
  });

  bot.onText(/🔴 إيقاف النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('telegram', false);
    await bot.sendMessage(chatId, '🔴 تم إيقاف النشر الجماعي لـ Telegram', {
      reply_markup: getTelegramKeyboard()
    });
  });
}

export async function processTelegramInput(bot, msg, text, photo, video) {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  
  if (!state) return false;
  
  try {
    if (state.action === 'tg_channel' && state.step === 'awaiting_content') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const channelId = process.env.TELEGRAM_CHANNEL_ID;
      
      if (channelId) {
        await bot.sendMessage(channelId, text);
        await bot.sendMessage(chatId, '✅ تم نشر المحتوى في القناة', {
          reply_markup: getTelegramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, '❌ لم يتم تكوين معرف القناة', {
          reply_markup: getTelegramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'tg_group' && state.step === 'awaiting_content') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const groupId = process.env.TELEGRAM_GROUP_ID;
      
      if (groupId) {
        await bot.sendMessage(groupId, text);
        await bot.sendMessage(chatId, '✅ تم نشر المحتوى في المجموعة', {
          reply_markup: getTelegramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, '❌ لم يتم تكوين معرف المجموعة', {
          reply_markup: getTelegramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'tg_story' && state.step === 'awaiting_media' && (photo || video)) {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const channelId = process.env.TELEGRAM_CHANNEL_ID;
      
      if (channelId) {
        if (photo) {
          await bot.sendPhoto(channelId, photo[photo.length - 1].file_id);
        } else if (video) {
          await bot.sendVideo(channelId, video.file_id);
        }
        
        await bot.sendMessage(chatId, '✅ تم نشر الـ Story', {
          reply_markup: getTelegramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, '❌ لم يتم تكوين معرف القناة', {
          reply_markup: getTelegramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
  } catch (error) {
    console.error('Telegram processing error:', error);
    await bot.sendMessage(chatId, MESSAGES.error, {
      reply_markup: getTelegramKeyboard()
    });
    delete userState[chatId];
    return true;
  }
  
  return false;
}
