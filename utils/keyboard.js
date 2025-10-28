export function getMainKeyboard() {
  return {
    keyboard: [
      ['📘 Facebook', '📸 Instagram'],
      ['💬 WhatsApp', '✈️ Telegram'],
      ['📅 الجدولة', '⚙️ الإعدادات'],
      ['📊 الإحصائيات', '🔄 النشر التلقائي'],
      ['💡 اقتراحات', '🐛 أخطاء', '📝 ملاحظات']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getFacebookKeyboard() {
  return {
    keyboard: [
      ['📝 نشر منشور', '📸 نشر صورة'],
      ['🎥 نشر فيديو', '📱 نشر Story'],
      ['👤 تحديث البروفايل', '⚙️ الإعدادات'],
      ['🔛 تفعيل النشر الجماعي', '🔴 إيقاف النشر الجماعي'],
      ['🔙 رجوع للقائمة الرئيسية']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getInstagramKeyboard() {
  return {
    keyboard: [
      ['📸 نشر منشور', '🎬 نشر Reel'],
      ['📱 نشر Story', '👤 تحديث البروفايل'],
      ['⚙️ الإعدادات'],
      ['🔛 تفعيل النشر الجماعي', '🔴 إيقاف النشر الجماعي'],
      ['🔙 رجوع للقائمة الرئيسية']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getWhatsAppKeyboard() {
  return {
    keyboard: [
      ['📢 نشر في القنوات', '👥 نشر في المجموعات'],
      ['📱 نشر Status', '⚙️ الإعدادات'],
      ['🔛 تفعيل النشر الجماعي', '🔴 إيقاف النشر الجماعي'],
      ['🔙 رجوع للقائمة الرئيسية']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getTelegramKeyboard() {
  return {
    keyboard: [
      ['📢 نشر في القناة', '👥 نشر في المجموعة'],
      ['📱 نشر Story', '⚙️ الإعدادات'],
      ['🔛 تفعيل النشر الجماعي', '🔴 إيقاف النشر الجماعي'],
      ['🔙 رجوع للقائمة الرئيسية']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getSchedulerKeyboard() {
  return {
    keyboard: [
      ['📅 جدولة منشور جديد', '📋 عرض المنشورات المجدولة'],
      ['🗑️ حذف منشور مجدول', '✏️ تعديل منشور'],
      ['🔄 تفعيل النشر التلقائي', '⏸️ إيقاف النشر التلقائي'],
      ['🔙 رجوع للقائمة الرئيسية']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getSettingsKeyboard() {
  return {
    keyboard: [
      ['⚙️ إعدادات Facebook', '⚙️ إعدادات Instagram'],
      ['⚙️ إعدادات WhatsApp', '⚙️ إعدادات Telegram'],
      ['🔑 تحديث المفاتيح', '🌐 إعدادات اللغة'],
      ['🔙 رجوع للقائمة الرئيسية']
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function getConfirmKeyboard() {
  return {
    keyboard: [
      ['✅ نعم، تأكيد', '❌ لا، إلغاء']
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function getMediaTypeKeyboard() {
  return {
    keyboard: [
      ['📝 نص فقط', '📸 صورة + نص'],
      ['🎥 فيديو + نص', '📸 صورة فقط'],
      ['🎥 فيديو فقط'],
      ['🔙 إلغاء']
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function getPlatformSelectionKeyboard() {
  return {
    keyboard: [
      ['📘 Facebook', '📸 Instagram'],
      ['💬 WhatsApp', '✈️ Telegram'],
      ['🌐 جميع المنصات', '🔙 إلغاء']
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}
