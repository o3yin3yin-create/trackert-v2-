"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, Check, ShieldAlert, Timer, PlaneTakeoff, 
  Radio, Palette, BarChart2, ListChecks, Sparkles, 
  ChevronLeft, Copy, CheckCheck, ArrowUpRight, Share2, 
  BookOpen, Compass, ExternalLink
} from 'lucide-react';

export const guideData = [
  {
    id: 'vision',
    icon: Target,
    en: {
      badge: 'Anchor & Score',
      title: 'Vision & Daily Score Card',
      subtitle: 'Your overarching compass and live daily execution progress bar.',
      desc: 'The large prominent card anchored at the top of your screen is your permanent compass. It serves two distinct purposes: displaying your overarching life vision or project title, and tracking your daily habit completion rate.',
      howItWorks: [
        'Overarching Title: Tap directly on the card title anytime to type or rename your primary focus, current project, or seasonal vision.',
        'Dynamic Progress Bar: The score and fill line calculate automatically based on the scheduled habits you check off for the viewed day.',
        'Permanent Everyday Anchor: Unlike individual tasks, this card remains consistent each day to keep you mindful of the big picture while focusing on small daily wins.'
      ],
      proTip: 'Keep your title inspiring and concise (e.g. "Build the Dream", "Focus on Deep Work", or "Health & Discipline").'
    },
    ar: {
      badge: 'البوصلة والتقدم',
      title: 'بطاقة الرؤية العامة ونسبة الإنجاز',
      subtitle: 'البوصلة الثابتة لمسارك العام مع شريط مباشر لنسبة إنجاز عادات اليوم.',
      desc: 'البطاقة العريضة الثابتة في أعلى شاشتك تمثل البوصلة اليومية ليومك. لها وظيفتان أساسيتان: كتابة هدفك العام أو اسم مشروعك المستمر، وعرض نسبة إنجازك اليومية فورياً.',
      howItWorks: [
        'تعديل الهدف العام: اضغط مباشرة على النص في البطاقة في أي وقت لكتابة أو تعديل اسم مشروعك أو رؤيتك الحالية.',
        'شريط التقدم التفاعلي: النسبة المئوية وشريط التعبئة يحسبان تلقائياً بحسب العادات المجدولة التي أنجزتها في ذلك اليوم.',
        'ثابتة كل يوم: تظل البطاقة معك يومياً لتذكرك دائماً بالهدف الأكبر بينما تؤدي مهامك الصغيرة خطوة بخطوة.'
      ],
      proTip: 'اجعل العنوان محفزاً ومختصراً (مثل: "بناء المشروع", "التركيز والعمل العميق", أو "صحة ولياقة").'
    }
  },
  {
    id: 'tasks',
    icon: ListChecks,
    en: {
      badge: 'Smart Rollover',
      title: 'Daily Tasks & Overnight Rollover',
      subtitle: 'Interactive task checklist with intelligent automated rollover.',
      desc: 'A dedicated checklist for secondary tasks and commitments. Built with an automated midnight rollover engine that keeps your workspace clean while ensuring postponed tasks never get forgotten.',
      howItWorks: [
        'Finished Tasks Disappear: Any task you complete and check off is saved in that specific day’s historical record and disappears tomorrow, giving you a fresh, uncluttered start.',
        'Unfinished Tasks Carry Over: If a task remains unchecked or postponed, it automatically rolls over into the new day with a highlighted "Rolled Over" badge so you never lose track.',
        'Link Directly to Focus: Tap the focus target icon beside any task to instantly bind it as your active Pomodoro timer goal.',
        'Instant Controls: Tap task text to edit inline, check the circle to complete, or click the trash icon to delete.'
      ],
      proTip: 'Postponed tasks keep their original creation date noted internally so you know how long an item has been pending.'
    },
    ar: {
      badge: 'الترحيل الذكي',
      title: 'المهام اليومية ونظام الترحيل التلقائي',
      subtitle: 'قائمة مهام تفاعلية تنظف نفسها يومياً وترحل المهام المؤجلة تلقائياً.',
      desc: 'قائمة مخصصة للمهام والواجبات اليومية. تعمل بمحرك ترحيل ذكي يحافظ على هدوء الشاشة ويضمن عدم ضياع أي مهمة قمت بتأجيلها.',
      howItWorks: [
        'المهام المنجزة تختفي في اليوم التالي: أي مهمة تنهيها وتعلّم عليها (Checked) تُحفظ في أرشيف ذلك اليوم، وتختفي تلقائياً مع بداية اليوم الجديد لتبدأ بقائمة نظيفة.',
        'المهام المؤجلة ترحل تلقائياً: إذا لم تنجز مهمة أو أجلتها، لا تقلق لن تُمسح؛ بل تنتقل تلقائياً لقائمتك في اليوم الجديد مع علامة تمييز (Rolled Over) لتنبيهك بإنهائها.',
        'ربط المهمة بالتركيز: اضغط على علامة التركيز بجانب أي مهمة لبدء مؤقت بومودورو مخصص للعمل على هذه المهمة تحديداً.',
        'إدارة سريعة: اضغط على نص المهمة لتعديله مباشرة، أو اضغط على أيقونة الحذف لإزالتها بنقرة واحدة.'
      ],
      proTip: 'المهام المرحلة تحتفظ بتاريخها الأصلي لتدرك كم يوماً تأجلت هذه المهمة وتتحمس لإنهائها.'
    }
  },
  {
    id: 'habits',
    icon: Check,
    en: {
      badge: 'Habit Engine',
      title: 'Habit Tracking & Adaptive Scheduling',
      subtitle: 'Precision habit tracking with streak protection on unscheduled days.',
      desc: 'Track routines with custom frequencies. The scheduling engine ensures your dashboard only displays habits relevant to the active day, without penalizing streaks on off-days.',
      howItWorks: [
        'Custom Frequencies: Schedule habits as Daily, Weekly (select specific days like Mon/Wed/Fri), Monthly, Yearly, or a one-time date.',
        'No-Break Rest Days: On days a habit is not scheduled, it remains hidden and never breaks your streak. Your progress is completely safe on rest days.',
        'Habit Notes & Journal: Tap any habit to attach an optional reflection, workout stats, or reason why you missed it.',
        'Timeline Navigation: Swipe horizontally or use the date picker to review past habits or prepare for upcoming days.'
      ],
      proTip: 'Consistency beats intensity. Set 2 to 3 core habits first before expanding your routine.'
    },
    ar: {
      badge: 'بناء العادات',
      title: 'محرك العادات والجدولة الذكية',
      desc: 'نظام دقيق لبناء وتثبيت العادات، يضمن عدم ظهور أي عادة إلا في أيامها المحددة، مع حماية الستريك في أيام الراحة.',
      subtitle: 'تتبع روتينك اليومي والأسبوعي دون كسر الستريك في أيام الراحة المجدولة.',
      howItWorks: [
        'أنماط الجدولة المرنة: اختر يومي، أسبوعي (أيام محددة كأيام النادي أو العمل)، شهري، سنوي، أو موعد لمرة واحدة.',
        'أيام الراحة لا تكسر الستريك: في الأيام غير المجدولة، تختفي العادة من القائمة ولا ينكسر الستريك أبداً، لأن النظام يفهم أنه يوم راحة مستحق.',
        'ملاحظات العادة: اضغط على أي عادة لكتابة ملاحظة أو يوميات سريعة (مثل أوزان التمرين أو سبب التعثر).',
        'التنقل بين الأيام: اسحب لليمين أو اليسار على الشاشة لمراجعة أيام سابقة أو التخطيط للأيام القادمة.'
      ],
      proTip: 'الاستمرارية أهم من الكثرة. ابدأ بعادتين أو 3 عادات أساسية ورسخها أولاً قبل إضافة المزيد.'
    }
  },
  {
    id: 'emergency',
    icon: ShieldAlert,
    en: {
      badge: 'Streak Shield',
      title: 'Emergency Cards',
      subtitle: 'Fair-play streak repair shields earned through dedication.',
      desc: 'Unexpected emergencies happen. Emergency Cards are milestone-earned shields designed to repair a broken streak when life unexpectedly interrupts your routine.',
      howItWorks: [
        'How to Earn: You automatically receive 1 Emergency Card every time you achieve 7 consecutive streak days on any habit (at streak 7, 14, 21, 28, etc.).',
        'How to Use: If you missed completing a habit on a past day, use an emergency card to repair that day and preserve your active streak.',
        'Fair Play Rules: Emergency cards cannot be used on a habit with a streak of 0. You must have built real progress to be eligible to protect it.',
        'Anti-Cheat: Each milestone grant is recorded uniquely, preventing artificial card generation.'
      ],
      proTip: 'Treat emergency cards as sacred backup shields for genuine emergencies, not everyday excuses.'
    },
    ar: {
      badge: 'حماية الستريك',
      title: 'كروت الطوارئ لحماية الستريك',
      subtitle: 'دروع حقيقية تكسبها بجهدك لإصلاح الستريك عند الظروف القهرية.',
      desc: 'الظروف المفاجئة واردة دائماً. كروت الطوارئ هي دروع حماية تكسبها مع كل إنجاز، وتتيح لك إصلاح يوم فاتك دون أن تفقد الستريك الذي تعبت في بنائه.',
      howItWorks: [
        'كيف تكسبها: تكسب كارت طوارئ تلقائياً كلما حققت 7 أيام ستريك متتالية على أي عادة (عند ستريك 7، 14، 21، 28... إلخ).',
        'طريقة الاستخدام: إذا فاتك إكمال عادة في يوم سابق لظرف طارئ، استخدم كارت لإصلاح ذلك اليوم واستعادة الستريك بنجاح.',
        'قواعد عادلة: لا يمكن استخدام الكارت لعادة رصيد الستريك الخاص بها صفر (يجب أن يكون لديك ستريك حقيقي لحمايته).',
        'حماية من الغش: النظام يسجل كل كارت بمرحلته لمنع أي تكرار غير حقيقي.'
      ],
      proTip: 'احتفظ بكروت الطوارئ للأيام الصعبة الحقيقية، ولا تستخدمها كبديل عن الالتزام اليومي.'
    }
  },
  {
    id: 'pomodoro',
    icon: Timer,
    en: {
      badge: 'Deep Work',
      title: 'Pomodoro Interval Timer',
      subtitle: 'Structured scientific focus sessions with a 4-cycle milestone meter.',
      desc: 'The classic time-blocking method engineered into a clean widget. Alternates 25-minute deep focus sessions with 5-minute restorative breaks.',
      howItWorks: [
        'The 4-Dot Indicator: The widget displays 4 progress dots. Each dot represents one full 25-minute focus session. Completing all 4 dots finishes a 2-hour deep-work set.',
        'Task Anchoring: Link your active timer directly to any task on your list so your objective stays visible throughout the countdown.',
        'Gentle Audio Cues: Calm, non-intrusive chimes notify you when intervals complete so you never need to watch the clock.',
        'Automatic Session History: Every finished session is automatically logged into your Analytics page with exact duration and task name.'
      ],
      proTip: 'During the 5-minute break, step away from screens completely to let your brain recharge.'
    },
    ar: {
      badge: 'العمل العميق',
      title: 'مؤقت بومودورو للتركيز',
      subtitle: 'جلسات عمل علمية مقسمة بعناية مع مؤشر الـ 4 نقاط التفاعلي.',
      desc: 'طريقة تنظيم الوقت الشهيرة؛ جلسات عمل عميق مدتها 25 دقيقة تفصل بينها فترات راحة قصيرة مدتها 5 دقائق لتجديد طاقتك الذهنية وعزل التشتيت.',
      howItWorks: [
        'مؤشر الـ 4 نقاط: يحتوي الويدجيت على 4 نقاط، تمثل كل نقطة جلسة تركيز كاملة مدتها 25 دقيقة. إكمال النقاط الأربعة يعني إتمام دورة عمل كاملة (ساعتان).',
        'ربط المؤقت بالهدف: يمكنك ربط المؤقت بأي مهمة من قائمتك ليظل هدفك معلقاً أمام عينيك طوال العد التنازلي.',
        'تنبيهات صوتية هادئة: رنات إشعار ناعمة تنبهك عند بدء فترات الراحة أو العودة للعمل دون إزعاج.',
        'توثيق تلقائي: كل جلسة تكتمل تُسجل تلقائياً في صفحة الإحصائيات مع اسمها وعدد دقائقها.'
      ],
      proTip: 'في فترة الراحة (5 دقائق)، ابتعد تماماً عن الشاشات واشرب ماء لتجديد نشاطك الذهني.'
    }
  },
  {
    id: 'flight',
    icon: PlaneTakeoff,
    en: {
      badge: 'Flight Simulation',
      title: 'Flight Focus Simulator',
      subtitle: 'Cinematic in-flight deep work synced with real commercial airplanes in the sky.',
      desc: 'An immersive virtual flight simulator that anchors your work session to real-world passenger airplanes currently airborne across the globe.',
      howItWorks: [
        'Live Radar Search: Search real flights by flight number (e.g., EK1, MS777, BA112) or browse active planes worldwide to match your session duration.',
        '3D Window Seat: Relaxing 3D window seat view featuring animated aircraft wings, shifting daylight, and procedural cloud banks.',
        'Binaural Cabin Audio: Realistic aircraft cabin noise acts as sound isolation to drown out outside distractions and induce mental flow.',
        'Screensaver Mode: Fullscreen cinema mode showcasing live speed, altitude, and trajectory map.',
        'Collectible Boarding Passes: Completing your flight mints an authentic digital boarding pass archived in your tickets vault.'
      ],
      proTip: 'Use Flight Focus for long study sessions or deep writing blocks to simulate the focus of an airplane cabin.'
    },
    ar: {
      badge: 'محاكاة الطيران',
      title: 'فلايت فوكس - التركيز مع محاكي الطيران',
      subtitle: 'جلسة تركيز سينمائية متزامنة مع رحلات طيران حقيقية تحلق في السماء الآن.',
      desc: 'تجربة غامرة وفريدة تتيح لك ربط وقت عملك برحلة طيران ركاب حقيقية تحلق في الجو الآن، لتتحدى نفسك بإنجاز أهدافك قبل هبوط الطائرة.',
      howItWorks: [
        'رادار الطيران الحي: ابحث برقم أي رحلة حقيقية (مثل EK1 أو MS777) أو استعرض الرحلات المتاحة في الأجواء لتختار رحلة تناسب وقت عملك.',
        'شباك الطائرة 3D: مقعد افتراضي بجانب الشباك يعرض جناح الطائرة، حركة السحب الواقعية، وتغير ضوء النهار حسب موقع الطائرة في العالم.',
        'عازل صوت الكابينة: صوت هادئ لمحركات الطائرة في الخلفية (White Noise) يساعد على عزل الضوضاء الخارجية والدخول في حالة الاستغراق (Flow).',
        'شاشة توقف سينمائية: وضع الشاشة الكاملة يعرض مسار الخريطة، السرعة، والارتفاع في الزمن الفعلي.',
        'تذاكر صعود تذكارية: عند إنهاء الرحلة، يصدر التطبيق تذكرة صعود سينمائية (Boarding Pass) تضاف لمعرض تذاكرك التذكاري.'
      ],
      proTip: 'استخدم فلايت فوكس في جلسات المذاكرة الطويلة أو كتابة المشاريع الكبيرة لتعيش تجربة العزلة والتركيز التام.'
    }
  },
  {
    id: 'spotify',
    icon: Radio,
    en: {
      badge: 'Live Audio',
      title: 'Spotify Player & Gesture Controls',
      subtitle: 'Streamlined Spotify controls with touch/mouse swipe gestures and smart auto-hide.',
      desc: 'Direct Spotify playback integration inside your dashboard. Control your audio effortlessly with tactile gestures and distraction-free visibility rules.',
      howItWorks: [
        'Swipe Left: Skip to the next track instantly.',
        'Swipe Right: Return to the previous track.',
        'Tap / Click: Toggle Play or Pause with instantaneous visual feedback.',
        'Size Modes: Choose Full-width (with album art and live progress bar) or Compact mode (matching single habit card size).',
        'Smart Auto-Hide: In Auto mode, the widget appears when music is playing and automatically disappears 30 minutes after pausing to keep your screen tidy.',
        'Unified Pointer Engine: Works natively with mouse clicks and drags on Mac desktop as well as touch swipes on mobile.'
      ],
      proTip: 'Connect your Spotify account once from Settings to unlock seamless gesture playback.'
    },
    ar: {
      badge: 'الربط الموسيقي',
      title: 'مشغل سبوتيفاي الذكي بالإيماءات',
      subtitle: 'تحكم مباشر في تشغيل الموسيقى بإيماءات السحب وميزة الإخفاء التلقائي الذكي.',
      desc: 'ويدجيت مدمج يتيح لك التحكم الكامل في تشغيل Spotify من داخل شاشتك الرئيسية، مع إيماءات سحب سريعة ومظهر مونوكروم هادئ.',
      howItWorks: [
        'سحب لليسار (Swipe Left): تخطي للتراك التالي فوراً.',
        'سحب لليمين (Swipe Right): رجوع للتراك السابق.',
        'ضغطة خفيفة (Tap / Click): تشغيل أو إيقاف مؤقت مع أنيميشن تأكيد بصري.',
        'حجمان مخصصان: يمكنك الاختيار بين الكارت العريض (Full) أو الكارت المصغر (Compact) بنفس حجم كروت العادات.',
        'الإخفاء الذكي (Auto): يظهر الويدجيت أثناء التشغيل، ويختفي تلقائياً بعد 30 دقيقة من إيقاف الأغنية للحفاظ على نظافة شاشتك.',
        'محرك توافق شامل: يعمل بالماوس والتراك باد على أجهزة الماك، وباللمس المباشر على شاشات الهواتف.'
      ],
      proTip: 'اربط حساب Spotify مرة واحدة من الإعدادات لتستمتع بالتحكم المباشر دون مغادرة التطبيق.'
    }
  },
  {
    id: 'appearance',
    icon: Palette,
    en: {
      badge: 'Design & Style',
      title: 'Appearance, Theme & Widget Setup',
      subtitle: 'Refined Apple monochrome aesthetic with subtle accent personalization.',
      desc: 'Tailor your daily workspace to your personal preferences while upholding a distraction-free, zero-clutter monochrome design philosophy.',
      howItWorks: [
        'Background Style: Choose between gentle animated Aurora ambient glow or Pure Solid OLED deep black.',
        'Accent Color: Select your preferred glow tone for active checkmarks, button highlights, and progress lines.',
        'Widget Reordering: Rearrange widgets (Pomodoro, Flight, Spotify) in your preferred vertical order below your Vision card.',
        'Widget Visibility & Sizes: Choose whether widgets appear in Auto mode, Always visible, or Hidden, and toggle between Full or Compact sizing.',
        'Persona Avatars: Choose a minimalist profile character that best represents you in the top navigation header.'
      ],
      proTip: 'For late-night focus sessions, switch to Solid background mode for a pure black OLED experience.'
    },
    ar: {
      badge: 'المظهر والتصميم',
      title: 'المظهر، التخصيص وترتيب الشاشة',
      subtitle: 'تصميم أبل المونوكروم النقي مع خيارات تخصيص هادئة ومريحة للعين.',
      desc: 'خصص مساحتك اليومية بالشكل الذي يريحك، مع الالتزام التام بفلسفة البساطة وهدوء الألوان ومنع التشتيت البصري.',
      howItWorks: [
        'نمط الخلفية: اختر بين توهج الأورورا المتدرج الناعم (Aurora) أو السواد الحالك السادة (OLED Solid Black).',
        'لون التمييز (Accent Color): اختر لون التوهج الخاص بالأزرار، علامات الإنجاز، ومؤشرات التقدم.',
        'ترتيب الويدجيتس: يمكنك إعادة ترتيب ظهور الويدجيتس (البومودورو، الطيران، سبوتيفاي) بالترتيب المناسب لك تحت كارت الهدف.',
        'خيارات الظهور والمقاس: اختر ظهور كل ويدجيت (تلقائي، دائماً، أو مخفي)، ومقاسه (عريض أو مصغر).',
        'شخصيات الأفاتار: اختر من بين شخصيات بروفايل مونوكروم مختلفة لتمثيلك في الهيدر العلوي.'
      ],
      proTip: 'في فترات العمل الليلية، استخدم النمط السادة (Solid) للحصول على سواد OLED مريح تماماً للعينين.'
    }
  },
  {
    id: 'analytics',
    icon: BarChart2,
    en: {
      badge: 'Insights & Logs',
      title: 'Analytics, Focus Logs & Tickets Vault',
      subtitle: 'Historical trends, streak tracking, and focus souvenir archive.',
      desc: 'Your central hub for reviewing daily discipline, monitoring long-term streaks, and browsing all your completed focus milestones.',
      howItWorks: [
        'Daily Completion Score: A unified percentage reflecting all scheduled habits and tasks completed for that day.',
        'Streak Health: Live counters tracking consecutive days for each routine to maintain discipline.',
        'Logged Focus Sessions: A timestamped chronological journal of every completed Pomodoro block.',
        'Boarding Pass Vault: A permanent gallery storing every souvenir Flight Focus boarding pass you earned.'
      ],
      proTip: 'Review your analytics at the end of each week to identify which routines need adjustment.'
    },
    ar: {
      badge: 'الإحصائيات والتوثيق',
      title: 'لوحة الإحصائيات وسجل الإنجاز والرحلات',
      subtitle: 'تقارير أداء شاملة، متابعة الستريك، ومعرض تذاكر الطيران التذكارية.',
      desc: 'مركزك الشامل لمراجعة أدائك الأسبوعي والشهري، التأكد من استمرارية الستريك، واستعراض سجل جلسات التركيز المكتملة.',
      howItWorks: [
        'التقييم اليومي (Daily Score): مؤشر رقمي يوضح نسبة إنجازك لمهام وعادات اليوم النشط.',
        'صحة الستريك: متابعة دقيقة لعدد الأيام المتتالية لكل عادة لتحفيزك على عدم كسر السلسلة.',
        'سجل جلسات التركيز: توثيق زمني لكل جلسة بومودورو مكتملة وإجمالي ساعات العمل المنجزة.',
        'خزانة تذاكر الطيران: أرشيف دائم يضم كل تذاكر الصعود (Boarding Passes) التي حصلت عليها من رحلاتك.'
      ],
      proTip: 'راجع إحصائياتك نهاية كل أسبوع لتكتشف العادات الأكثر التزاماً وتلك التي تحتاج لتحسين.'
    }
  },
  {
    id: 'sync',
    icon: Sparkles,
    en: {
      badge: 'Local-First',
      title: 'Offline-First Engine & Hybrid Cloud Sync',
      subtitle: 'Instant zero-lag local performance paired with seamless multi-device cloud synchronization.',
      desc: 'Designed with a local-first philosophy: every click, checkmark, and session saves instantaneously on your device with zero network lag, then syncs smoothly to the cloud.',
      howItWorks: [
        'Full Offline Support: The app works 100% without an internet connection (ideal for airplanes, travels, or outages).',
        'Silent Background Sync: Whenever your connection restores, pending mutations automatically sync to the database.',
        'Cross-Platform: Seamlessly synchronizes habits, streaks, and sessions across the web and native macOS Desktop app.'
      ],
      proTip: 'You never have to wait for a loading spinner to check off a habit — everything updates in real time.'
    },
    ar: {
      badge: 'العمل دون إنترنت',
      title: 'المزامنة الهجينة والعمل الفوري دون إنترنت',
      subtitle: 'استجابة لحظية بدون أي بطء، مع مزامنة سحابية هادئة وتوافق بين جميع الأجهزة.',
      desc: 'مبني بنظام محلي فوري (Local-First)؛ كل نقرة، تسجيل عادة، أو مؤقت يحفظ فوراً على جهازك دون أي انتظار للسيرفر، ثم يُزامن بهدوء مع السحابة عند توفر الإنترنت.',
      howItWorks: [
        'دعم كامل بدون إنترنت: التطبيق يعمل بكامل مميزاته 100% دون الحاجة لإنترنت (مثالي في الطائرات، السفر، أو انقطاع الشبكة).',
        'مزامنة سحابية صامتة: بمجرد اتصال جهازك بالإنترنت، تُرفع التعديلات تلقائياً وتحدث بياناتك.',
        'توافق المنصات: تنتقل عاداتك وسجلاتك وتذاكرك فورياً بين تطبيق الماك وموقع الويب دون أي تعارض.'
      ],
      proTip: 'لن تنتظر أبداً علامة تحميل لتعلم على عادتك؛ كل شيء يستجيب في أجزاء من الثانية.'
    }
  }
];

