console.log('✯ جاري التشغيل ✯')

import { join, dirname } from 'path'                    // استيراد دوال للتعامل مع مسارات الملفات
import { createRequire } from 'module'                  // استيراد لإنشاء دالة require في نظام ES Modules
import { fileURLToPath } from 'url'                      // تحويل URL الخاص بالملف إلى مسار نظامي
import { setupMaster, fork } from 'cluster'              // استيراد أدوات للتحكم بعمليات متعددة (تعدد المعالجات)
import { watchFile, unwatchFile } from 'fs'              // استيراد دوال لمراقبة تغييرات الملفات
import cfonts from 'cfonts'                               // مكتبة لعرض نصوص مزخرفة بألوان في الكونسول

const __dirname = dirname(fileURLToPath(import.meta.url)) // الحصول على مسار مجلد الملف الحالي
const require = createRequire(__dirname)                  // إنشاء دالة require للاستخدام في ES Modules

// عرض اسم البوت OTTO² BOT ✓ بخط مزخرف وبلون متدرج من الأحمر للماجينتا
cfonts.say('OTTO²✓', {
  font: 'chrome',
  align: 'center',
  gradient: ['red', 'magenta']
})

// عرض وصف البوت بخط مختلف وألوان متدرجة أيضاً
cfonts.say(`WhatsApp Bot Multi Device`, {
  font: 'console',
  align: 'center',
  gradient: ['red', 'magenta']
})

let isRunning = false  // متغير لتتبع حالة تشغيل البوت

// دالة تبدأ تشغيل الملفات المحددة (هنا ملف واحد: starlights.js)
async function start(files) {
  if (isRunning) return       // إذا كان البوت يعمل بالفعل لا يعيد التشغيل
  isRunning = true            // علامة أنه بدأ التشغيل

  for (const file of files) {                      // لكل ملف في القائمة
    const args = [join(__dirname, file), ...process.argv.slice(2)] // مسار الملف مع بقية الوسائط الممررة للبرنامج

    setupMaster({                                  // تهيئة المعالج الرئيسي للعمل على الملف المحدد
      exec: args[0],                              
      args: args.slice(1),
    })

    let p = fork()                                 // إنشاء عملية فرعية لتشغيل الملف

    p.on('exit', (code) => {                       // عند انتهاء العملية الفرعية
      isRunning = false                            // وضع علامة أن البوت توقف مؤقتاً
      start(files)                                 // إعادة تشغيل البوت (إعادة محاولة)

      if (code === 0) return                        // إذا انتهى بدون خطأ (رمز 0) يتوقف هنا

      // إذا انتهى بكود خطأ، يتم مراقبة الملف للتغييرات، وعند التغيير يعيد تشغيل البوت
      watchFile(args[0], () => {
        unwatchFile(args[0])
        start(files)
      })
    })
  }
}

// بدء تشغيل الملف 'starlights.js'
start(['starlights.js'])