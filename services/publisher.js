import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const platformsState = {
  facebook: process.env.FACEBOOK_ENABLED === 'true',
  instagram: process.env.INSTAGRAM_ENABLED === 'true',
  whatsapp: process.env.WHATSAPP_ENABLED === 'true',
  telegram: process.env.TELEGRAM_ENABLED === 'true',
};

export function getPlatformState(platform) {
  return platformsState[platform] || false;
}

export function setPlatformState(platform, enabled) {
  platformsState[platform] = enabled;
}

export async function publishPost(postData) {
  const results = {};
  
  if (platformsState.facebook && postData.platforms.includes('facebook')) {
    results.facebook = await publishToFacebook(postData);
  }
  
  if (platformsState.instagram && postData.platforms.includes('instagram')) {
    results.instagram = await publishToInstagram(postData);
  }
  
  if (platformsState.whatsapp && postData.platforms.includes('whatsapp')) {
    results.whatsapp = await publishToWhatsApp(postData);
  }
  
  if (platformsState.telegram && postData.platforms.includes('telegram')) {
    results.telegram = await publishToTelegram(postData);
  }
  
  return results;
}

async function publishToFacebook(postData) {
  try {
    const { FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID, WHATSAPP_PHONE_NUMBER, WHATSAPP_BUTTON_TEXT } = process.env;
    
    if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      throw new Error('Facebook credentials missing');
    }
    
    const baseUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}`;
    let result;
    
    if (postData.type === 'story') {
      if (postData.mediaType === 'photo') {
        result = await axios.post(`${baseUrl}/photo`, {
          url: postData.mediaUrl,
          published: false,
          access_token: FACEBOOK_ACCESS_TOKEN,
        });
        
        const photoId = result.data.id;
        await axios.post(`${baseUrl}/photos`, {
          photo_id: photoId,
          is_published: true,
          temporary: true,
          access_token: FACEBOOK_ACCESS_TOKEN,
        });
      } else if (postData.mediaType === 'video') {
        result = await axios.post(`${baseUrl}/video_stories`, {
          video_url: postData.mediaUrl,
          access_token: FACEBOOK_ACCESS_TOKEN,
        });
      }
    } else {
      const postPayload = {
        access_token: FACEBOOK_ACCESS_TOKEN,
      };
      
      if (postData.text) {
        postPayload.message = postData.text;
      }
      
      if (WHATSAPP_PHONE_NUMBER) {
        postPayload.call_to_action = {
          type: 'MESSAGE_PAGE',
          value: {
            link: `https://wa.me/${WHATSAPP_PHONE_NUMBER.replace(/[^0-9]/g, '')}`,
            link_title: WHATSAPP_BUTTON_TEXT || 'تواصل معنا'
          }
        };
      }
      
      if (postData.mediaUrl) {
        if (postData.mediaType === 'photo') {
          postPayload.url = postData.mediaUrl;
          result = await axios.post(`${baseUrl}/photos`, postPayload);
        } else if (postData.mediaType === 'video') {
          postPayload.file_url = postData.mediaUrl;
          result = await axios.post(`${baseUrl}/videos`, postPayload);
        }
      } else {
        result = await axios.post(`${baseUrl}/feed`, postPayload);
      }
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Facebook publish error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function publishToInstagram(postData) {
  try {
    const { FACEBOOK_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID } = process.env;
    
    if (!FACEBOOK_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
      throw new Error('Instagram credentials missing');
    }
    
    const baseUrl = `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}`;
    let result;
    
    if (postData.type === 'story') {
      const creationPayload = {
        media_type: postData.mediaType === 'video' ? 'STORIES_VIDEO' : 'STORIES',
        [postData.mediaType === 'video' ? 'video_url' : 'image_url']: postData.mediaUrl,
        access_token: FACEBOOK_ACCESS_TOKEN,
      };
      
      const createResult = await axios.post(`${baseUrl}/media`, creationPayload);
      
      result = await axios.post(`${baseUrl}/media_publish`, {
        creation_id: createResult.data.id,
        access_token: FACEBOOK_ACCESS_TOKEN,
      });
    } else if (postData.type === 'reel') {
      const creationPayload = {
        media_type: 'REELS',
        video_url: postData.mediaUrl,
        caption: postData.text || '',
        share_to_feed: true,
        access_token: FACEBOOK_ACCESS_TOKEN,
      };
      
      const createResult = await axios.post(`${baseUrl}/media`, creationPayload);
      
      result = await axios.post(`${baseUrl}/media_publish`, {
        creation_id: createResult.data.id,
        access_token: FACEBOOK_ACCESS_TOKEN,
      });
    } else {
      const creationPayload = {
        access_token: FACEBOOK_ACCESS_TOKEN,
        caption: postData.text || '',
      };
      
      if (postData.mediaType === 'photo') {
        creationPayload.image_url = postData.mediaUrl;
      } else if (postData.mediaType === 'video') {
        creationPayload.media_type = 'VIDEO';
        creationPayload.video_url = postData.mediaUrl;
      }
      
      const createResult = await axios.post(`${baseUrl}/media`, creationPayload);
      
      result = await axios.post(`${baseUrl}/media_publish`, {
        creation_id: createResult.data.id,
        access_token: FACEBOOK_ACCESS_TOKEN,
      });
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Instagram publish error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function publishToWhatsApp(postData) {
  try {
    return { success: true, message: 'WhatsApp publishing handled by WhatsApp client' };
  } catch (error) {
    console.error('WhatsApp publish error:', error.message);
    return { success: false, error: error.message };
  }
}

async function publishToTelegram(postData) {
  try {
    return { success: true, message: 'Telegram publishing handled by bot instance' };
  } catch (error) {
    console.error('Telegram publish error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function updateFacebookProfile(updates) {
  try {
    const { FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID } = process.env;
    
    if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      throw new Error('Facebook credentials missing');
    }
    
    const result = await axios.post(
      `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}`,
      {
        ...updates,
        access_token: FACEBOOK_ACCESS_TOKEN,
      }
    );
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Facebook profile update error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function updateInstagramProfile(updates) {
  try {
    const { FACEBOOK_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID } = process.env;
    
    if (!FACEBOOK_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
      throw new Error('Instagram credentials missing');
    }
    
    const result = await axios.post(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}`,
      {
        ...updates,
        access_token: FACEBOOK_ACCESS_TOKEN,
      }
    );
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Instagram profile update error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
