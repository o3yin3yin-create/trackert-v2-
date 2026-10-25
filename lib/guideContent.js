export const guideSections = [
  {
    id: 'vision',
    iconName: 'Target',
    en: {
      badge: 'Anchor & Score',
      title: 'Vision & Daily Score Card',
      subtitle: 'Your overarching compass and live daily execution progress bar.',
      desc: 'The large prominent card anchored at the top of your screen is your permanent compass. It serves two distinct purposes: displaying your overarching life vision or project title, and tracking your daily habit completion rate.',
      tips: [
        'Overarching Title: Tap directly on the card title anytime to type or rename your primary focus, current project, or seasonal vision.',
        'Dynamic Progress Bar: The score and fill line calculate automatically based on the scheduled habits you check off for the viewed day.',
        'Permanent Everyday Anchor: Unlike individual tasks, this card remains consistent each day to keep you mindful of the big picture while focusing on small daily wins.'
      ]
    },
    ar: {
      badge: 'البوصلة والتقدم',
      title: 'بطاقة الرؤية العامة ونسبة الإنجاز',
      subtitle: 'البوصلة الثابتة لمسارك العام مع شريط مباشر لنسبة إنجاز عادات اليوم.',
      desc: 'البطاقة العريضة الثابتة في أعلى شاشتك تمثل البوصلة اليومية ليومك. لها وظيفتان أساسيتان: كتابة هدفك العام أو اسم مشروعك المستمر، وعرض نسبة إنجازك اليومية فورياً.',
      tips: [
        'تعديل الهدف العام: اضغط مباشرة على النص في البطاقة في أي وقت لكتابة أو تعديل اسم مشروعك أو رؤيتك الحالية.',
        'شريط التقدم التفاعلي: النسبة المئوية وشريط التعبئة يحسبان تلقائياً بحسب العادات المجدولة التي أنجزتها في ذلك اليوم.',
        'ثابتة كل يوم: تظل البطاقة معك يومياً لتذكرك دائماً بالهدف الأكبر بينما تؤدي مهامك الصغيرة خطوة بخطوة.'
      ]
    }
  },
  {
    id: 'tasks',
    iconName: 'ListChecks',
    en: {
      badge: 'Smart Rollover',
      title: 'Daily Tasks & Overnight Rollover',
      subtitle: 'Interactive task checklist with intelligent automated rollover.',
      desc: 'A dedicated checklist for secondary tasks and commitments. Built with an automated midnight rollover engine that keeps your workspace clean while ensuring postponed tasks never get forgotten.',
      tips: [
        'Finished Tasks Disappear: Any task you complete and check off is saved in that specific day’s historical record and disappears tomorrow, giving you a fresh, uncluttered start.',
        'Unfinished Tasks Carry Over: If a task remains unchecked or postponed, it automatically rolls over into the new day with a highlighted "Rolled Over" badge so you never lose track.',
        'Link Directly to Focus: Tap the focus target icon beside any task to instantly bind it as your active Pomodoro timer goal.',
        'Instant Controls: Tap task text to edit inline, check the circle to complete, or click the trash icon to delete.'
      ]
    },
    ar: {
      badge: 'الترحيل الذكي',
      title: 'المهام اليومية ونظام الترحيل التلقائي',
      subtitle: 'قائمة مهام تفاعلية تنظف نفسها يومياً وترحل المهام المؤجلة تلقائياً.',
      desc: 'قائمة مخصصة للمهام والواجبات اليومية. تعمل بمحرك ترحيل ذكي يحافظ على هدوء الشاشة ويضمن عدم ضياع أي مهمة قمت بتأجيلها.',
      tips: [
        'المهام المنجزة تختفي في اليوم التالي: أي مهمة تنهيها وتعلّم عليها (Checked) تُحفظ في أرشيف ذلك اليوم، وتختفي تلقائياً مع بداية اليوم الجديد لتبدأ بقائمة نظيفة.',
        'المهام المؤجلة ترحل تلقائياً: إذا لم تنجز مهمة أو أجلتها، لا تقلق لن تُمسح؛ بل تنتقل تلقائياً لقائمتك في اليوم الجديد مع علامة تمييز (Rolled Over) لتنبيهك بإنهائها.',
        'ربط المهمة بالتركيز: اضغط على علامة التركيز بجانب أي مهمة لبدء مؤقت بومودورو مخصص للعمل على هذه المهمة تحديداً.',
        'إدارة سريعة: اضغط على نص المهمة لتعديله مباشرة، أو اضغط على أيقونة الحذف لإزالتها بنقرة واحدة.'
      ]
    }
  },
  {
    id: 'habits',
    iconName: 'Check',
    en: {
      badge: 'Habit Engine',
      title: 'Habit Tracking & Adaptive Scheduling',
      subtitle: 'Precision habit tracking with streak protection on unscheduled days.',
      desc: 'Track routines with custom frequencies. The scheduling engine ensures your dashboard only displays habits relevant to the active day, without penalizing streaks on off-days.',
      tips: [
        'Custom Frequencies: Schedule habits as Daily, Weekly (select specific days like Mon/Wed/Fri), Monthly, Yearly, or a one-time date.',
        'No-Break Rest Days: On days a habit is not scheduled, it remains hidden and never breaks your streak. Your progress is completely safe on rest days.',
        'Habit Notes & Journal: Tap any habit to attach an optional reflection, workout stats, or reason why you missed it.',
        'Timeline Navigation: Swipe horizontally or use the date picker to review past habits or prepare for upcoming days.'
      ]
    },
    ar: {
      badge: 'بناء العادات',
      title: 'محرك العادات والجدولة الذكية',
      subtitle: 'تتبع روتينك اليومي والأسبوعي دون كسر الستريك في أيام الراحة المجدولة.',
      desc: 'نظام دقيق لبناء وتثبيت العادات، يضمن عدم ظهور أي عادة إلا في أيامها المحددة، مع حماية الستريك في أيام الراحة.',
      tips: [
        'أنماط الجدولة المرنة: اختر يومي، أسبوعي (أيام محددة كأيام النادي أو العمل)، شهري، سنوي، أو موعد لمرة واحدة.',
        'أيام الراحة لا تكسر الستريك: في الأيام غير المجدولة، تختفي العادة من القائمة ولا ينكسر الستريك أبداً، لأن النظام يفهم أنه يوم راحة مستحق.',
        'ملاحظات العادة: اضغط على أي عادة لكتابة ملاحظة أو يوميات سريعة (مثل أوزان التمرين أو سبب التعثر).',
        'التنقل بين الأيام: اسحب لليمين أو اليسار على الشاشة لمراجعة أيام سابقة أو التخطيط للأيام القادمة.'
      ]
    }
  },
  {
    id: 'emergency',
    iconName: 'ShieldAlert',
    en: {
      badge: 'Streak Shield',
      title: 'Emergency Cards',
      subtitle: 'Fair-play streak repair shields earned through dedication.',
      desc: 'Unexpected emergencies happen. Emergency Cards are milestone-earned shields designed to repair a broken streak when life unexpectedly interrupts your routine.',
      tips: [
        'How to Earn: You automatically receive 1 Emergency Card every time you achieve 7 consecutive streak days on any habit (at streak 7, 14, 21, 28, etc.).',
        'How to Use: If you missed completing a habit on a past day, use an emergency card to repair that day and preserve your active streak.',
        'Fair Play Rules: Emergency cards cannot be used on a habit with a streak of 0. You must have built real progress to be eligible to protect it.',
        'Anti-Cheat: Each milestone grant is recorded uniquely, preventing artificial card generation.'
      ]
    },
    ar: {
      badge: 'حماية الستريك',
      title: 'كروت الطوارئ لحماية الستريك',
      subtitle: 'دروع حقيقية تكسبها بجهدك لإصلاح الستريك عند الظروف القهرية.',
      desc: 'الظروف المفاجئة واردة دائماً. كروت الطوارئ هي دروع حماية تكسبها مع كل إنجاز، وتتيح لك إصلاح يوم فاتك دون أن تفقد الستريك الذي تعبت في بنائه.',
      tips: [
        'كيف تكسبها: تكسب كارت طوارئ تلقائياً كلما حققت 7 أيام ستريك متتالية على أي عادة (عند ستريك 7، 14، 21، 28... إلخ).',
        'طريقة الاستخدام: إذا فاتك إكمال عادة في يوم سابق لظرف طارئ، استخدم كارت لإصلاح ذلك اليوم واستعادة الستريك بنجاح.',
        'قواعد عادلة: لا يمكن استخدام الكارت لعادة رصيد الستريك الخاص بها صفر (يجب أن يكون لديك ستريك حقيقي لحمايته).',
        'حماية من الغش: النظام يسجل كل كارت بمرحلته لمنع أي تكرار غير حقيقي.'
      ]
    }
  },
  {
    id: 'pomodoro',
    iconName: 'Timer',
    en: {
      badge: 'Deep Work',
      title: 'Pomodoro Interval Timer',
      subtitle: 'Structured scientific focus sessions with a 4-cycle milestone meter.',
      desc: 'The classic time-blocking method engineered into a clean widget. Alternates 25-minute deep focus sessions with 5-minute restorative breaks.',
      tips: [
        'The 4-Dot Indicator: The widget displays 4 progress dots. Each dot represents one full 25-minute focus session. Completing all 4 dots finishes a 2-hour deep-work set.',
        'Task Anchoring: Link your active timer directly to any task on your list so your objective stays visible throughout the countdown.',
        'Gentle Audio Cues: Calm, non-intrusive chimes notify you when intervals complete so you never need to watch the clock.',
        'Automatic Session History: Every finished session is automatically logged into your Analytics page with exact duration and task name.'
      ]
    },
    ar: {
      badge: 'العمل العميق',
      title: 'مؤقت بومودورو للتركيز',
      subtitle: 'جلسات عمل علمية مقسمة بعناية مع مؤشر الـ 4 نقاط التفاعلي.',
      desc: 'طريقة تنظيم الوقت الشهيرة؛ جلسات عمل عميق مدتها 25 دقيقة تفصل بينها فترات راحة قصيرة مدتها 5 دقائق لتجديد طاقتك الذهنية وعزل التشتيت.',
      tips: [
        'مؤشر الـ 4 نقاط: يحتوي الويدجيت على 4 نقاط، تمثل كل نقطة جلسة تركيز كاملة مدتها 25 دقيقة. إكمال النقاط الأربعة يعني إتمام دورة عمل كاملة (ساعتان).',
        'ربط المؤقت بالهدف: يمكنك ربط المؤقت بأي مهمة من قائمتك ليظل هدفك معلقاً أمام عينيك طوال العد التنازلي.',
        'تنبيهات صوتية هادئة: رنات إشعار ناعمة تنبهك عند بدء فترات الراحة أو العودة للعمل دون إزعاج.',
        'توثيق تلقائي: كل جلسة تكتمل تُسجل تلقائياً في صفحة الإحصائيات مع اسمها وعدد دقائقها.'
      ]
    }
  },
  {
    id: 'flight',
    iconName: 'PlaneTakeoff',
    en: {
      badge: 'Flight Simulation',
      title: 'Flight Focus Simulator',
      subtitle: 'Cinematic in-flight deep work synced with real commercial airplanes in the sky.',
      desc: 'An immersive virtual flight simulator that anchors your work session to real-world passenger airplanes currently airborne across the globe.',
      tips: [
        'Live Radar Search: Search real flights by flight number (e.g., EK1, MS777, BA112) or browse active planes worldwide to match your session duration.',
        '3D Window Seat: Relaxing 3D window seat view featuring animated aircraft wings, shifting daylight, and procedural cloud banks.',
        'Binaural Cabin Audio: Realistic aircraft cabin noise acts as sound isolation to drown out outside distractions and induce mental flow.',
        'Screensaver Mode: Fullscreen cinema mode showcasing live speed, altitude, and trajectory map.',
        'Collectible Boarding Passes: Completing your flight mints an authentic digital boarding pass archived in your tickets vault.'
      ]
    },
    ar: {
      badge: 'محاكاة الطيران',
      title: 'فلايت فوكس - التركيز مع محاكي الطيران',
      subtitle: 'جلسة تركيز سينمائية متزامنة مع رحلات طيران حقيقية تحلق في السماء الآن.',
      desc: 'تجربة غامرة وفريدة تتيح لك ربط وقت عملك برحلة طيران ركاب حقيقية تحلق في الجو الآن، لتتحدى نفسك بإنجاز أهدافك قبل هبوط الطائرة.',
      tips: [
        'رادار الطيران الحي: ابحث برقم أي رحلة حقيقية (مثل EK1 أو MS777) أو استعرض الرحلات المتاحة في الأجواء لتختار رحلة تناسب وقت عملك.',
        'شباك الطائرة 3D: مقعد افتراضي بجانب الشباك يعرض جناح الطائرة، حركة السحب الواقعية، وتغير ضوء النهار حسب موقع الطائرة في العالم.',
        'عازل صوت الكابينة: صوت هادئ لمحركات الطائرة في الخلفية (White Noise) يساعد على عزل الضوضاء الخارجية والدخول في حالة الاستغراق (Flow).',
        'شاشة توقف سينمائية: وضع الشاشة الكاملة يعرض مسار الخريطة، السرعة، والارتفاع في الزمن الفعلي.',
        'تذاكر صعود تذكارية: عند إنهاء الرحلة، يصدر التطبيق تذكرة صعود سينمائية (Boarding Pass) تضاف لمعرض تذاكرك التذكاري.'
      ]
    }
  },
  {
    id: 'spotify',
    iconName: 'Radio',
    en: {
      badge: 'Live Audio',
      title: 'Spotify Player & Gesture Controls',
      subtitle: 'Streamlined Spotify controls with touch/mouse swipe gestures and smart auto-hide.',
      desc: 'Direct Spotify playback integration inside your dashboard. Control your audio effortlessly with tactile gestures and distraction-free visibility rules.',
      tips: [
        'Swipe Left: Skip to the next track instantly.',
        'Swipe Right: Return to the previous track.',
        'Tap / Click: Toggle Play or Pause with instantaneous visual feedback.',
        'Size Modes: Choose Full-width (with album art and live progress bar) or Compact mode (matching single habit card size).',
        'Smart Auto-Hide: In Auto mode, the widget appears when music is playing and automatically disappears 30 minutes after pausing to keep your screen tidy.',
        'Unified Pointer Engine: Works natively with mouse clicks and drags on Mac desktop as well as touch swipes on mobile.'
      ]
    },
    ar: {
      badge: 'الربط الموسيقي',
      title: 'مشغل سبوتيفاي الذكي بالإيماءات',
      subtitle: 'تحكم مباشر في تشغيل الموسيقى بإيماءات السحب وميزة الإخفاء التلقائي الذكي.',
      desc: 'ويدجيت مدمج يتيح لك التحكم الكامل في تشغيل Spotify من داخل شاشتك الرئيسية، مع إيماءات سحب سريعة ومظهر مونوكروم هادئ.',
      tips: [
        'سحب لليسار (Swipe Left): تخطي للتراك التالي فوراً.',
        'سحب لليمين (Swipe Right): رجوع للتراك السابق.',
        'ضغطة خفيفة (Tap / Click): تشغيل أو إيقاف مؤقت مع أنيميشن تأكيد بصري.',
        'حجمان مخصصان: يمكنك الاختيار بين الكارت العريض (Full) أو الكارت المصغر (Compact) بنفس حجم كروت العادات.',
        'الإخفاء الذكي (Auto): يظهر الويدجيت أثناء التشغيل، ويختفي تلقائياً بعد 30 دقيقة من إيقاف الأغنية للحفاظ على نظافة شاشتك.',
        'محرك توافق شامل: يعمل بالماوس والتراك باد على أجهزة الماك، وباللمس المباشر على شاشات الهواتف.'
      ]
    }
  },
  {
    id: 'appearance',
    iconName: 'Palette',
    en: {
      badge: 'Design & Style',
      title: 'Appearance, Theme & Widget Setup',
      subtitle: 'Refined Apple monochrome aesthetic with subtle accent personalization.',
      desc: 'Tailor your daily workspace to your personal preferences while upholding a distraction-free, zero-clutter monochrome design philosophy.',
      tips: [
        'Background Style: Choose between gentle animated Aurora ambient glow or Pure Solid OLED deep black.',
        'Accent Color: Select your preferred glow tone for active checkmarks, button highlights, and progress lines.',
        'Widget Reordering: Rearrange widgets (Pomodoro, Flight, Spotify) in your preferred vertical order below your Vision card.',
        'Widget Visibility & Sizes: Choose whether widgets appear in Auto mode, Always visible, or Hidden, and toggle between Full or Compact sizing.',
        'Persona Avatars: Choose a minimalist profile character that best represents you in the top navigation header.'
      ]
    },
    ar: {
      badge: 'المظهر والتصميم',
      title: 'المظهر، التخصيص وترتيب الشاشة',
      subtitle: 'تصميم أبل المونوكروم النقي مع خيارات تخصيص هادئة ومريحة للعين.',
      desc: 'خصص مساحتك اليومية بالشكل الذي يريحك، مع الالتزام التام بفلسفة البساطة وهدوء الألوان ومنع التشتيت البصري.',
      tips: [
        'نمط الخلفية: اختر بين توهج الأورورا المتدرج الناعم (Aurora) أو السواد الحالك السادة (OLED Solid Black).',
        'لون التمييز (Accent Color): اختر لون التوهج الخاص بالأزرار، علامات الإنجاز، ومؤشرات التقدم.',
        'ترتيب الويدجيتس: يمكنك إعادة ترتيب ظهور الويدجيتس (البومودورو، الطيران، سبوتيفاي) بالترتيب المناسب لك تحت كارت الهدف.',
        'خيارات الظهور والمقاس: اختر ظهور كل ويدجيت (تلقائي، دائماً، أو مخفي)، ومقاسه (عريض أو مصغر).',
        'شخصيات الأفاتار: اختر من بين شخصيات بروفايل مونوكروم مختلفة لتمثيلك في الهيدر العلوي.'
      ]
    }
  },
  {
    id: 'analytics',
    iconName: 'BarChart2',
    en: {
      badge: 'Insights & Logs',
      title: 'Analytics, Focus Logs & Tickets Vault',
      subtitle: 'Historical trends, streak tracking, and focus souvenir archive.',
      desc: 'Your central hub for reviewing daily discipline, monitoring long-term streaks, and browsing all your completed focus milestones.',
      tips: [
        'Daily Completion Score: A unified percentage reflecting all scheduled habits and tasks completed for that day.',
        'Streak Health: Live counters tracking consecutive days for each routine to maintain discipline.',
        'Logged Focus Sessions: A timestamped chronological journal of every completed Pomodoro block.',
        'Boarding Pass Vault: A permanent gallery storing every souvenir Flight Focus boarding pass you earned.'
      ]
    },
    ar: {
      badge: 'الإحصائيات والتوثيق',
      title: 'لوحة الإحصائيات وسجل الإنجاز والرحلات',
      subtitle: 'تقارير أداء شاملة، متابعة الستريك، ومعرض تذاكر الطيران التذكارية.',
      desc: 'مركزك الشامل لمراجعة أدائك الأسبوعي والشهري، التأكد من استمرارية الستريك، واستعراض سجل جلسات التركيز المكتملة.',
      tips: [
        'التقييم اليومي (Daily Score): مؤشر رقمي يوضح نسبة إنجازك لمهام وعادات اليوم النشط.',
        'صحة الستريك: متابعة دقيقة لعدد الأيام المتتالية لكل عادة لتحفيزك على عدم كسر السلسلة.',
        'سجل جلسات التركيز: توثيق زمني لكل جلسة بومودورو مكتملة وإجمالي ساعات العمل المنجزة.',
        'خزانة تذاكر الطيران: أرشيف دائم يضم كل تذاكر الصعود (Boarding Passes) التي حصلت عليها من رحلاتك.'
      ]
    }
  },
  {
    id: 'sync',
    iconName: 'Sparkles',
    en: {
      badge: 'Local-First',
      title: 'Offline-First Engine & Hybrid Cloud Sync',
      subtitle: 'Instant zero-lag local performance paired with seamless multi-device cloud synchronization.',
      desc: 'Designed with a local-first philosophy: every click, checkmark, and session saves instantaneously on your device with zero network lag, then syncs smoothly to the cloud.',
      tips: [
        'Full Offline Support: The app works 100% without an internet connection (ideal for airplanes, travels, or outages).',
        'Silent Background Sync: Whenever your connection restores, pending mutations automatically sync to the database.',
        'Cross-Platform: Seamlessly synchronizes habits, streaks, and sessions across the web and native macOS Desktop app.'
      ]
    },
    ar: {
      badge: 'العمل دون إنترنت',
      title: 'المزامنة الهجينة والعمل الفوري دون إنترنت',
      subtitle: 'استجابة لحظية بدون أي بطء، مع مزامنة سحابية هادئة وتوافق بين جميع الأجهزة.',
      desc: 'مبني بنظام محلي فوري (Local-First)؛ كل نقرة، تسجيل عادة، أو مؤقت يحفظ فوراً على جهازك دون أي انتظار للسيرفر، ثم يُزامن بهدوء مع السحابة عند توفر الإنترنت.',
      tips: [
        'دعم كامل بدون إنترنت: التطبيق يعمل بكامل مميزاته 100% دون الحاجة لإنترنت (مثالي في الطائرات، السفر، أو انقطاع الشبكة).',
        'مزامنة سحابية صامتة: بمجرد اتصال جهازك بالإنترنت، تُرفع التعديلات تلقائياً وتحدث بياناتك.',
        'توافق المنصات: تنتقل عاداتك وسجلاتك وتذاكرك فورياً بين تطبيق الماك وموقع الويب دون أي تعارض.'
      ]
    }
  }
];
