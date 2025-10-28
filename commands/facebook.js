import { getFacebookKeyboard } from '../utils/keyboard.js';
import { MESSAGES } from '../utils/messages.js';
import { schedulePost } from '../services/scheduler.js';

let userState = {};

export function handleFacebookCommands(bot) {
  
  bot.onText(/📘 Facebook/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '📘 إدارة Facebook\n\nاختر الإجراء:', {
      reply_markup: getFacebookKeyboard()
    });
  });

  bot.onText(/📝 نشر منشور/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'fb_post_text', step: 'awaiting_text' };
    await bot.sendMessage(chatId, '📝 أدخل نص المنشور:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📸 نشر صورة/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'fb_post_photo', step: 'awaiting_photo' };
    await bot.sendMessage(chatId, '📸 أرسل الصورة:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/🎥 نشر فيديو/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'fb_post_video', step: 'awaiting_video' };
    await bot.sendMessage(chatId, '🎥 أرسل الفيديو:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📱 نشر Story/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { action: 'fb_story', step: 'awaiting_media' };
    await bot.sendMessage(chatId, '📱 أرسل الصورة أو الفيديو للـ Story:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/👤 تحديث البروفايل/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
      '👤 تحديث البروفايل\n\nأدخل البيانات بالصيغة التالية:\n\n' +
      'name: اسم الصفحة\n' +
      'about: نبذة عن الصفحة\n' +
      'description: وصف الصفحة',
      { reply_markup: { remove_keyboard: true } }
    );
    userState[chatId] = { action: 'fb_update_profile', step: 'awaiting_data' };
  });

  bot.onText(/🔛 تفعيل النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('facebook', true);
    await bot.sendMessage(chatId, '✅ تم تفعيل النشر الجماعي لـ Facebook', {
      reply_markup: getFacebookKeyboard()
    });
  });

  bot.onText(/🔴 إيقاف النشر الجماعي/, async (msg) => {
    const chatId = msg.chat.id;
    const { setPlatformState } = await import('../services/publisher.js');
    setPlatformState('facebook', false);
    await bot.sendMessage(chatId, '🔴 تم إيقاف النشر الجماعي لـ Facebook', {
      reply_markup: getFacebookKeyboard()
    });
  });
}

export async function processFacebookInput(bot, msg, text, photo, video) {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  
  if (!state) return false;
  
  try {
    if (state.action === 'fb_post_text' && state.step === 'awaiting_text') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const { publishToFacebook } = await import('../services/publisher.js');
      const result = await publishToFacebook({
        text: text,
        type: 'post',
        mediaType: 'text'
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, MESSAGES.postPublished('Facebook'), {
          reply_markup: getFacebookKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getFacebookKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'fb_post_photo' && state.step === 'awaiting_photo' && photo) {
      userState[chatId].mediaUrl = await bot.getFileLink(photo[photo.length - 1].file_id);
      userState[chatId].step = 'awaiting_caption';
      await bot.sendMessage(chatId, '✅ تم حفظ الصورة\n\nأدخل النص المرافق (أو أرسل "تخطي"):');
      return true;
    }
    
    if (state.action === 'fb_post_photo' && state.step === 'awaiting_caption') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const { publishToFacebook } = await import('../services/publisher.js');
      const result = await publishToFacebook({
        text: text === 'تخطي' ? '' : text,
        mediaUrl: state.mediaUrl,
        type: 'post',
        mediaType: 'photo'
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, MESSAGES.postPublished('Facebook'), {
          reply_markup: getFacebookKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getFacebookKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'fb_post_video' && state.step === 'awaiting_video' && video) {
      userState[chatId].mediaUrl = await bot.getFileLink(video.file_id);
      userState[chatId].step = 'awaiting_caption';
      await bot.sendMessage(chatId, '✅ تم حفظ الفيديو\n\nأدخل النص المرافق (أو أرسل "تخطي"):');
      return true;
    }
    
    if (state.action === 'fb_post_video' && state.step === 'awaiting_caption') {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const { publishToFacebook } = await import('../services/publisher.js');
      const result = await publishToFacebook({
        text: text === 'تخطي' ? '' : text,
        mediaUrl: state.mediaUrl,
        type: 'post',
        mediaType: 'video'
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, MESSAGES.postPublished('Facebook'), {
          reply_markup: getFacebookKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getFacebookKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'fb_story' && state.step === 'awaiting_media' && (photo || video)) {
      await bot.sendMessage(chatId, MESSAGES.publishing);
      
      const mediaUrl = photo 
        ? await bot.getFileLink(photo[photo.length - 1].file_id)
        : await bot.getFileLink(video.file_id);
      
      const { publishToFacebook } = await import('../services/publisher.js');
      const result = await publishToFacebook({
        mediaUrl: mediaUrl,
        type: 'story',
        mediaType: photo ? 'photo' : 'video'
      });
      
      if (result.success) {
        await bot.sendMessage(chatId, '✅ تم نشر الـ Story على Facebook', {
          reply_markup: getFacebookKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getFacebookKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
    if (state.action === 'fb_update_profile' && state.step === 'awaiting_data') {
      await bot.sendMessage(chatId, MESSAGES.processing);
      
      const lines = text.split('\n');
      const updates = {};
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          updates[key.trim()] = valueParts.join(':').trim();
        }
      });
      
      const { updateFacebookProfile } = await import('../services/publisher.js');
      const result = await updateFacebookProfile(updates);
      
      if (result.success) {
        await bot.sendMessage(chatId, MESSAGES.profileUpdated('Facebook'), {
          reply_markup: getFacebookKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.error, {
          reply_markup: getFacebookKeyboard()
        });
      }
      
      delete userState[chatId];
      return true;
    }
    
  } catch (error) {
    console.error('Facebook processing error:', error);
    await bot.sendMessage(chatId, MESSAGES.error, {
      reply_markup: getFacebookKeyboard()
    });
    delete userState[chatId];
    return true;
  }
  
  return false;
}
