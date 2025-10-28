import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';

const SCHEDULED_POSTS_FILE = './data/scheduled_posts.json';

let scheduledTasks = new Map();

export async function initializeScheduler() {
  try {
    await fs.access('./data');
  } catch {
    await fs.mkdir('./data', { recursive: true });
  }

  try {
    await fs.access(SCHEDULED_POSTS_FILE);
  } catch {
    await fs.writeFile(SCHEDULED_POSTS_FILE, JSON.stringify({ posts: [] }, null, 2));
  }

  await loadScheduledPosts();
}

export async function schedulePost(postData) {
  const posts = await getScheduledPosts();
  
  const newPost = {
    id: Date.now().toString(),
    ...postData,
    createdAt: new Date().toISOString(),
    status: 'scheduled',
  };
  
  posts.push(newPost);
  await saveScheduledPosts(posts);
  
  if (postData.scheduledTime) {
    setupCronJob(newPost);
  }
  
  return newPost;
}

export async function getScheduledPosts() {
  try {
    const data = await fs.readFile(SCHEDULED_POSTS_FILE, 'utf8');
    const { posts } = JSON.parse(data);
    return posts || [];
  } catch (error) {
    return [];
  }
}

export async function deleteScheduledPost(postId) {
  const posts = await getScheduledPosts();
  const filtered = posts.filter(p => p.id !== postId);
  await saveScheduledPosts(filtered);
  
  if (scheduledTasks.has(postId)) {
    scheduledTasks.get(postId).stop();
    scheduledTasks.delete(postId);
  }
  
  return true;
}

export async function updateScheduledPost(postId, updates) {
  const posts = await getScheduledPosts();
  const index = posts.findIndex(p => p.id === postId);
  
  if (index === -1) return null;
  
  posts[index] = { ...posts[index], ...updates };
  await saveScheduledPosts(posts);
  
  if (scheduledTasks.has(postId)) {
    scheduledTasks.get(postId).stop();
    scheduledTasks.delete(postId);
  }
  
  if (updates.scheduledTime) {
    setupCronJob(posts[index]);
  }
  
  return posts[index];
}

async function saveScheduledPosts(posts) {
  await fs.writeFile(
    SCHEDULED_POSTS_FILE,
    JSON.stringify({ posts }, null, 2)
  );
}

function setupCronJob(post) {
  const scheduleDate = new Date(post.scheduledTime);
  const now = new Date();
  
  if (scheduleDate <= now) {
    return;
  }
  
  const cronExpression = convertToCronExpression(scheduleDate);
  
  if (!cron.validate(cronExpression)) {
    return;
  }
  
  const task = cron.schedule(cronExpression, async () => {
    try {
      const { publishPost } = await import('./publisher.js');
      await publishPost(post);
      
      await markPostAsPublished(post.id);
      
      task.stop();
      scheduledTasks.delete(post.id);
    } catch (error) {
      console.error('Error publishing scheduled post:', error);
    }
  });
  
  scheduledTasks.set(post.id, task);
}

function convertToCronExpression(date) {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  
  return `${minute} ${hour} ${day} ${month} *`;
}

async function loadScheduledPosts() {
  const posts = await getScheduledPosts();
  
  posts.forEach(post => {
    if (post.status === 'scheduled' && post.scheduledTime) {
      setupCronJob(post);
    }
  });
}

async function markPostAsPublished(postId) {
  const posts = await getScheduledPosts();
  const post = posts.find(p => p.id === postId);
  
  if (post) {
    post.status = 'published';
    post.publishedAt = new Date().toISOString();
    await saveScheduledPosts(posts);
  }
}

export async function getSchedulerStats() {
  const posts = await getScheduledPosts();
  
  return {
    total: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed: posts.filter(p => p.status === 'failed').length,
  };
}
