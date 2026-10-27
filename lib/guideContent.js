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
        'ترحيل المهام غير المكتملة: إذا لم تنجز مهمة، لا تضيع منك؛ بل تنتقل تلقائياً لليوم الجديد مع علامة حمراء (Overdue) لتنبيهك بها.',
        'التحكم والإضافة: اكتب في خانة الإضافة وأكد لإضافة مهمة، اضغط على الدائرة للتعليم، أو اضغط على سلة المهملات للحذف.'
      ]
    }
  },
  {
    id: 'habits',
    iconName: 'Check',
    en: {
      badge: 'Habit Engine & Types',
      title: 'Habits & Scheduled Event Types',
      subtitle: 'Recurring routines with frequency settings, categories, duration, and privacy',
      desc: 'Build and maintain daily or scheduled routines with custom categories (Lectures, Meetings, Exams, Workouts, Study), start times, duration, and privacy options.',
      tips: [
        'Custom Frequencies: Set habits to run Daily, Weekly (select specific active days), Monthly, Yearly, or on a single date.',
        'Categories & Event Types: Classify your habits as Lecture, Meeting, Exam, Workout, Study, or general Habit. This informs smart labels and live status cards for friends.',
        'Time, Duration & Location: Set an exact start time (e.g. 02:00 PM), duration (e.g. 2h or 45m), and optional location (hall, room, link).',
        'Automatic Live Presence: At the scheduled time, scheduled events automatically appear on your friends presence dashboard as ongoing (e.g. "In lecture: Test · Ends in 25 min") even without opening the app.',
        'Private Habit Toggle: Enable "Private habit" to ensure a sensitive lecture or habit never appears to any friend, regardless of your global privacy settings.',
        'Scheduled Days Behavior: In scheduled habits (e.g. 3 days a week), the habit is only active on its designated days without breaking your streak on other days.',
        'Streak Count: The streak number reflects consecutive completed scheduled occurrences.'
      ]
    },
    ar: {
      badge: 'محرك العادات والتصنيفات',
      title: 'بناء العادات وتصنيفات المواعيد',
      subtitle: 'تتبع الروتين المتكرر مع تحديد الأيام، المدة، التصنيف، وخيارات الخصوصية',
      desc: 'نظام متكامل لجدولة الروتين اليومي والأسبوعي مع تصنيفات ذكية (محاضرات، اجتماعات، امتحانات، تمارين، مذاكرة) وتحديد الوقت والمكان وخيارات الخصوصية.',
      tips: [
        'تحديد تكرار العادة: اختر نمط التكرار: يومي، أسبوعي (تحديد أيام معينة في الأسبوع)، شهري، سنوي، أو تاريخ لمرة واحدة.',
        'تصنيفات المواعيد (Categories): صنف كل عادة حسب طبيعتها (محاضرة Lecture، اجتماع Meeting، امتحان Exam، تمرين Workout، مذاكرة Study، أو عادة عامة Habit). هذا التصنيف يحدد شكل وظهور الحالة لصحابك.',
        'الوقت والمدة والمكان: حدد ميعاد البدء (مثلاً 02:00 PM)، المدة المتوقعة (مثل 2h أو 45m)، ومكان الانعقاد (قاعة، مبنى، أو رابط).',
        'ظهور تلقائي في الميعاد: في ميعاد الحدث المجدول، يظهر الحدث تلقائياً لأصدقائك كحالة نشطة ومباشرة (مثل "في محاضرة: متبقي 25 دقيقة") حتى لو لم تكن متصلاً بالتطبيق لحظياً.',
        'خيار العادة الخاصة (Private): يمكنك تفعيل خيار "عادة خاصة" عند إنشاء العادة أو تعديلها لمنع ظهورها نهائياً لأي صديق مهما كانت إعدادات الخصوصية العامة.',
        'آلية العادات المجدولة: العادات المجدولة تظهر في أيامها المحددة فقط، وباقي أيام الأسبوع لا تظهر فيها ولا تؤثر على الستريك.',
        'حساب الستريك: يعبر رقم الستريك عن عدد الأيام المجدولة المتتالية التي التزمت فيها بإنجاز العادة بنجاح.'
      ]
    }
  },
  {
    id: 'friends',
    iconName: 'Users',
    en: {
      badge: 'Social Presence & Study Hub',
      title: 'Friends & Live Study Presence',
      subtitle: 'Real-time focus status, study invitations, and collaborative accountability',
      desc: 'Connect with friends and study partners to see real-time focus activities, join synchronized study sessions, and keep each other motivated.',
      tips: [
        'Live Activity Presence: Friends presence cards dynamically show what they are doing right now: live Pomodoro timer countdown & cycle, real-time airborne flight with route & arrival time, ongoing lectures/meetings/exams with remaining time, active Spotify listening, or completed habits.',
        'Music Badges: When listening to Spotify while studying, in a lecture, or on a flight, a music indicator and live song details are integrated into the presence card.',
        'Interactive Study CTAs: Tap "Ask to study" on any friend to send an immediate in-app invitation. The recipient receives an instant notification with a one-click CTA to launch a Pomodoro session or join a flight.',
        'Nudges & Cheers: Send nudges to keep friends on track or cheer them on their achievements.',
        'Granular Privacy Settings: Controlled directly inside Settings. Toggle Ghost Mode to appear completely idle, or selectively allow/hide Pomodoro sessions, Flights, Scheduled Habits & Lectures, Completed Habits, or Spotify.',
        'Under Construction Security: The Friends hub features a security access password (admin2005) during preview and testing.'
      ]
    },
    ar: {
      badge: 'التواجد المباشر والشبكة',
      title: 'الأصدقاء والتواجد المباشر والمذاكرة معاً',
      subtitle: 'متابعة نشاط أصدقائك اللحظي، إرسال دعوات المذاكرة، والتنافس الإيجابي',
      desc: 'شبكة اجتماعية إنتاجية تربطك بأصدقائك لمتابعة جلسات التركيز المباشرة، الانضمام لمذاكرة مشتركة، والحفاظ على الاستمرارية.',
      tips: [
        'التواجد المباشر التفاعلي (Live Presence): يعرض كارت الصديق ما يفعله بدقة في الوقت الفعلي: مؤقت بومودورو الحالي والدورة، رحلة الطيران المحلقة في الجو ومسارها ووقت الهبوط، المحاضرة أو الاجتماع القائم حالياً مع الدقائق المتبقية، الاستماع لسبوتيفاي، أو العادات المنجزة.',
        'شارة الموسيقى المدمجة: إذا كان صديقك يستمع لسبوتيفاي أثناء وجوده في محاضرة أو على متن رحلة طيران، تظهر شارة الموسيقى مع اسم التراك المباشر على نفس الكارت.',
        'دعوات المذاكرة التفاعلية: اضغط "Ask to study" على أي صديق لإرسال دعوة مذاكرة فورية تصله كإشعار داخل التطبيق، مع زر إجراء مباشر (CTA) لبدء جلسة بومودورو متزامنة فوراً.',
        'النكز والتشجيع (Nudge & Cheer): أرسل نكزاً لتذكير صديقك بالتركيز أو شاركه التحفيز والتشجيع.',
        'إعدادات الخصوصية الدقيقة: موجودة داخل صفحة الإعدادات (Settings). يمكنك تفعيل وضع التخفي (Ghost Mode) للظهور كغير متصل، أو تفعيل/تعطيل مشاركة جلسات التركيز، الرحلات، المحاضرات والعادات المجدولة، العادات المكتملة، أو سبوتيفاي.',
        'قفل الصفحة المؤقت: صفحة الأصدقاء محمية بكلمة مرور (admin2005) أثناء فترة التجربة والتطوير.'
      ]
    }
  },
  {
    id: 'emergency',
    iconName: 'ShieldAlert',
    en: {
      badge: 'Streak Shield',
      title: 'Emergency Cards',
      subtitle: 'Single streak shield per habit earned through dedication',
      desc: 'A fair recovery system that protects your streaks when unpredictable events interrupt your schedule.',
      tips: [
        'One Card Maximum: Each habit can hold a maximum of 1 Emergency Card at any time, even if your streak reaches 300 days. You do not hoard multiple cards.',
        'How It Is Earned: You receive 1 Emergency Card once you achieve a 7-day streak on that habit.',
        'Replacement Card: You only become eligible to earn a replacement card after you actually use and consume your current card and achieve another 7-day streak cycle.',
        'Rule: Requires Active Streak: An Emergency Card cannot be used if a habit has a streak of 0. You must have an existing streak to protect.',
        'How to Use: If you missed completing a habit on the active day due to an emergency, open Emergency Cards and use your card to repair that day and keep your streak intact.'
      ]
    },
    ar: {
      badge: 'حماية الستريك',
      title: 'كروت الطوارئ لحماية الستريك',
      subtitle: 'كارت حماية واحد كحد أقصى لكل عادة تكسبه بالتزامك لإصلاح الأيام الفائتة',
      desc: 'نظام تعويض عادل يتيح لك حماية الستريك واستعادته إذا واجهتك ظروف منعتك من إكمال عادتك.',
      tips: [
        'كارت واحد كحد أقصى: لا تكسب سوى كارت طوارئ واحد فقط لكل عادة مهما وصل الستريك (حتى لو 300 يوم)، ولا يمكن تجميع أو تخزين كروت متعددة لنفس العادة.',
        'كيف تكسب الكارت: بمجرد وصول الستريك في عادة معينة إلى 7 أيام متتالية، تحصل على كارت الحماية الخاص بها.',
        'كسب كارت بديل: لن يمنحك النظام كارت جديد لنفس العادة إلا بعد أن تستخدم الكارت الحالي وتستهلكه فعلياً، ثم تواصل الالتزام بدورة ستريك جديدة.',
        'شرط وجود ستريك مسبق: لا يمكن استخدام كارت الطوارئ لعادة رصيد الستريك فيها صفر؛ الكارت مخصص لحماية تقدم حقيقي موجود بالفعل.',
        'طريقة الاستخدام: إذا فاتك إكمال عادة في يوم بسبب ظرف طارئ، افتح نافذة كروت الطوارئ واضغط استخدام لإصلاح اليوم والحفاظ على استمرارية الستريك.'
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
        'Collaborative Sync: Accept an "Ask to study" notification from a friend to start a synchronized Pomodoro session with them.',
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
        'المذاكرة المتزامنة: عند استلام إشعار دعوة مذاكرة من صديق، يمكنك بنقرة واحدة إطلاق جلسة بومودورو والتركيز معاً.',
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
        'Social Flight Presence: Friends see your active flight, route, and estimated time of arrival live on their dashboard.',
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
        'مشاركة الرحلة مع الأصدقاء: تظهر رحلتك ومسارها الجوي ووقت هبوطها المتوقع مباشرة لأصدقائك على شاشاتهم.',
        'تذاكر صعود تذكارية: عند إتمام وقت الرحلة بالكامل، يمنحك التطبيق تذكرة صعود رقمية تُحفظ في معرض تذاكرك.'
      ]
    }
  },
  {
    id: 'spotify',
    iconName: 'Radio',
    en: {
      badge: 'Music Controls & Account Sync',
      title: 'Spotify Widget & Account Integration',
      subtitle: 'Dashboard playback controls, gesture navigation, and cloud account sync',
      desc: 'Control Spotify playback directly from your dashboard with account-level token syncing across web and desktop apps.',
      tips: [
        'Account-Level Link: Spotify authentication is saved directly to your user account, seamlessly syncing your status across the web and native desktop app without repeated logins.',
        'Swipe Left: Skip to the next track.',
        'Swipe Right: Return to the previous track.',
        'Tap / Click: Toggle play and pause.',
        'Presence Music Badges: If enabled in privacy, friends can see what song you are listening to in real time.',
        'Sizes & Auto-Hide: Choose between Full or Compact sizing. When set to Auto, the widget hides 30 minutes after music is paused to reduce clutter.'
      ]
    },
    ar: {
      badge: 'التحكم الموسيقي والمزامنة',
      title: 'مشغل سبوتيفاي والربط بالحساب',
      subtitle: 'أزرار تشغيل مباشرة مع إيماءات السحب والربط الموحد بالحساب',
      desc: 'تحكم في تشغيل Spotify مباشرة من واجهة التطبيق مع ربط توكن الموسيقى بحسابك ليعمل عبر الويب والديسكتوب بسلاسة.',
      tips: [
        'الربط الموحد بالحساب: يتم ربط توكن سبوتيفاي بحسابك السحابي نفسه، مما يضمن عمل الموسيقى وتحديثها بين نسخة الويب وتطبيق الماك المكتبي تلقائياً دون الحاجة لتسجيل الدخول من كل جهاز.',
        'سحب لليسار: الانتقال للتراك التالي فوراً.',
        'سحب لليمين: العودة للتراك السابق.',
        'نقرة واحدة: تشغيل أو إيقاف الموسيقى مؤقتاً.',
        'شارة التواجد للأصدقاء: عند السماح في إعدادات الخصوصية، يظهر التراك الذي تستمع له لأصدقائك في نفس كارت نشاطك المباشر.',
        'الأحجام والإخفاء: اختر بين المقاس العريض أو المصغر. وفي الوضع التلقائي يختفي الويدجيت بعد 30 دقيقة من إيقاف التشغيل للحفاظ على ترتيب الشاشة.'
      ]
    }
  },
  {
    id: 'appearance',
    iconName: 'Palette',
    en: {
      badge: 'Interface & Typography',
      title: 'Appearance, Fonts & Layout Settings',
      subtitle: 'Unified typography, background modes, accent colors, and widget layout',
      desc: 'Personalize your workspace aesthetic with unified typography, background styles, accent colors, and privacy settings.',
      tips: [
        'Unified Typography: Space Grotesk (weights 500 & 700) powers all UI titles, buttons, and labels. JetBrains Mono (weights 500 & 700) powers @usernames, numbers, and countdown timers.',
        'Background Modes: Choose between Aurora (ambient gradient glow) or Solid (deep black background).',
        'Accent Colors: Select the highlight color for checkmarks, buttons, and progress indicators.',
        'Widget Arrangement: Configure whether Pomodoro, Flight, and Spotify appear in Auto mode, Always visible, or Hidden, and reorder them.',
        'Privacy Settings Shortcut: Access granular privacy controls for friends directly within the Settings menu.'
      ]
    },
    ar: {
      badge: 'تخصيص الواجهة والخطوط',
      title: 'المظهر، الخطوط وإعدادات الترتيب',
      subtitle: 'توحيد الخطوط الاحترافية، نمط الخلفية، لون التمييز، وخيارات الخصوصية',
      desc: 'خيارات لضبط شكل مساحة عملك وترتيب عناصرها مع الخطوط الموحدة وإعدادات الخصوصية الشاملة.',
      tips: [
        'توحيد الخطوط القياسية: خط Space Grotesk (أوزان 500 و700) لكافة النصوص والعناوين والأزرار. وخط JetBrains Mono (أوزان 500 و700) لأسماء المستخدمين (@username) والأرقام والعدادات.',
        'نمط الخلفية: اختر بين مظهر الأورورا المتدرج (Aurora) أو السواد السادة (Solid).',
        'لون التمييز (Accent Color): اختر اللون المفضل للأزرار وعلامات الإنجاز ومؤشرات التقدم.',
        'ترتيب وظهور الويدجيتس: اضبط ظهور كل ويدجيت (تلقائي، دائم، أو مخفي) وأعد ترتيبهم عمودياً بحسب أولوياتك.',
        'الوصول للخصوصية: يمكنك ضبط وتعديل خيارات خصوصية الأصدقاء مباشرة من داخل قائمة الإعدادات (Settings).'
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
    id: 'faq-friends-presence',
    en: {
      q: 'How does live presence on the Friends screen work, and what can my friends see?',
      a: 'The Friends tab displays a real-time presence feed calculated live on the server. If you are in an active Pomodoro session, friends see your timer countdown and current cycle. If you are airborne on Flight Focus, they see your origin, destination, and arrival time. If you have an ongoing scheduled lecture, meeting, or exam, it takes priority and shows your remaining time. If you are listening to Spotify, friends see your song and artist. If you are not active, it displays your last seen time. You can customize or hide every single one of these via Privacy settings.'
    },
    ar: {
      q: 'كيف يعمل التواجد المباشر (Presence) في صفحة الأصدقاء، وما الذي يظهر لصحابي؟',
      a: 'تعتمد صفحة الأصدقاء على حساب النشاط الفعلي والحي على السيرفر لحظة بلحظة. إذا كنت في جلسة بومودورو يظهر لأصدقائك عداد الوقت ودورة التركيز الحالية. وإذا كنت في رحلة طيران محلقة يظهر خط سير الرحلة والوقت المتبقي للهبوط. وإذا كنت في ميعاد محاضرة أو ميتنج أو امتحان مجدول فيظهر كحدث قائم مع الدقائق المتبقية. وإذا كنت تستمع لسبوتيفاي تظهر شارة الموسيقى واسم التراك. وفي حالة عدم وجود نشاط يظهر آخر وقت تواجد لك. ويمكنك تخصيص أو إخفاء أي من هذه الحالات بالكامل من إعدادات الخصوصية.'
    }
  },
  {
    id: 'faq-friends-privacy',
    en: {
      q: 'How do I control my privacy with friends, and what does Ghost Mode do?',
      a: 'Open Settings from the navigation bar. You have granular toggles to enable or disable sharing for: Focus Sessions, Focus Flights, Scheduled Habits & Lectures, Completed Habits, and Spotify. Additionally, enabling "Ghost Mode" makes you appear completely idle/offline to all friends without needing to modify individual switches.'
    },
    ar: {
      q: 'كيف أتحكم في خصوصيتي وماذا يفعل وضع التخفي (Ghost Mode)؟',
      a: 'من خلال قائمة الإعدادات (Settings)، ستجد قسماً مخصصاً لخصوصية الأصدقاء يحتوي على أزرار تشغيل وإيقاف لكل عنصر بشكل مستقل: جلسات التركيز، رحلات الطيران، المحاضرات والعادات المجدولة، العادات المكتملة، وسبوتيفاي. بالإضافة لذلك، يمكنك تفعيل "وضع التخفي" (Ghost Mode) ليظهر حسابك كغير متصل (Idle) تماماً لجميع أصدقائك دون الحاجة لتعديل كل خيار على حدة.'
    }
  },
  {
    id: 'faq-private-habit',
    en: {
      q: 'Can I keep a specific scheduled habit completely hidden from friends?',
      a: 'Yes. When creating or editing any habit, you can toggle on "Private habit". When enabled, that specific habit is strictly hidden and will never be shared with or shown to friends, even if your global Scheduled Habits privacy setting is set to public.'
    },
    ar: {
      q: 'هل يمكنني جعل عادة مجدولة معينة خاصة تماماً ولا تظهر لصحابي؟',
      a: 'نعم بالتأكيد. عند إضافة أي عادة جديدة أو تعديل عادة حالية، ستجد خيار "عادة خاصة" (Private habit). بتفعيل هذا الخيار، لن تظهر هذه العادة أو المحاضرة نهائياً لأي صديق حتى وإن كنت سامحاً بمشاركة العادات المجدولة في إعدادات الخصوصية العامة.'
    }
  },
  {
    id: 'faq-ask-to-study',
    en: {
      q: 'How does "Ask to Study" work and what happens when I receive an invitation?',
      a: 'When viewing a friend on the Friends screen, tapping "Ask to study" sends them an in-app notification. When they open the app, they receive an alert with direct action buttons (CTA) to instantly launch a synchronized Pomodoro session or hop on a flight with you, rather than just a passive notification.'
    },
    ar: {
      q: 'كيف تعمل ميزة "Ask to Study" وماذا يحدث عندما تصلني دعوة؟',
      a: 'عند الضغط على "Ask to study" في كارت أي صديق، يرسل التطبيق دعوة مذاكرة فورية تصله كإشعار داخل التطبيق. وبمجرد فتح التطبيق، يظهر له إشعار تفاعلي يحتوي على زر إجراء مباشر (CTA) لبدء جلسة بومودورو فوراً أو الانضمام لنفس رحلة التركيز بدلاً من مجرد إشعار للقراءة.'
    }
  },
  {
    id: 'faq-spotify-account',
    en: {
      q: 'Is Spotify connected to my device or my user account?',
      a: 'Spotify is securely linked directly to your user account in the cloud database. Once connected, your authorization and playback synchronize seamlessly across all your devices, whether you access bokra through the web application or the native macOS desktop app, without needing to re-authenticate on each device.'
    },
    ar: {
      q: 'هل ربط سبوتيفاي يتم بالجهاز أم بالحساب نفسه؟',
      a: 'ربط سبوتيفاي أصبح مربوطاً ومحفوظاً مباشرة بحسابك السحابي وليس مجرد كوكيز على جهاز معين. بمجرد ربط سبوتيفاي بحسابك، يعمل التزامن والتحكم الموسيقي تلقائياً بين نسخة الويب وتطبيق الماك المكتبي دون الحاجة لإعادة تسجيل الدخول في كل جهاز.'
    }
  },
  {
    id: 'faq-habit-categories',
    en: {
      q: 'What are Habit Categories (Lectures, Meetings, Exams) and how do they appear to friends?',
      a: 'Habit categories allow you to label your events appropriately instead of treating everything as a generic habit. When you schedule an event with a time and duration, friends see exact status badges like "In a lecture: Physics · Ends in 20 min" or "In a meeting", and prior to the event they see "Upcoming Lecture at 02:00 PM".'
    },
    ar: {
      q: 'ما هي تصنيفات العادات (محاضرة، ميتنج، امتحان) وكيف تظهر للأصدقاء؟',
      a: 'تتيح لك تصنيفات العادات تحديد طبيعة نشاطك بدقة بدلاً من أن يظهر كل شيء كـ "عادة مجدولة". فعند تحديد عادة بنوع "محاضرة" أو "ميتنج" مع وقت ومدة، تظهر لصحابك في وقتها بالشكل المخصص مثل: "في محاضرة: فيزياء · متبقي 20 دقيقة"، وقبل موعدها تظهر كـ "محاضرة مجدولة الساعة 02:00 PM".'
    }
  },
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
      q: 'Is there a "Rest Day" feature, and how do scheduled habits handle non-active days?',
      a: 'No, there is no standalone "rest day" button or mode. This behavior applies strictly to Scheduled Habits. When you set a habit to run on specific days (such as 3 designated days a week, or a monthly date), the habit is only active and displayed on those scheduled days. On unscheduled days, the habit is not shown on your dashboard and does not break your streak. Standard daily habits must be completed every day to keep their streak alive.'
    },
    ar: {
      q: 'هل توجد ميزة لأيام الراحة تمنع كسر الستريك؟ وكيف تعمل في العادات المجدولة؟',
      a: 'لا توجد ميزة منفصلة أو زر مخصص باسم "أيام راحة" لحماية الستريك. هذا المفهوم ينطبق حصرياً على العادات المجدولة (Scheduled Habits)؛ فعندما تحدد للعادة أياماً معينة في الأسبوع (مثلاً السبت والإثنين والأربعاء)، فإن العادة تكون مطلوبة وتظهر في هذه الأيام فقط. في باقي الأيام غير المجدولة، لا تظهر العادة في الواجهة ولا يُحسب ذلك كيوم مفقود، وبالتالي يستمر الستريك المحسوب لأيامها المجدولة دون انقطاع، بينما العادات اليومية العادية يجب إنجازها يومياً للحفاظ على الستريك.'
    }
  },
  {
    id: 'faq-emergency-cards',
    en: {
      q: 'How do Emergency Cards work, and how many cards can I hold per habit?',
      a: 'You can hold a maximum of 1 Emergency Card per habit at any time. Once a habit reaches a 7-day streak, you receive 1 card. You cannot hoard or stack multiple cards for the same habit, even if your streak reaches 300 days. You only become eligible to earn a replacement card after you actually use and consume your existing card and continue maintaining your streak. Additionally, an Emergency Card cannot be used if your streak is 0, because its purpose is to protect an existing streak that you have already built.'
    },
    ar: {
      q: 'كيف تعمل كروت الطوارئ، وكم كارتاً يمكنني امتلاكه لكل عادة؟',
      a: 'لا يمكنك امتلاك سوى كارت طوارئ واحد فقط كحد أقصى لكل عادة مهما وصل الستريك (حتى لو وصل 300 يوم). بمجرد أن يصل الستريك إلى 7 أيام، تحصل على الكارت الخاص بالعادة ويظل في رصيدك. ولن يمنحك النظام كارتاً بديلاً إلا بعد أن تستخدم الكارت الحالي وتستهلكه فعلياً عند الحاجة وتواصل الالتزام بالستريك. ولا يمكن استخدام الكارت إذا كان الستريك صفراً لأن وظيفته هي حماية واستعادة ستريك حقيقي قمت ببنائه بالفعل.'
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
      q: 'How do I change the accent color, background mode, or fonts?',
      a: 'Open Settings from the navigation bar. Under Appearance, you can switch between Aurora (ambient gradient) and Solid (deep black), and choose an accent color for checkmarks, buttons, and progress indicators. All headings and buttons cleanly adhere to Space Grotesk, while metrics and @usernames adhere to JetBrains Mono.'
    },
    ar: {
      q: 'كيف أقوم بتغيير نمط الخلفية ولون التمييز والخطوط؟',
      a: 'افتح الإعدادات من القائمة العلوية. في قسم المظهر (Appearance)، يمكنك الاختيار بين نمط الأورورا المتدرج (Aurora) أو السواد السادة (Solid)، وتحديد لون التمييز المفضل لأزرار التطبيق وعلامات الإنجاز ومؤشرات التقدم. وتلتزم كافة النصوص والعناوين تلقائياً بخط Space Grotesk، بينما الأرقام والأسماء بخط JetBrains Mono.'
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
