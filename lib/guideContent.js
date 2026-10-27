export const guideSections = [
  {
    id: 'vision',
    iconName: 'Target',
    en: {
      badge: 'Overview & Score',
      title: 'Mission & Score Card',
      subtitle: 'Permanent goal title and daily habit completion indicator',
      desc: 'The card anchored at the top of your dashboard. It displays your chosen mission or project title and shows your live habit completion rate for the active day.',
      tips: [
        'Permanent Title: This card is not a daily task that resets each night. It remains constant as your main compass. Click the title to edit your goal or project name anytime.',
        'Daily Habit Score: The progress bar and percentage calculate dynamically based on the habits scheduled for the day you are currently viewing.',
        'Active Date Context: When looking at today, it shows today’s completion. If you navigate to another day, it displays that day’s score.'
      ]
    },
    ar: {
      badge: 'الهدف ونسبة الإنجاز',
      title: 'بطاقة الهدف ونسبة إنجاز اليوم',
      subtitle: 'عنوان مشروعك الثابت وشريط نسبة إنجاز عادات اليوم المباشر',
      desc: 'البطاقة المثبتة في أعلى الواجهة. تعرض اسم هدفك أو مشروعك وتوضح نسبة إنجازك للعادات المجدولة في اليوم المعروض.',
      tips: [
        'عنوان ثابت لا يتغير يومياً: هذه البطاقة ليست مهمة يومية تتصفر كل ليلة، بل تظل ثابتة لتمثل بوصلتك ومشروعك الأساسي. اضغط على العنوان لتعديله في أي وقت.',
        'شريط نسبة العادات: النسبة المئوية وشريط التقدم يحسبان تلقائياً بحسب العادات المجدولة لليوم الذي تتصفحه حالياً.',
        'متابعة الأيام المختلفة: عند عرض اليوم تظهر نسبة إنجاز اليوم، وعند التنقل لأي يوم سابق أو قادم تظهر نسبة ذلك اليوم تحديداً.'
      ]
    }
  },
  {
    id: 'tasks',
    iconName: 'ListChecks',
    en: {
      badge: 'Smart Rollover',
      title: 'Daily Tasks & Automatic Rollover',
      subtitle: 'Task checklist that keeps your screen clean and carries forward pending work',
      desc: 'A dedicated checklist for one-off tasks and errands, equipped with an overnight rollover mechanism.',
      tips: [
        'Completed Tasks Clear Overnight: Any task you check off stays recorded in that day’s history and automatically disappears from your active list tomorrow.',
        'Pending Tasks Rollover: If a task is not checked off, it automatically carries forward to the new day with a red "Overdue" indicator so it never gets lost.',
        'Task Actions: Type in the bottom input to add tasks, click the checkmark circle to mark done, or click the trash icon to delete.'
      ]
    },
    ar: {
      badge: 'الترحيل التلقائي',
      title: 'المهام اليومية وترحيل المؤجلات',
      subtitle: 'قائمة مهام تحفظ إنجازك وترحل المهام غير المكتملة لليوم التالي',
      desc: 'قائمة مخصصة للمهام الفردية والواجبات اليومية، مزودة بنظام ترحيل تلقائي عند بداية كل يوم جديد.',
      tips: [
        'المهام المكتملة تختفي في اليوم التالي: عند إنهاء أي مهمة وتعليمها، تظل محفوظة في سجل ذلك اليوم وتختفي تلقائياً في اليوم التالي لتبدأ بقائمة مرتبة.',
        'ترحيل المهام غير المكتملة: إذا لم تنجز مهمة، لا تضيع منك؛ بل تنتقل تلقائياً لليوم الجديد مع علامة حمراء (Overdue) لتذكيرك بها.',
        'التحكم والإضافة: اكتب في خانة الإضافة وأكد لإضافة مهمة، اضغط على الدائرة للتعليم، أو اضغط على سلة المهملات للحذف.'
      ]
    }
  },
  {
    id: 'habits',
    iconName: 'Check',
    en: {
      badge: 'Habit Engine',
      title: 'Habits & Custom Schedules',
      subtitle: 'Recurring routines with frequency settings and streak tracking',
      desc: 'Build and maintain daily or weekly routines with an adaptive schedule that only displays what is relevant today.',
      tips: [
        'Custom Frequencies: Set habits to run Daily, Weekly (select specific active days), Monthly, Yearly, or on a single date.',
        'Rest Days Do Not Break Streaks: On days a habit is not scheduled, it remains off your dashboard and your streak is unaffected.',
        'Habit Detail & Notes: Click on any habit to open its drawer and write reflections or logs for that day.',
        'Streak Count: The streak number reflects the consecutive scheduled occurrences you have completed.'
      ]
    },
    ar: {
      badge: 'محرك العادات',
      title: 'بناء العادات والجدولة المخصصة',
      subtitle: 'تتبع الروتين المتكرر مع أيام محددة وحماية الستريك في أيام الراحة',
      desc: 'نظام لتتبع الروتين اليومي أو الأسبوعي مع جدولة ذكية تعرض العادات في أيامها المستحقة فقط.',
      tips: [
        'تحديد تكرار العادة: اختر نمط التكرار: يومي، أسبوعي (تحديد أيام معينة في الأسبوع)، شهري، سنوي، أو تاريخ لمرة واحدة.',
        'أيام الراحة لا تكسر الستريك: في الأيام التي لا تكون العادة مجدولة فيها، لا تظهر على الشاشة ولا ينكسر الستريك نهائياً.',
        'الملاحظات واليوميات: اضغط على أي عادة لفتح بطاقة تفاصيلها وكتابة ملاحظاتك أو تسجيل أدائك.',
        'حساب الستريك: يعبر رقم الستريك عن عدد الأيام المجدولة المتتالية التي التزمت فيها بإنجاز العادة بنجاح.'
      ]
    }
  },
  {
    id: 'emergency',
    iconName: 'ShieldAlert',
    en: {
      badge: 'Streak Shield',
      title: 'Emergency Cards',
      subtitle: 'Earned protection shields to repair broken streaks during emergencies',
      desc: 'A fair recovery system that protects your streaks when unpredictable events interrupt your schedule.',
      tips: [
        'How Cards Are Earned: You automatically earn 1 Emergency Card every 7 consecutive streak days on a habit (at streak 7, 14, 21, etc.).',
        'How to Use: If you missed completing a habit on the active day due to an emergency, open Emergency Cards and use a card to mark it complete and protect your streak.',
        'Rule: Requires Active Streak: An Emergency Card cannot be used if a habit has a streak of 0. You must have an existing streak to protect.',
        'Anti-Duplication: Each streak milestone card grant is logged internally to ensure fair tracking.'
      ]
    },
    ar: {
      badge: 'حماية الستريك',
      title: 'كروت الطوارئ لحماية الستريك',
      subtitle: 'دروع حماية تكسبها بالتزامك لإصلاح الأيام الفائتة عند الظروف القاهرة',
      desc: 'نظام تعويض عادل يتيح لك حماية الستريك واستعادته إذا واجهتك ظروف منعتك من إكمال عادتك.',
      tips: [
        'كيف تكسب الكروت: يمنحك النظام كارت طوارئ تلقائياً كلما حققت 7 أيام ستريك متتالية في عادة معينة (عند 7، 14، 21 يوماً... وهكذا).',
        'طريقة الاستخدام: إذا فاتك إكمال عادة في يوم بسبب ظرف طارئ، افتح نافذة كروت الطوارئ واضغط استخدام لإصلاح اليوم والحفاظ على استمرارية الستريك.',
        'شرط وجود ستريك مسبق: لا يمكن استخدام كارت الطوارئ لعادة رصيد الستريك فيها صفر؛ الكارت مخصص لحماية تقدم حقيقي موجود بالفعل.',
        'سجل استحقاق آمن: يسجل التطبيق كل مرحلة تم منح كارت عليها لضمان الدقة وعدم التكرار.'
      ]
    }
  },
  {
    id: 'pomodoro',
    iconName: 'Timer',
    en: {
      badge: 'Focus Intervals',
      title: 'Pomodoro Focus Timer',
      subtitle: '25-minute work blocks with short breaks and cycle tracking',
      desc: 'A time management widget based on focused intervals to help eliminate distractions during work or study.',
      tips: [
        'The 4-Dot Milestone Meter: Each dot represents one completed 25-minute focus session. Completing four dots finishes a full 2-hour work block.',
        'Rest Intervals: Automatically guides you through a 5-minute break between sessions.',
        'Audio Notification: Plays a chime when each countdown interval finishes.',
        'Session Logging: Finished sessions and their durations are automatically recorded in Analytics.'
      ]
    },
    ar: {
      badge: 'جلسات التركيز',
      title: 'مؤقت بومودورو للعمل والتركيز',
      subtitle: 'فترات عمل مدتها 25 دقيقة مع فترات راحة قصيرة ومتابعة دورات الإنجاز',
      desc: 'أداة لتنظيم الوقت تعتمد على فترات عمل مركزة تعزل التشتيت أثناء المذاكرة أو العمل.',
      tips: [
        'مؤشر الـ 4 نقاط: تمثل كل نقطة جلسة تركيز كاملة مدتها 25 دقيقة. إكمال النقاط الأربع يمثل إتمام ساعتي عمل كاملتين.',
        'فترات الاستراحة: ينقلك المؤقت تلقائياً لفترة راحة قصيرة مدتها 5 دقائق لتجديد النشاط بين الجلسات.',
        'تنبيه صوتي: يصدر صوتاً هادئاً عند انتهاء وقت الجلسة أو الراحة.',
        'تسجيل الإحصائيات: تُحفظ كل جلسة مكتملة وعدد دقائقها تلقائياً في صفحة الإحصائيات.'
      ]
    }
  },
  {
    id: 'flight',
    iconName: 'PlaneTakeoff',
    en: {
      badge: 'Focus Simulator',
      title: 'Flight Focus Simulator',
      subtitle: 'Deep work sessions synchronized with real passenger flights in the air',
      desc: 'An immersive focus tool connecting your work session to real-time commercial passenger flights currently airborne worldwide.',
      tips: [
        'Flight Search: Search by flight number or select an active flight that matches your study or work duration.',
        '3D Window View: Displays an animated window seat with real-time daylight, wing perspective, and cloud movements.',
        'Cabin White Noise: Plays aircraft cabin ambiance to mask distracting external noises.',
        'Digital Boarding Passes: Completing a flight awards an archived digital boarding pass in your Ticket Vault.'
      ]
    },
    ar: {
      badge: 'محاكاة الطيران',
      title: 'محاكي فلايت فوكس للتركيز',
      subtitle: 'جلسات عمل متزامنة مع رحلات طيران حقيقية تحلق في الجو الآن',
      desc: 'أداة تركيز تربط وقت عملك أو دراستك برحلات طيران ركاب حقيقية تحلق في السماء حول العالم.',
      tips: [
        'البحث عن رحلة: ابحث برقم أي رحلة طيران أو اختر من الرحلات المتاحة في الجو بما يطابق مدة جلستك.',
        'شباك طائرة تفاعلي: نافذة ثلاثية الأبعاد تعرض جناح الطائرة، السحب، وضوء النهار وفق مسار الرحلة الفعلي.',
        'عزل صوتي بمحركات الطائرة: صوت هادئ لكابينة الطائرة يعمل كضوضاء بيضاء لعزل الأصوات المحيطة.',
        'تذاكر صعود تذكارية: عند إتمام وقت الرحلة بالكامل، يمنحك التطبيق تذكرة صعود رقمية تُحفظ في معرض تذاكرك.'
      ]
    }
  },
  {
    id: 'spotify',
    iconName: 'Radio',
    en: {
      badge: 'Music Controls',
      title: 'Spotify Widget & Gestures',
      subtitle: 'Dashboard playback controls with gesture navigation and auto-hide',
      desc: 'Control Spotify playback directly from your dashboard using touch or mouse gestures.',
      tips: [
        'Swipe Left: Skip to the next track.',
        'Swipe Right: Return to the previous track.',
        'Tap / Click: Toggle play and pause.',
        'Sizes & Auto-Hide: Choose between Full or Compact sizing. When set to Auto, the widget hides 30 minutes after music is paused to reduce clutter.'
      ]
    },
    ar: {
      badge: 'التحكم الموسيقي',
      title: 'مشغل سبوتيفاي والتحكم بالإيماءات',
      subtitle: 'أزرار تشغيل مباشرة مع إيماءات السحب وخاصية الإخفاء التلقائي',
      desc: 'تحكم في تشغيل Spotify مباشرة من واجهة التطبيق باستخدام إيماءات اللمس أو الماوس.',
      tips: [
        'سحب لليسار: الانتقال للتراك التالي فوراً.',
        'سحب لليمين: العودة للتراك السابق.',
        'نقرة واحدة: تشغيل أو إيقاف الموسيقى مؤقتاً.',
        'الأحجام والإخفاء: اختر بين المقاس العريض أو المصغر. وفي الوضع التلقائي يختفي الويدجيت بعد 30 دقيقة من إيقاف التشغيل للحفاظ على ترتيب الشاشة.'
      ]
    }
  },
  {
    id: 'appearance',
    iconName: 'Palette',
    en: {
      badge: 'Interface Customization',
      title: 'Appearance & Layout Settings',
      subtitle: 'Customize background style, accent color, and widget arrangement',
      desc: 'Personalize your workspace layout and colors to match your daily workflow.',
      tips: [
        'Background Modes: Choose between Aurora (ambient gradient glow) or Solid (deep black background).',
        'Accent Colors: Select the highlight color for checkmarks, buttons, and progress indicators.',
        'Widget Arrangement: Configure whether Pomodoro, Flight, and Spotify appear in Auto mode, Always visible, or Hidden, and reorder them.',
        'Profile Avatar: Pick an avatar in the top navigation bar to represent your profile.'
      ]
    },
    ar: {
      badge: 'تخصيص الواجهة',
      title: 'المظهر وإعدادات ترتيب الشاشة',
      subtitle: 'تخصيص نمط الخلفية، لون التمييز، وترتيب ظهور الويدجيتس',
      desc: 'خيارات لضبط شكل مساحة عملك وترتيب عناصرها بالطريقة التي تناسب أسلوبك اليومي.',
      tips: [
        'نمط الخلفية: اختر بين مظهر الأورورا المتدرج (Aurora) أو السواد السادة (Solid).',
        'لون التمييز (Accent Color): اختر اللون المفضل للأزرار وعلامات الإنجاز ومؤشرات التقدم.',
        'ترتيب وظهور الويدجيتس: اضبط ظهور كل ويدجيت (تلقائي، دائم، أو مخفي) وأعد ترتيبهم عمودياً بحسب أولوياتك.',
        'صورة الحساب (الأفاتار): اختر شخصيتك الرمزية المعروضة في الشريط العلوي.'
      ]
    }
  },
  {
    id: 'analytics',
    iconName: 'BarChart2',
    en: {
      badge: 'Progress Records',
      title: 'Analytics & Boarding Pass Vault',
      subtitle: 'Habit streaks, focus history logs, and collected flight passes',
      desc: 'Review your long-term consistency, track current streaks, and inspect all completed focus sessions.',
      tips: [
        'Daily Habit Scores: Tracks the percentage of scheduled habits and tasks completed across active days.',
        'Streak Counters: Shows ongoing and record streaks for each individual habit.',
        'Focus Session Log: Chronological history of every completed Pomodoro session with time and duration.',
        'Ticket Vault: Archives every collectible digital boarding pass earned from Flight Focus sessions.'
      ]
    },
    ar: {
      badge: 'سجل الإنجاز',
      title: 'الإحصائيات وأرشيف التذاكر',
      subtitle: 'متابعة الستريك، سجل جلسات التركيز، وتذاكر الطيران المجمعة',
      desc: 'مكان مخصص لمراجعة استمرارية عاداتك، متابعة الستريك القائم، واستعراض جلسات عملك السابقة.',
      tips: [
        'نسبة الإنجاز اليومية: متابعة بيانية لنسب إنجاز العادات والمهام اليومية عبر الأيام.',
        'عدادات الستريك: عرض الستريك الحالي وأفضل رقم حققته لكل عادة من عاداتك.',
        'سجل جلسات التركيز: توثيق زمني لكل جلسة بومودورو مكتملة وتاريخها وعدد دقائقها.',
        'خزانة التذاكر: أرشيف دائم يحتفظ بكل تذاكر الصعود التذكارية التي حصلت عليها من رحلات فلايت فوكس.'
      ]
    }
  },
  {
    id: 'sync',
    iconName: 'Sparkles',
    en: {
      badge: 'Storage & Sync',
      title: 'Local Storage & Cloud Sync',
      subtitle: 'Works offline locally and syncs to the cloud when connected',
      desc: 'Built on a local-first model so your data is saved immediately on your device and synchronized when connected.',
      tips: [
        'Full Offline Capability: All habits, checklists, timers, and settings function without an internet connection.',
        'Automatic Cloud Sync: When online and signed in, updates synchronize automatically with the cloud database.',
        'Web and Desktop Support: Access your dashboard through the web application or the native macOS desktop app.'
      ]
    },
    ar: {
      badge: 'الحفظ والمزامنة',
      title: 'الحفظ المحلي والمزامنة السحابية',
      subtitle: 'عمل كامل بدون إنترنت مع مزامنة سحابية تلقائية عند الاتصال',
      desc: 'يعتمد التطبيق على الحفظ المحلي المباشر على جهازك مع مزامنة التغييرات عند توفر اتصال بالإنترنت.',
      tips: [
        'العمل بدون إنترنت: تعمل العادات، المهام، المؤقتات، والإعدادات بكامل وظائفها دون الحاجة لاتصال بالإنترنت.',
        'مزامنة سحابية تلقائية: بمجرد اتصال الجهاز بالإنترنت وتسجيل حسابك، يتم مزامنة بياناتك مع السيرفر السحابي تلقائياً.',
        'توافق الويب والديسك توب: إمكانية تشغيل التطبيق عبر المتصفح أو عبر تطبيق macOS المخصص.'
      ]
    }
  }
];

