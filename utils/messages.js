export const MESSAGES = {
  welcome: `🌟 مرحباً بك في نظام إدارة المنصات الاجتماعية
  
🏢 وكالة السفر - نظام النشر الذكي

📱 المنصات المتاحة:
• Facebook
• Instagram  
• WhatsApp
• Telegram

استخدم الأزرار أدناه للتحكم الكامل بجميع المنصات`,

  mainMenu: '📋 القائمة الرئيسية\nاختر الإجراء المطلوب:',
  
  success: '✅ تمت العملية بنجاح',
  error: '❌ حدث خطأ، يرجى المحاولة مرة أخرى',
  unauthorized: '⛔ عذراً، أنت غير مصرح لك باستخدام هذا البوت',
  
  platformDisabled: (platform) => `⚠️ منصة ${platform} معطلة حالياً`,
  platformEnabled: (platform) => `✅ تم تفعيل منصة ${platform}`,
  
  postScheduled: (platform, date) => `✅ تم جدولة المنشور على ${platform}\n📅 التاريخ: ${date}`,
  postPublished: (platform) => `✅ تم نشر المحتوى بنجاح على ${platform}`,
  
  enterContent: 'الرجاء إدخال المحتوى المطلوب:',
  enterDate: 'أدخل التاريخ بالصيغة (YYYY-MM-DD HH:mm):',
  enterCaption: 'أدخل النص المرافق:',
  
  schedulerStatus: (count, enabled) => 
    `📊 حالة الجدولة\n\n` +
    `📝 عدد المنشورات المجدولة: ${count}\n` +
    `🔄 النشر التلقائي: ${enabled ? 'مفعل ✅' : 'معطل ❌'}`,
    
  noScheduledPosts: 'لا توجد منشورات مجدولة حالياً',
  
  invalidDate: '❌ تنسيق التاريخ غير صحيح. استخدم: YYYY-MM-DD HH:mm',
  invalidFormat: '❌ صيغة غير صحيحة',
  
  sendMedia: 'الرجاء إرسال الصورة أو الفيديو:',
  mediaSaved: '✅ تم حفظ الملف',
  
  profileUpdated: (platform) => `✅ تم تحديث ملف ${platform} الشخصي`,
  
  autoPostEnabled: '🔄 تم تفعيل النشر التلقائي',
  autoPostDisabled: '⏸️ تم إيقاف النشر التلقائي',
  
  stats: (fb, ig, wa, tg) => 
    `📊 الإحصائيات\n\n` +
    `📘 Facebook: ${fb} منشور\n` +
    `📸 Instagram: ${ig} منشور\n` +
    `💬 WhatsApp: ${wa} رسالة\n` +
    `✈️ Telegram: ${tg} منشور`,
    
  suggestions: '💡 اقتراحات التطوير:\n\nالرجاء كتابة اقتراحاتك:',
  suggestionSaved: '✅ تم حفظ اقتراحك، شكراً لك',
  
  bugs: '🐛 الإبلاغ عن خطأ:\n\nالرجاء وصف المشكلة:',
  bugReported: '✅ تم تسجيل البلاغ، سيتم معالجته قريباً',
  
  notes: '📝 الملاحظات:\n\nاكتب ملاحظاتك:',
  noteSaved: '✅ تم حفظ الملاحظة',
  
  confirmAction: 'هل أنت متأكد من هذا الإجراء؟',
  cancelled: '🔙 تم الإلغاء',
  
  processing: '⏳ جاري المعالجة...',
  uploading: '📤 جاري الرفع...',
  publishing: '📢 جاري النشر...',
};

export const ERRORS = {
  noToken: 'لم يتم العثور على TOKEN للمنصة',
  apiError: 'خطأ في الاتصال بالـ API',
  fileError: 'خطأ في قراءة/كتابة الملف',
  sessionError: 'خطأ في جلسة WhatsApp',
  networkError: 'خطأ في الاتصال بالإنترنت',
  invalidInput: 'مدخلات غير صحيحة',
  limitReached: 'تم تجاوز الحد المسموح',
  unauthorized: 'غير مصرح',
};
