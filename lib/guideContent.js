export const guideSections = [
  {
    id: 'mission',
    iconName: 'Target',
    en: {
      badge: 'Overview & Progress',
      title: 'Mission Card',
      desc: 'A permanent header card that anchors your screen. It displays your overarching mission or project title alongside your live daily habit completion progress.',
      tips: [
        'Tap the title on the card anytime to rename your mission or current life focus.',
        'The progress bar and percentage dynamically reflect the completion of your scheduled habits for the active day.',
        'The card remains constant every day to keep your primary vision in sight while tracking daily execution.'
      ]
    },
    ar: {
      badge: 'نظرة عامة والتقدم',
      title: 'كارت الميشن (Mission Card)',
      desc: 'كارت رئيسي ثابت أعلى الشاشة؛ يعرض اسم الميشن أو الهدف العام الذي اخترته لنفسك، مع شريط ونسبة التقدم الحية لإنجاز عادات اليوم.',
      tips: [
        'اضغط على عنوان الكارت في أي وقت لتعديل الاسم أو كتابة هدفك ومسارك الحالي.',
        'شريط التقدم والنسبة المئوية يعكسان تلقائياً نسبة إنجاز عاداتك المجدولة لليوم النشط.',
        'الكارت ثابت معك كل يوم ليكون تذكيراً دائماً برؤيتك العامة ومتابعة تنفيذك اليومي.'
      ]
    }
  },
  {
    id: 'tasks',
    iconName: 'ListChecks',
    en: {
      badge: 'Smart Rollover',
      title: 'Daily Tasks & Rollover System',
      desc: 'A dynamic task checklist with an automated overnight rollover engine that ensures no unfinished responsibility gets left behind.',
      tips: [
        'Completed Tasks Disappear: Any task you finish and check off is saved in that day’s historical record and disappears tomorrow so you start fresh.',
        'Postponed Tasks Carry Over: If you leave a task unchecked or postpone it, it automatically moves to the new day with a highlighted "Rolled Over" badge so you never forget it.',
        'Link to Pomodoro: Tap the focus icon on any task to instantly bind it as your active Pomodoro timer goal.',
        'Quick Management: Add new tasks on the fly, tap to edit their text, or delete items you no longer need.'
      ]
    },
    ar: {
      badge: 'الترحيل الذكي',
      title: 'المهام اليومية ونظام الترحيل (Smart Rollover)',
      desc: 'قائمة مهام تفاعلية لإدارة أعمالك اليومية، مزودة بمحرك ترحيل ذكي يضمن عدم نسيان أي مهمة مؤجلة.',
      tips: [
        'أرشفة المهام المنجزة: أي مهمة تنهيها وتعلّم عليها (Checked) تُحفظ في سجل ذلك اليوم وتختفي تلقائياً في اليوم التالي لتبدأ يومك بقائمة نظيفة.',
        'الترحيل التلقائي للمهام المؤجلة: لو تركت مهمة دون إنجاز أو أجلتها، لا تضيع أبداً؛ بل تنتقل تلقائياً لليوم الجديد مع علامة تمييز (Rolled Over) لتنبيهك بضرورة إنهائها.',
        'ربط المهام بالتركيز: يمكنك الضغط على علامة التركيز بجانب أي مهمة لبدء مؤقت بومودورو مخصص للعمل على هذه المهمة بالتحديد.',
        'إدارة سريعة: إضافة مهام جديدة بضغطة زر، تعديل نص المهمة مباشرة، أو حذفها في أي وقت.'
      ]
    }
  },
  {
    id: 'habits',
    iconName: 'Check',
    en: {
      badge: 'Habits & Routine',
      title: 'Habit Engine & Scheduling',
      desc: 'Track and automate routines with high precision. You can schedule habits on specific days or frequencies without cluttering your daily view.',
      tips: [
        'Flexible Frequencies: Choose Daily, Weekly (select specific weekdays), Monthly, Yearly, or a one-time scheduled date.',
        'Smart Days: On days a habit is not scheduled, it will not appear and won’t break your ongoing streak.',
        'Habit Notes: Tap on a habit to attach a quick note or reflection explaining why you missed or completed it.',
        'Navigation: Swipe left or right on the main screen (or use the date header) to review past days or plan ahead.'
      ]
    },
    ar: {
      badge: 'بناء العادات',
      title: 'محرك العادات والجدولة الذكية',
      desc: 'تتبع عاداتك بدقة مع نظام جدولة مرن يتأقلم مع روتينك، بدون أن يظهر في يومك غير العادات المخصصة لذلك اليوم فقط.',
      tips: [
        'أنماط التكرار: اختر يومي، أسبوعي (أيام محددة كأيام العمل أو العطلات)، شهري، سنوي، أو موعد لمرة واحدة.',
        'الظهور الذكي: في الأيام غير المجدولة، العادة لن تظهر في القائمة ولن تؤثر على الستريك الخاص بك.',
        'ملاحظات العادة: يمكنك الضغط على أي عادة لإضافة ملاحظة توضح سبب عدم إنجازها للرجوع إليها لاحقاً.',
        'التنقل بين الأيام: اسحب لليمين أو اليسار في الشاشة الرئيسية لمراجعة أيام سابقة أو التخطيط للأيام القادمة.'
      ]
    }
  },
  {
    id: 'emergency',
    iconName: 'ShieldAlert',
    en: {
      badge: 'Streak Protection',
      title: 'Emergency Cards',
      desc: 'Life happens. Emergency Cards are streak repair shields designed to protect your hard-earned streaks when an unexpected emergency causes you to miss a day.',
      tips: [
        'How to Earn: You automatically receive 1 Emergency Card for every 7 consecutive days of streak on any habit.',
        'How to Use: If you forgot or couldn’t complete a habit on a past day, use a card to mark it as protected and preserve your active streak.',
        'Fair Play Rules: Emergency cards can only be used on habits with an active streak (> 0), preventing abuse and keeping milestones meaningful.'
      ]
    },
    ar: {
      badge: 'حماية الستريك',
      title: 'كروت الطوارئ (Emergency Cards)',
      desc: 'درع لحماية الستريك عند الظروف الطارئة. إذا واجهت يوماً صعباً ومنعتك الظروف من إكمال عادتك، كروت الطوارئ تحافظ على الستريك وتمنع انهياره.',
      tips: [
        'كيف تكسبها: تكسب كارت طوارئ تلقائياً كلما أتممت 7 أيام متتالية (ستريك 7، 14، 21...) على أي عادة.',
        'طريقة الاستخدام: إذا فاتك إكمال عادة في يوم سابق، استخدم كارت لإصلاح ذلك اليوم واستعادة الستريك بنجاح.',
        'قواعد عادلة: لا يمكن استخدام الكارت لعادة رصيد الستريك الخاص بها صفر، للحفاظ على معنى الإنجاز الحقيقي.'
      ]
    }
  },
  {
    id: 'pomodoro',
    iconName: 'Timer',
    en: {
      badge: 'Deep Work',
      title: 'Pomodoro Focus Timer',
      desc: 'A scientific time-boxing tool that structures your focus into productive work intervals followed by restorative short breaks.',
      tips: [
        'The 4-Dot Indicator: Each dot represents one 25-minute focus session. Completing all four dots finishes a full deep-work set before taking a longer rest.',
        'Task Anchoring: Link your active timer directly to any task so you maintain clear intent throughout the session.',
        'Auditory Bells: Gentle minimal chimes notify you when intervals finish without startling you.',
        'Session Logging: Completed sessions are automatically recorded into your Daily Analytics history.'
      ]
    },
    ar: {
      badge: 'العمل العميق',
      title: 'مؤقت بومودورو للتركيز',
      desc: 'أداة تقسيم الوقت الكلاسيكية؛ جلسات عمل عميق مدتها 25 دقيقة تفصل بينها فترات راحة قصيرة مدتها 5 دقائق لتجديد طاقتك الذهنية.',
      tips: [
        'مؤشر الـ 4 نقاط: تمثل كل نقطة جلسة تركيز كاملة مدتها 25 دقيقة، وإكمال النقاط الأربعة يعني إتمام دورة تركيز كاملة قبل أخذ راحة أطول.',
        'ربط المهام: يمكنك ربط المؤقت باسم المهمة التي تعمل عليها لتثبيت تركيزك عليها طوال الجلسة.',
        'تنبيهات صوتية هادئة: رنات إشعار ناعمة تنبهك عند بدء فترات الراحة أو العودة للعمل.',
        'سجل الجلسات: كل جلسة مكتملة تسجل تلقائياً في صفحة الإحصائيات وسجل النشاط.'
      ]
    }
  },
  {
    id: 'flight',
    iconName: 'PlaneTakeoff',
    en: {
      badge: 'Cinematic Immersion',
      title: 'Flight Focus',
      desc: 'A virtual in-flight focus simulator that syncs your productivity session with real-world passenger flights currently airborne worldwide.',
      tips: [
        'Live Radar Search: Search for real flights by flight number (e.g., EK1, MS777) or browse flights in the air with live flight paths.',
        '3D Window Seat: Gaze through the aircraft window with procedural clouds, wing views, and shifting daylight.',
        'Cabin Ambient Sound: Optional binaural cabin noise masks external distractions and puts your brain into a state of flow.',
        'Boarding Pass Collectibles: Finishing your flight mints a souvenir boarding pass archived in your tickets vault.'
      ]
    },
    ar: {
      badge: 'محاكاة الطيران',
      title: 'فلايت فوكس (Flight Focus)',
      desc: 'تجربة تركيز سينمائية غامرة؛ انضم إلى رحلة طيران حقيقية تحلق في السماء الآن، وتزامن وقت عملك مع مدة الرحلة الحية.',
      tips: [
        'بحث الرادار الحي: ابحث برقم الرحلة الحقيقية (مثل EK1 أو MS777) أو استعرض الرحلات المتاحة في الأجواء الآن.',
        'شباك الطائرة 3D: انظر من شباك الطائرة التفاعلي مع سحب واقعية، جناح الطائرة، وتغير ضوء النهار حسب موقع الطائرة.',
        'صوت الكابينة: صوت خلفي لضوضاء الطائرة الهادئة يساعد على عزل الضوضاء الخارجية والدخول في حالة التركيز (Flow).',
        'تذاكر الصعود التذكارية: عند إنهاء الرحلة، يولد التطبيق تذكرة صعود سينمائية (Boarding Pass) تضاف لسجل رحلاتك التذكاري.'
      ]
    }
  },
  {
    id: 'spotify',
    iconName: 'Radio',
    en: {
      badge: 'Live Audio',
      title: 'Spotify Player & Gestures',
      desc: 'Streamlined Spotify playback directly inside your workflow with gesture-driven controls and distraction-free smart visibility.',
      tips: [
        'Swipe Gestures: Swipe left to skip to the next track, swipe right to go back to the previous track, or tap anywhere to toggle play/pause.',
        'Dual Sizes: Toggle between Full-width (wide bar with progress line) or Compact mode (single habit card size).',
        'Smart Auto-Hide: In Auto mode, the widget only appears when audio is actively playing, and cleanly hides 30 minutes after pausing.',
        'Pointer Engine: Works natively with mouse clicks and drags on Mac desktop as well as touch swipes on mobile.'
      ]
    },
    ar: {
      badge: 'الربط الموسيقي',
      title: 'مشغل سبوتيفاي الذكي والإيماءات',
      desc: 'تحكم مباشر في تشغيل Spotify من داخل شاشتك الرئيسية، مع إيماءات سريعة وميزة الظهور التلقائي الذكي.',
      tips: [
        'إيماءات السحب واللمس: اسحب لليسار لتخطي التراك الحالي، اسحب لليمين للرجوع للتراك السابق، واضغط ضغطة خفيفة للتشغيل أو الإيقاف.',
        'حجمان مخصصان: يمكنك الاختيار بين الكارت العريض بالكامل (Full) أو الكارت المصغر (Compact) بنفس حجم كروت العادات.',
        'الظهور الذكي (Auto): في الوضع التلقائي، يظهر الويدجيت فقط أثناء تشغيل الموسيقى، ويختفي بعد 30 دقيقة من الإيقاف للحفاظ على نظافة الشاشة.',
        'محرك متوافق: يعمل بسلاسة تامة بالماوس والتراك باد على أجهزة الماك، وباللمس المباشر على شاشات الهواتف.'
      ]
    }
  },
  {
    id: 'appearance',
    iconName: 'Palette',
    en: {
      badge: 'Customization',
      title: 'Appearance, Theme & Widgets',
      desc: 'Make the app truly yours while maintaining a clean, minimalist Apple monochrome aesthetic.',
      tips: [
        'Background Style: Choose between subtle dynamic Aurora glow or Pure Solid OLED deep black.',
        'Accent Color: Select your preferred glow tone used across buttons, checkmarks, and active indicators.',
        'Widget Reordering: Rearrange widgets (Pomodoro, Flight, Spotify) to appear in the exact order you prefer below your Mission card.',
        'Persona Avatars: Choose a minimalist profile character that matches your personality in the top header.'
      ]
    },
    ar: {
      badge: 'المظهر والتصميم',
      title: 'المظهر، التخصيص وترتيب الويدجيتس',
      desc: 'خصص مساحتك اليومية بالشكل الذي يريحك، مع الالتزام بتصميم أبل المونوكروم النقي والهادئ للعين.',
      tips: [
        'نمط الخلفية: اختر بين تأثير الأورورا الحية (توهج متدرج وناعم) أو السواد العميق السادة (OLED Solid Black).',
        'لون التمييز (Accent Color): اختر لون التوهج المفضل لديك لتمييز الأزرار، علامات الإنجاز، ومؤشرات التقدم.',
        'ترتيب الويدجيتس: رتب الويدجيتس (البومودورو، الطيران، سبوتيفاي) بالترتيب المناسب لك، وحدد حجم كل منها (عريض أو مصغر).',
        'شخصية الأفاتار: اختر من بين شخصيات بروفايل مختلفة تعبر عنك في الهيدر العلوي للتطبيق.'
      ]
    }
  },
  {
    id: 'analytics',
    iconName: 'BarChart2',
    en: {
      badge: 'Progress Tracking',
      title: 'Analytics & History',
      desc: 'Gain clear insight into your daily habits consistency, total focus hours, and historical trends over time.',
      tips: [
        'Daily Score: A unified percentage reflecting your completed habits and mission for the active day.',
        'Streak Health: View active consecutive days across every habit to maintain your momentum.',
        'Focus Log: View all logged Pomodoro blocks and total minutes invested in deep work.',
        'Tickets Vault: Inspect all past Flight Focus boarding passes collected during your journeys.'
      ]
    },
    ar: {
      badge: 'الإحصائيات والتحليلات',
      title: 'الإحصائيات وسجل النشاط والرحلات',
      desc: 'نظرة شاملة وواضحة على التزامك اليومي، معدل إنجاز العادات، وساعات التركيز التي قضيتها عبر الوقت.',
      tips: [
        'التقييم اليومي (Daily Score): مؤشر رقمي يوضح نسبة إنجازك لمهام وعادات اليوم النشط.',
        'صحة الستريك: متابعة الأيام المتتالية لكل عادة للحفاظ على استمرارية العادات الإيجابية.',
        'سجل التركيز: قائمة بجميع جلسات البومودورو المكتملة وإجمالي ساعات العمل المنجزة.',
        'سجل الرحلات: أرشيف بجميع تذاكر الطيران (Boarding Passes) التي حصلت عليها من رحلاتك السابقة.'
      ]
    }
  }
];
