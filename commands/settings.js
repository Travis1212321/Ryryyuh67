import { getSettingsKeyboard, getMainKeyboard, getSchedulerKeyboard } from '../utils/keyboard.js';
import { MESSAGES } from '../utils/messages.js';
import { getScheduledPosts, deleteScheduledPost, schedulePost, getSchedulerStats } from '../services/scheduler.js';
import { getPlatformState } from '../services/publisher.js';
import fs from 'fs/promises';

let userState = {};
let autoPostInterval = null;

export function handleSettingsCommands(bot) {
  
  bot.onText(/⚙️ الإعدادات/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '⚙️ الإعدادات العامة\n\nاختر القسم:', {
      reply_markup: getSettingsKeyboard()
    });
  });

  bot.onText(/📅 الجدولة/, async (msg) => {
    const chatId = msg.chat.id;
    const stats = await getSchedulerStats();
    
    await bot.sendMessage(
      chatId, 
      `📅 نظام الجدولة\n\n` +
      `📝 المنشورات المجدولة: ${stats.scheduled}\n` +
      `✅ المنشورة: ${stats.published}\n` +
      `❌ الفاشلة: ${stats.failed}`,
      { reply_markup: getSchedulerKeyboard() }
    );
  });

  bot.onText(/📅 جدولة منشور جديد/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'schedule_post', step: 'awaiting_platform' };
    await bot.sendMessage(chatId, 'اختر المنصة:', {
      reply_markup: {
        keyboard: [
          ['📘 Facebook', '📸 Instagram'],
          ['💬 WhatsApp', '✈️ Telegram'],
          ['🌐 جميع المنصات', '🔙 إلغاء']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  });

  bot.onText(/📋 عرض المنشورات المجدولة/, async (msg) => {
    const chatId = msg.chat.id;
    const posts = await getScheduledPosts();
    const scheduledPosts = posts.filter(p => p.status === 'scheduled');
    
    if (scheduledPosts.length === 0) {
      await bot.sendMessage(chatId, MESSAGES.noScheduledPosts, {
        reply_markup: getSchedulerKeyboard()
      });
      return;
    }
    
    let message = '📋 المنشورات المجدولة:\n\n';
    scheduledPosts.forEach((post, index) => {
      message += `${index + 1}. المنصة: ${post.platforms.join(', ')}\n`;
      message += `   التاريخ: ${new Date(post.scheduledTime).toLocaleString('ar-SA')}\n`;
      message += `   المحتوى: ${post.text?.substring(0, 50) || 'محتوى وسائط'}...\n\n`;
    });
    
    await bot.sendMessage(chatId, message, {
      reply_markup: getSchedulerKeyboard()
    });
  });

  bot.onText(/🗑️ حذف منشور مجدول/, async (msg) => {
    const chatId = msg.chat.id;
    const posts = await getScheduledPosts();
    const scheduledPosts = posts.filter(p => p.status === 'scheduled');
    
    if (scheduledPosts.length === 0) {
      await bot.sendMessage(chatId, MESSAGES.noScheduledPosts, {
        reply_markup: getSchedulerKeyboard()
      });
      return;
    }
    
    let message = '🗑️ اختر رقم المنشور للحذف:\n\n';
    scheduledPosts.forEach((post, index) => {
      message += `${index + 1}. ${post.platforms.join(', ')} - ${new Date(post.scheduledTime).toLocaleString('ar-SA')}\n`;
    });
    
    userState[chatId] = { action: 'delete_scheduled', step: 'awaiting_index', posts: scheduledPosts };
    await bot.sendMessage(chatId, message, {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🔄 تفعيل النشر التلقائي/, async (msg) => {
    const chatId = msg.chat.id;
    startAutoPosting(bot);
    await bot.sendMessage(chatId, MESSAGES.autoPostEnabled, {
      reply_markup: getSchedulerKeyboard()
    });
  });

  bot.onText(/⏸️ إيقاف النشر التلقائي/, async (msg) => {
    const chatId = msg.chat.id;
    stopAutoPosting();
    await bot.sendMessage(chatId, MESSAGES.autoPostDisabled, {
      reply_markup: getSchedulerKeyboard()
    });
  });

  bot.onText(/📊 الإحصائيات/, async (msg) => {
    const chatId = msg.chat.id;
    const stats = await getSchedulerStats();
    
    const fbState = getPlatformState('facebook') ? '✅' : '❌';
    const igState = getPlatformState('instagram') ? '✅' : '❌';
    const waState = getPlatformState('whatsapp') ? '✅' : '❌';
    const tgState = getPlatformState('telegram') ? '✅' : '❌';
    
    const message = `📊 الإحصائيات العامة\n\n` +
      `📝 المنشورات المجدولة: ${stats.scheduled}\n` +
      `✅ المنشورة: ${stats.published}\n` +
      `❌ الفاشلة: ${stats.failed}\n\n` +
      `🔄 حالة المنصات:\n` +
      `📘 Facebook: ${fbState}\n` +
      `📸 Instagram: ${igState}\n` +
      `💬 WhatsApp: ${waState}\n` +
      `✈️ Telegram: ${tgState}`;
    
    await bot.sendMessage(chatId, message, {
      reply_markup: getMainKeyboard()
    });
  });

  bot.onText(/💡 اقتراحات/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'suggestions', step: 'awaiting_text' };
    await bot.sendMessage(chatId, MESSAGES.suggestions, {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🐛 أخطاء/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'bugs', step: 'awaiting_text' };
    await bot.sendMessage(chatId, MESSAGES.bugs, {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📝 ملاحظات/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'notes', step: 'awaiting_text' };
    await bot.sendMessage(chatId, MESSAGES.notes, {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🔙 رجوع للقائمة الرئيسية/, async (msg) => {
    const chatId = msg.chat.id;
    delete userState[chatId];
    await bot.sendMessage(chatId, MESSAGES.mainMenu, {
      reply_markup: getMainKeyboard()
    });
  });
}

export async function processSettingsInput(bot, msg, text) {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  
  if (!state) return false;
  
  try {
    if (state.action === 'schedule_post') {
      if (state.step === 'awaiting_platform') {
        const platformMap = {
          '📘 Facebook': 'facebook',
          '📸 Instagram': 'instagram',
          '💬 WhatsApp': 'whatsapp',
          '✈️ Telegram': 'telegram',
          '🌐 جميع المنصات': 'all'
        };
        
        const platform = platformMap[text];
        if (!platform) return false;
        
        userState[chatId].platforms = platform === 'all' 
          ? ['facebook', 'instagram', 'whatsapp', 'telegram']
          : [platform];
        userState[chatId].step = 'awaiting_content';
        
        await bot.sendMessage(chatId, 'أدخل محتوى المنشور:', {
          reply_markup: { remove_keyboard: true }
        });
        return true;
      }
      
      if (state.step === 'awaiting_content') {
        userState[chatId].text = text;
        userState[chatId].step = 'awaiting_date';
        await bot.sendMessage(chatId, 'أدخل التاريخ والوقت بالصيغة:\nYYYY-MM-DD HH:mm\n\nمثال: 2025-10-29 14:30');
        return true;
      }
      
      if (state.step === 'awaiting_date') {
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
        if (!dateRegex.test(text)) {
          await bot.sendMessage(chatId, MESSAGES.invalidDate);
          return true;
        }
        
        await schedulePost({
          platforms: state.platforms,
          text: state.text,
          scheduledTime: new Date(text).toISOString(),
          type: 'post'
        });
        
        await bot.sendMessage(chatId, 
          MESSAGES.postScheduled(state.platforms.join(', '), text),
          { reply_markup: getSchedulerKeyboard() }
        );
        
        delete userState[chatId];
        return true;
      }
    }
    
    if (state.action === 'delete_scheduled' && state.step === 'awaiting_index') {
      const index = parseInt(text) - 1;
      if (isNaN(index) || index < 0 || index >= state.posts.length) {
        await bot.sendMessage(chatId, '❌ رقم غير صحيح');
        return true;
      }
      
      await deleteScheduledPost(state.posts[index].id);
      await bot.sendMessage(chatId, '✅ تم حذف المنشور المجدول', {
        reply_markup: getSchedulerKeyboard()
      });
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'suggestions' && state.step === 'awaiting_text') {
      await saveFeedback('suggestions', text, msg.from);
      await bot.sendMessage(chatId, MESSAGES.suggestionSaved, {
        reply_markup: getMainKeyboard()
      });
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'bugs' && state.step === 'awaiting_text') {
      await saveFeedback('bugs', text, msg.from);
      await bot.sendMessage(chatId, MESSAGES.bugReported, {
        reply_markup: getMainKeyboard()
      });
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'notes' && state.step === 'awaiting_text') {
      await saveFeedback('notes', text, msg.from);
      await bot.sendMessage(chatId, MESSAGES.noteSaved, {
        reply_markup: getMainKeyboard()
      });
      delete userState[chatId];
      return true;
    }
    
  } catch (error) {
    console.error('Settings processing error:', error);
    await bot.sendMessage(chatId, MESSAGES.error, {
      reply_markup: getMainKeyboard()
    });
    delete userState[chatId];
    return true;
  }
  
  return false;
}

async function saveFeedback(type, content, user) {
  try {
    await fs.mkdir('./data', { recursive: true });
    
    const feedback = {
      type,
      content,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name
      },
      timestamp: new Date().toISOString()
    };
    
    const filename = `./data/${type}.json`;
    let feedbacks = [];
    
    try {
      const data = await fs.readFile(filename, 'utf8');
      feedbacks = JSON.parse(data);
    } catch {
    }
    
    feedbacks.push(feedback);
    await fs.writeFile(filename, JSON.stringify(feedbacks, null, 2));
  } catch (error) {
    console.error('Error saving feedback:', error);
  }
}

function startAutoPosting(bot) {
  if (autoPostInterval) return;
  
  const cron = require('node-cron');
  const minutes = parseInt(process.env.AUTO_POST_INTERVAL_MINUTES) || 60;
  
  autoPostInterval = cron.schedule(`*/${minutes} * * * *`, async () => {
    try {
      const posts = await getScheduledPosts();
      const now = new Date();
      
      for (const post of posts) {
        if (post.status === 'scheduled') {
          const scheduledTime = new Date(post.scheduledTime);
          if (scheduledTime <= now) {
            const { publishPost } = await import('../services/publisher.js');
            await publishPost(post);
          }
        }
      }
    } catch (error) {
      console.error('Auto posting error:', error);
    }
  });
}

function stopAutoPosting() {
  if (autoPostInterval) {
    autoPostInterval.stop();
    autoPostInterval = null;
  }
}
