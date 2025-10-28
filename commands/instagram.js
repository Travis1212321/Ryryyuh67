import { getInstagramKeyboard } from '../utils/keyboard.js';
import { MESSAGES } from '../utils/messages.js';

let userState = {};

export function handleInstagramCommands(bot) {
  
  bot.onText(/📸 Instagram/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '📸 إدارة Instagram\n\nاختر الإجراء:', {
      reply_markup: getInstagramKeyboard()
    });
  });

  bot.onText(/📸 نشر منشور/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'ig_post', step: 'awaiting_media' };
    await bot.sendMessage(chatId, '📸 أرسل الصورة أو الفيديو:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🎬 نشر Reel/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'ig_reel', step: 'awaiting_video' };
    await bot.sendMessage(chatId, '🎬 أرسل الفيديو للـ Reel:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📱 نشر Story/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'ig_story', step: 'awaiting_media' };
    await bot.sendMessage(chatId, '📱 أرسل الصورة أو الفيديو للـ Story:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/👤 تحديث البروفايل/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
      '👤 تحديث البروفايل\n\nأدخل البيانات بالصيغة التالية:\n\n' +
      'biography: نبذة عن الحساب\n' +
      'website: رابط الموقع',
      { reply_markup: { remove_keyboard: true } }
    );
    userState[chatId] = { action: 'ig_update_profile', step: 'awaiting_data' };
  });

  bot.onText(/🔛 تفعيل النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('instagram', true);
    await bot.sendMessage(chatId, '✅ تم تفعيل النشر الجماعي لـ Instagram', {
      reply_markup: getInstagramKeyboard()
    });
  });

  bot.onText(/🔴 إيقاف النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('instagram', false);
    await bot.sendMessage(chatId, '🔴 تم إيقاف النشر الجماعي لـ Instagram', {
      reply_markup: getInstagramKeyboard()
    });
  });
}

export async function processInstagramInput(bot, msg, text, photo, video) {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  
  if (!state) return false;
  
  try {
    if (state.action === 'ig_post' && state.step === 'awaiting_media' && (photo || video)) {
      userState[chatId].mediaUrl = photo 
        ? await bot.getFileLink(photo[photo.length - 1].file_id)
        : await bot.getFileLink(video.file_id);
      userState[chatId].mediaType = photo ? 'photo' : 'video';
      userState[chatId].step = 'awaiting_caption';
      await bot.sendMessage(chatId, '✅ تم حفظ الملف\n\nأدخل النص المرافق (Caption) أو أرسل "تخطي":');
      return true;
    }
    
    if (state.action === 'ig_post' && state.step === 'awaiting_caption') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const { publishToInstagram } = await import('../services/publisher.js');
      const result = await publishToInstagram({
        text: text === 'تخطي' ? '' : text,
        mediaUrl: state.mediaUrl,
        type: 'post',
        mediaType: state.mediaType
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, MESSAGES.postPublished('Instagram'), {
          reply_markup: getInstagramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getInstagramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'ig_reel' && state.step === 'awaiting_video' && video) {
      userState[chatId].mediaUrl = await bot.getFileLink(video.file_id);
      userState[chatId].step = 'awaiting_caption';
      await bot.sendMessage(chatId, '✅ تم حفظ الفيديو\n\nأدخل النص المرافق (Caption) أو أرسل "تخطي":');
      return true;
    }
    
    if (state.action === 'ig_reel' && state.step === 'awaiting_caption') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const { publishToInstagram } = await import('../services/publisher.js');
      const result = await publishToInstagram({
        text: text === 'تخطي' ? '' : text,
        mediaUrl: state.mediaUrl,
        type: 'reel',
        mediaType: 'video'
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, '✅ تم نشر الـ Reel على Instagram', {
          reply_markup: getInstagramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getInstagramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'ig_story' && state.step === 'awaiting_media' && (photo || video)) {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const mediaUrl = photo 
        ? await bot.getFileLink(photo[photo.length - 1].file_id)
        : await bot.getFileLink(video.file_id);
      
      const { publishToInstagram } = await import('../services/publisher.js');
      const result = await publishToInstagram({
        mediaUrl: mediaUrl,
        type: 'story',
        mediaType: photo ? 'photo' : 'video'
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, '✅ تم نشر الـ Story على Instagram', {
          reply_markup: getInstagramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getInstagramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'ig_update_profile' && state.step === 'awaiting_data') {
      await bot.sendMessage(chatId, MESSAGES.processing);
      
      const lines = text.split('\n');
      const updates = {};
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          updates[key.trim()] = valueParts.join(':').trim();
        }
      });
      
      const { updateInstagramProfile } = await import('../services/publisher.js');
      const result = await updateInstagramProfile(updates);
      
      if (result.success) {
        await bot.sendMessage(chatId, MESSAGES.profileUpdated('Instagram'), {
          reply_markup: getInstagramKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getInstagramKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
  } catch (error) {
    console.error('Instagram processing error:', error);
    await bot.sendMessage(chatId, MESSAGES.error, {
      reply_markup: getInstagramKeyboard()
    });
    delete userState[chatId];
    return true;
  }
  
  return false;
}