export default function GuidePage() {
  const [lang, setLang] = useState('en');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('vision');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_guide_lang');
      if (saved === 'ar' || saved === 'en') {
        setLang(saved);
      }
    }
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_guide_lang', newLang);
    }
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://bokra101.vercel.app/guide';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const isAr = lang === 'ar';

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black font-sans antialiased"
    >
      {/* Top Floating Glass Navigation Header */}
      <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Back Link & Page Title */}
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex items-center justify-center border border-white/10"
              title={isAr ? 'الرجوع للتطبيق' : 'Back to App'}
            >
              <ChevronLeft size={18} className={isAr ? 'rotate-180' : ''} />
            </Link>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 leading-tight">
                {isAr ? 'التوثيق الشامل' : 'Official Documentation'}
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 leading-tight">
                <BookOpen size={17} className="text-white/80" />
                {isAr ? 'دليل الاستخدام والتشغيل' : 'App User Guide'}
              </h1>
            </div>
          </div>

          {/* Right: Share Link & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Copy Shareable Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border select-none cursor-pointer active:scale-95 ${
                copied 
                  ? 'bg-white text-black border-white' 
                  : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/10'
              }`}
              title={isAr ? 'نسخ رابط الدليل للمشاركة' : 'Copy link to share'}
            >
              {copied ? (
                <>
                  <CheckCheck size={14} className="stroke-[2.5]" />
                  <span>{isAr ? 'تم نسخ الرابط!' : 'Link Copied!'}</span>
                </>
              ) : (
                <>
                  <Share2 size={13} />
                  <span className="hidden sm:inline">{isAr ? 'مشاركة الرابط' : 'Share Link'}</span>
                </>
              )}
            </button>

            {/* Language Switcher Pill */}
            <div className="flex items-center p-1 rounded-full bg-white/5 border border-white/10 select-none">
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  !isAr
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('ar')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isAr
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                عربي
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 pb-24">
        
        {/* Hero Section */}
        <div className="mb-12 text-center sm:text-start flex flex-col gap-3 pb-8 border-b border-white/10">
          <div className="inline-flex items-center self-center sm:self-start gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={13} className="text-white" />
            {isAr ? 'نظام الإنتاجية الشخصية والتركيز' : 'Personal Productivity OS'}
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {isAr ? 'دليلك الكامل لإتقان التطبيق' : 'Everything you need to know.'}
          </h2>

          <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl">
            {isAr 
              ? 'شرح تفصيلي ومبسط لجميع المحركات؛ من إدارة العادات والمهام اليومية وترحيل المؤجلات، إلى جلسات التركيز وحماية الستريك وتخصيص تجربتك بالكامل.'
              : 'A comprehensive, step-by-step walkthrough of all systems: habits engine, overnight task rollover, deep work timers, streak shields, and appearance customization.'}
          </p>

          {/* Quick Table of Contents Pills */}
          <div className="flex flex-wrap gap-2 pt-3">
            {guideData.map((sec) => (
              <a 
                key={sec.id}
                href={`#${sec.id}`}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-bold text-white/70 hover:text-white transition-all select-none"
              >
                {sec[lang]?.title || sec.en.title}
              </a>
            ))}
          </div>
        </div>

        {/* Section Cards */}
        <div className="flex flex-col gap-8">
          {guideData.map((item, index) => {
            const content = item[lang] || item.en;
            const Icon = item.icon;

            return (
              <section 
                id={item.id}
                key={item.id} 
                className="scroll-mt-24 p-6 sm:p-8 rounded-[24px] bg-[#0A0A0C] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-5 shadow-xl relative overflow-hidden"
              >
                {/* Index Watermark Number */}
                <span className="absolute top-4 right-5 sm:right-7 text-5xl sm:text-6xl font-black text-white/[0.03] select-none pointer-events-none">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Card Header */}
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-white">
                        <Icon size={20} strokeWidth={2.4} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {content.title}
                        </h3>
                        {content.subtitle && (
                          <span className="text-xs text-white/40 font-semibold tracking-wide">
                            {content.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 shrink-0">
                      {content.badge}
                    </span>
                  </div>

                  {/* Overview Paragraph */}
                  <p className="text-xs sm:text-sm text-white/75 leading-relaxed pt-2">
                    {content.desc}
                  </p>
                </div>

                {/* Step-by-Step Points */}
                {content.howItWorks && content.howItWorks.length > 0 && (
                  <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5 relative z-10">
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">
                      {isAr ? 'كيف يعمل بالتفصيل؟' : 'How it works'}
                    </span>
                    {content.howItWorks.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-3 text-xs sm:text-[13px] text-white/70 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-white/80 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
                          {sIdx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pro-Tip Box */}
                {content.proTip && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2.5 text-xs text-white/60 relative z-10">
                    <Compass size={16} className="text-white/80 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white/80">{isAr ? 'نصيحة ذهبية: ' : 'Pro-Tip: '}</span>
                      <span>{content.proTip}</span>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Footer Back to App Button */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>{isAr ? 'تم تصميم الدليل لمساعدتك على الإنجاز بأعلى تركيز.' : 'Crafted to help you execute with pure focus.'}</span>
          </div>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-white text-black hover:bg-white/90 active:scale-95 transition-all text-center shadow-lg"
          >
            {isAr ? 'العودة للتطبيق الرئيسي' : 'Return to Dashboard'}
          </Link>
        </div>
      </main>
    </div>
  );
}