export const guideFAQ = [
  {
    id: 'faq-mission',
    en: {
      q: 'Is the top card a "Daily Mission" that resets every night?',
      a: 'No. The top card represents your permanent Vision or main project title. You set it once (and edit it whenever you wish) and it remains constant every day to keep your primary objective visible. Only the score percentage and fill bar update dynamically based on the habits you check off for the viewed day.'
    },
    ar: {
      q: 'هل الكارت الموجود في أعلى الشاشة مهمة يومية تتصفر كل ليلة؟',
      a: 'لا، الكارت الموجود في أعلى الواجهة هو عنوان هدفك العام أو اسم مشروعك المستمر. تقوم بكتابته مرة واحدة ويبقى ثابتاً كل يوم ليذكرك بهدفك الأساسي ولا يتصفر يومياً. الشيء الوحيد الذي يتغير داخله هو نسبة الإنجاز وشريط التقدم، حيث يتم حسابهما تلقائياً بناءً على العادات المجدولة التي أنجزتها في اليوم المعروض.'
    }
  },
  {
    id: 'faq-habits-vs-tasks',
    en: {
      q: 'What is the exact difference between Habits and Daily Tasks?',
      a: 'Habits are recurring behavioral routines (such as reading, exercising, or deep work) tracked with frequencies, streaks, and completion analytics. Daily Tasks are individual, one-off to-do checklist items (such as errands or messages) that do not have streaks and automatically roll over if left pending.'
    },
    ar: {
      q: 'ما هو الفرق الدقيق بين العادات (Habits) والمهام اليومية (Daily Tasks)؟',
      a: 'العادات هي التزامات وروتين دوري متكرر (مثل القراءة اليومية أو التمرين) تُتابع بجدول محدد وعداد ستريك وإحصائيات استمرارية. أما المهام اليومية (Daily Tasks) فهي بنود في قائمة مهام فردية لمرة واحدة (مثل دفع فاتورة أو إرسال بريد) ليس لها ستريك وتنتقل تلقائياً لليوم التالي إذا لم تكتمل.'
    }
  },
  {
    id: 'faq-task-rollover',
    en: {
      q: 'How does overnight task rollover work?',
      a: 'Any task you complete and check off is saved in that day’s history and clears from your active list tomorrow for a clean workspace. Any task left uncompleted automatically carries over into the new day with a red "Overdue" badge so no postponed task is forgotten.'
    },
    ar: {
      q: 'كيف يعمل نظام ترحيل المهام اليومية (Overnight Rollover)؟',
      a: 'أي مهمة تضع عليها علامة إنجاز تُحفظ في سجل ذلك اليوم وتختفي تلقائياً من قائمتك في اليوم التالي لتبدأ بيوم جديد ومنظم. أما أي مهمة لم تكتمل أو أجلتها، فإنها تنتقل تلقائياً إلى قائمتك في اليوم التالي مع علامة حمراء (Overdue) لتنبيهك بإنهائها.'
    }
  },
  {
    id: 'faq-rest-days',
    en: {
      q: 'Do rest days break my habit streak?',
      a: 'No. When setting up a habit, you specify its scheduled active days (for example, 3 days a week). On days the habit is not scheduled, it does not appear on your dashboard and your streak remains safe.'
    },
    ar: {
      q: 'هل أيام الراحة تكسر الستريك في العادات؟',
      a: 'لا، أيام الراحة المجدولة لا تكسر الستريك. عندما تحدد أياماً معينة للعادة في الأسبوع (مثلاً السبت والإثنين والأربعاء)، فإن العادة لا تظهر أصلاً في الأيام غير المجدولة، ويظل الستريك محفوظاً دون أي انقطاع.'
    }
  },
  {
    id: 'faq-emergency-cards',
    en: {
      q: 'How do I earn Emergency Cards, and why can’t I use one if my streak is 0?',
      a: 'You automatically receive 1 Emergency Card every 7 consecutive streak days on a habit (at streak 7, 14, 21, etc.). You can use a card to repair a missed day on that habit. You cannot use an Emergency Card if your streak is 0 because these cards are designed to shield and protect an existing streak you have already built, not create one from scratch.'
    },
    ar: {
      q: 'كيف أكسب كروت الطوارئ، ولماذا لا يمكنني استخدام كارت إذا كان الستريك صفراً؟',
      a: 'تكسب كارت طوارئ تلقائياً كلما حققت 7 أيام ستريك متتالية في عادة معينة (عند 7، 14، 21 يوماً... وهكذا). يُستخدم الكارت لإصلاح يوم فاتك في تلك العادة بسبب ظرف قاهر. ولا يمكنك استخدام الكارت إذا كان الستريك صفراً لأن وظيفة كروت الطوارئ هي حماية ستريك حقيقي قمت ببنائه بالفعل، وليست اختلاق ستريك من العدم.'
    }
  },
  {
    id: 'faq-flight-focus',
    en: {
      q: 'What is Flight Focus, and what happens when the session ends?',
      a: 'Flight Focus anchors your focus session to an active commercial flight airborne in the real world. You select a flight matching your planned study or work duration. When the countdown completes, an authentic digital boarding pass is minted and archived in your Ticket Vault in Analytics.'
    },
    ar: {
      q: 'ما هو محاكي فلايت فوكس، وماذا يحدث عند انتهاء وقت الرحلة؟',
      a: 'فلايت فوكس يربط جلسة تركيزك برحلة طيران تجارية حقيقية تحلق في الجو حالياً، حيث تختار رحلة يتناسب وقتها مع جلسة عملك أو دراستك. وعند اكتمال وقت الجلسة حتى الهبوط، يُصدر لك التطبيق تذكرة صعود رقمية (Boarding Pass) تذكارية تُحفظ في خزانة التذاكر في صفحة الإحصائيات.'
    }
  },
  {
    id: 'faq-spotify-gestures',
    en: {
      q: 'How do gestures work on the Spotify widget?',
      a: 'On the Spotify card, swipe left to skip to the next track, swipe right to go back to the previous track, and tap or click once to toggle play and pause. The gesture engine supports mouse clicks and drags on desktop as well as touch swipes on mobile.'
    },
    ar: {
      q: 'كيف تعمل إيماءات السحب في ويدجيت سبوتيفاي؟',
      a: 'على بطاقة سبوتيفاي، اسحب لليسار لتخطي الأغنية والانتقال للتالي، واسحب لليمين للرجوع للتراك السابق، واضغط ضغطة واحدة للتشغيل أو الإيقاف المؤقت. تعمل الإيماءات بالسحب بالماوس والتراك باد على أجهزة الكمبيوتر وباللمس المباشر على شاشات الهواتف.'
    }
  },
  {
    id: 'faq-offline-sync',
    en: {
      q: 'Does the app work offline, and how does data sync work?',
      a: 'Yes. The application operates local-first: all checkmarks, tasks, and notes are saved instantly to your local device database (IndexedDB and localStorage). When an internet connection is detected and you are logged into your account, changes automatically sync with the cloud database.'
    },
    ar: {
      q: 'هل يعمل التطبيق بدون إنترنت، وكيف تتم المزامنة السحابية؟',
      a: 'نعم. يعمل التطبيق بنظام الحفظ المحلي الفوري (Local-First)؛ حيث تُحفظ كل التعديلات والعادات والمهام مباشرة على قاعدة بيانات جهازك (IndexedDB و localStorage). وعند توفر اتصال بالإنترنت وتسجيل دخولك، تتزامن بياناتك تلقائياً مع السيرفر السحابي عبر مختلف أجهزتك.'
    }
  },
  {
    id: 'faq-appearance',
    en: {
      q: 'How do I change the accent color or background mode?',
      a: 'Open Settings from the navigation bar. Under Appearance, you can switch between Aurora (ambient gradient) and Solid (deep black), and choose an accent color for checkmarks, buttons, and progress indicators.'
    },
    ar: {
      q: 'كيف أقوم بتغيير نمط الخلفية ولون التمييز (Accent Color)؟',
      a: 'افتح الإعدادات من القائمة العلوية. في قسم المظهر (Appearance)، يمكنك الاختيار بين نمط الأورورا المتدرج (Aurora) أو السواد السادة (Solid)، وتحديد لون التمييز المفضل لأزرار التطبيق وعلامات الإنجاز ومؤشرات التقدم.'
    }
  },
  {
    id: 'faq-widgets-reorder',
    en: {
      q: 'Can I reorder or hide widgets on my dashboard?',
      a: 'Yes. In Settings, you can configure each widget (Pomodoro, Flight Focus, Spotify) to be Auto (shows when active), Always visible, or Hidden. You can also toggle between Full and Compact sizes and adjust their vertical ordering.'
    },
    ar: {
      q: 'هل يمكنني إعادة ترتيب أو إخفاء الويدجيتس من الواجهة؟',
      a: 'نعم. من قائمة الإعدادات، يمكنك تخصيص حالة ظهور كل ويدجيت (بومودورو، فلايت فوكس، سبوتيفاي) بالاختيار بين الظهور التلقائي (Auto) أو الظهور الدائم (Always) أو الإخفاء (Hidden)، مع إمكانية التبديل بين الحجمين العريض والمصغر وإعادة ترتيبها عمودياً.'
    }
  },
  {
    id: 'faq-pomodoro-dots',
    en: {
      q: 'What do the 4 dots in the Pomodoro widget mean?',
      a: 'Each dot represents one completed 25-minute focus session. Completing all four dots marks the end of a full 2-hour Pomodoro block. Each finished session is logged with its duration and timestamp in your Analytics page.'
    },
    ar: {
      q: 'ماذا تعني النقاط الأربع في مؤقت بومودورو؟',
      a: 'تمثل كل نقطة جلسة تركيز كاملة مدتها 25 دقيقة. إتمام النقاط الأربع يعني إكمال دورة عمل كاملة مدتها ساعتان. وتُسجل كل جلسة منتهية مع وقتها وعدد دقائقها في صفحة الإحصائيات.'
    }
  }
];
