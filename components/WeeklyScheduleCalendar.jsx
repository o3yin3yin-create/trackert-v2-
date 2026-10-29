'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CalendarDays,
  Clock, 
  MapPin, 
  Hourglass, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  GraduationCap, 
  Briefcase, 
  Dumbbell, 
  BookOpen, 
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';

const DAYS = [
  { id: 0, labelEn: 'Sunday', labelAr: 'الأحد', shortEn: 'Sun', shortAr: 'أحد' },
  { id: 1, labelEn: 'Monday', labelAr: 'الاثنين', shortEn: 'Mon', shortAr: 'اثنين' },
  { id: 2, labelEn: 'Tuesday', labelAr: 'الثلاثاء', shortEn: 'Tue', shortAr: 'ثلاثاء' },
  { id: 3, labelEn: 'Wednesday', labelAr: 'الأربعاء', shortEn: 'Wed', shortAr: 'أربعاء' },
  { id: 4, labelEn: 'Thursday', labelAr: 'الخميس', shortEn: 'Thu', shortAr: 'خميس' },
  { id: 5, labelEn: 'Friday', labelAr: 'الجمعة', shortEn: 'Fri', shortAr: 'جمعة' },
  { id: 6, labelEn: 'Saturday', labelAr: 'السبت', shortEn: 'Sat', shortAr: 'سبت' },
];

const CATEGORIES = [
  { id: 'lecture', labelEn: 'Lecture', labelAr: 'محاضرة', icon: GraduationCap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { id: 'study', labelEn: 'Study', labelAr: 'مذاكرة', icon: BookOpen, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'workout', labelEn: 'Workout', labelAr: 'تمرين', icon: Dumbbell, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'meeting', labelEn: 'Meeting', labelAr: 'ميتنج', icon: Briefcase, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'habit', labelEn: 'Routine', labelAr: 'عادة / روتين', icon: Sparkles, color: 'text-white/80 bg-white/10 border-white/20' },
];

export default function WeeklyScheduleCalendar({
  isOpen,
  onClose,
  habits = [],
  onUpdateHabits,
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const isAr = lang === 'ar';

  // Active viewed day index (0..6)
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'grid'

  // Inline Add / Edit Drawer State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('lecture');
  const [formDays, setFormDays] = useState([new Date().getDay()]);
  const [formHour, setFormHour] = useState('09');
  const [formMinute, setFormMinute] = useState('00');
  const [formPeriod, setFormPeriod] = useState('AM');
  const [formDuration, setFormDuration] = useState('1h 30m');
  const [formLocation, setFormLocation] = useState('');

  if (!isOpen) return null;

  // Filter weekly scheduled habits
  const weeklyHabits = useMemo(() => {
    return habits.filter(h => h && (h.frequency === 'weekly' || (Array.isArray(h.scheduleDays) && h.scheduleDays.length > 0)));
  }, [habits]);

  // Group habits by day (0..6) and sort chronologically by time
  const habitsByDay = useMemo(() => {
    const map = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    weeklyHabits.forEach(h => {
      const days = Array.isArray(h.scheduleDays) && h.scheduleDays.length > 0 ? h.scheduleDays : [0];
      days.forEach(d => {
        if (map[d] !== undefined) {
          map[d].push(h);
        }
      });
    });

    // Helper to convert "09:00 AM" to minutes for sorting
    const parseMinutes = (timeStr) => {
      if (!timeStr) return 9999;
      const m = timeStr.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
      if (!m) return 9999;
      let hr = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const period = (m[3] || 'AM').toUpperCase();
      if (period === 'PM' && hr < 12) hr += 12;
      if (period === 'AM' && hr === 12) hr = 0;
      return hr * 60 + min;
    };

    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));
    });

    return map;
  }, [weeklyHabits]);

  // Open Form for Adding New Item
  const handleOpenAdd = (targetDay = selectedDay) => {
    setEditingHabitId(null);
    setFormName('');
    setFormCategory('lecture');
    setFormDays([targetDay]);
    setFormHour('09');
    setFormMinute('00');
    setFormPeriod('AM');
    setFormDuration('1h 30m');
    setFormLocation('');
    setIsEditorOpen(true);
  };

  // Open Form for Editing Existing Item
  const handleOpenEdit = (habit) => {
    setEditingHabitId(habit.id);
    setFormName(habit.name || '');
    setFormCategory(habit.category || 'habit');
    setFormDays(Array.isArray(habit.scheduleDays) && habit.scheduleDays.length > 0 ? habit.scheduleDays : [selectedDay]);
    setFormDuration(habit.duration || '1h 30m');
    setFormLocation(habit.location || '');

    // Parse time if present
    if (habit.time) {
      const match = habit.time.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
      if (match) {
        setFormHour(String(parseInt(match[1], 10)).padStart(2, '0'));
        setFormMinute(match[2]);
        setFormPeriod((match[3] || 'AM').toUpperCase());
      }
    } else {
      setFormHour('09');
      setFormMinute('00');
      setFormPeriod('AM');
    }

    setIsEditorOpen(true);
  };

  const toggleDaySelection = (dayId) => {
    setFormDays(prev => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev; // keep at least one day
        return prev.filter(d => d !== dayId);
      }
      return [...prev, dayId].sort();
    });
  };

  // Save / Update Habit
  const handleSaveForm = (e) => {
    if (e) e.preventDefault();
    if (!formName.trim()) return;

    const formattedTime = `${formHour}:${formMinute} ${formPeriod}`;

    if (editingHabitId) {
      // Update existing habit
      const updated = habits.map(h => {
        if (h.id === editingHabitId) {
          return {
            ...h,
            name: formName.trim(),
            category: formCategory,
            frequency: 'weekly',
            scheduleDays: formDays,
            time: formattedTime,
            duration: formDuration.trim() || null,
            location: formLocation.trim() || null,
            updatedAt: Date.now()
          };
        }
        return h;
      });
      onUpdateHabits(updated);
    } else {
      // Create new habit
      const newHabit = {
        id: `sched-habit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: formName.trim(),
        type: 'single',
        subItems: [],
        frequency: 'weekly',
        scheduleDays: formDays,
        time: formattedTime,
        duration: formDuration.trim() || null,
        location: formLocation.trim() || null,
        category: formCategory,
        isPrivate: false,
        isNotifyEnabled: true,
        notifyBefore: 15,
        updatedAt: Date.now()
      };
      onUpdateHabits([...habits, newHabit]);
    }

    setIsEditorOpen(false);
  };

  // Delete Habit
  const handleDeleteHabit = (habitId) => {
    const updated = habits.filter(h => h.id !== habitId);
    onUpdateHabits(updated);
    if (editingHabitId === habitId) {
      setIsEditorOpen(false);
    }
  };

  // Duplicate habit to another day
  const handleDuplicateToDay = (habit, targetDay) => {
    const currentDays = Array.isArray(habit.scheduleDays) ? habit.scheduleDays : [];
    if (currentDays.includes(targetDay)) return;

    const updated = habits.map(h => {
      if (h.id === habit.id) {
        return {
          ...h,
          scheduleDays: [...currentDays, targetDay].sort(),
          updatedAt: Date.now()
        };
      }
      return h;
    });
    onUpdateHabits(updated);
  };

  const currentDayHabits = habitsByDay[selectedDay] || [];

  return (
    <div className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg"
                style={{
                  backgroundColor: `${themeColor}20`,
                  borderColor: `${themeColor}40`,
                  color: themeColor || '#ffffff'
                }}
              >
                <CalendarDays size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isAr ? 'جدول الأسبوع والروتين المجدول' : 'Weekly Schedule & Routine'}
                </h2>
                <p className="text-xs text-white/50 font-medium">
                  {isAr ? 'نظم مواعيد محاضراتك، تمرينك، وروتينك وتظهر تلقائياً في عادات اليوم' : 'Plan your weekly classes, workouts, and habits in one interactive calendar'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={onClose} 
                className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-95"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Top Controls: Day Tabs & View Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            
            {/* Days Tabs (Sun to Sat) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 overflow-x-auto">
              {DAYS.map(day => {
                const isSelected = selectedDay === day.id;
                const count = (habitsByDay[day.id] || []).length;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => { setSelectedDay(day.id); setViewMode('day'); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-white text-black shadow-md font-black'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{isAr ? day.shortAr : day.shortEn}</span>
                    {count > 0 && (
                      <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-mono ${
                        isSelected ? 'bg-black text-white' : 'bg-white/20 text-white'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions & View Mode Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'day' ? 'grid' : 'day')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Layers size={14} />
                <span>{viewMode === 'day' ? (isAr ? 'عرض الأسبوع كاملاً' : 'Full Week Grid') : (isAr ? 'عرض اليوم' : 'Day View')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdd(selectedDay)}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-lg cursor-pointer"
              >
                <Plus size={15} strokeWidth={3} />
                <span>{isAr ? 'إضافة موعد' : 'Add Slot'}</span>
              </button>
            </div>

          </div>

          {/* VIEW MODE 1: DAY-BY-DAY TIMELINE */}
          {viewMode === 'day' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-black text-white flex items-center gap-2">
                  <Calendar size={15} className="text-white/40" />
                  <span>{isAr ? DAYS[selectedDay].labelAr : DAYS[selectedDay].labelEn}</span>
                  <span className="text-xs text-white/40 font-normal">
                    ({currentDayHabits.length} {isAr ? 'مواعيد مجدولة' : 'scheduled'})
                  </span>
                </span>
                
                <button
                  type="button"
                  onClick={() => handleOpenAdd(selectedDay)}
                  className="text-xs text-white/60 hover:text-white flex items-center gap-1 font-bold"
                >
                  <Plus size={13} />
                  <span>{isAr ? `إضافة إلى يوم ${DAYS[selectedDay].shortAr}` : `Add to ${DAYS[selectedDay].shortEn}`}</span>
                </button>
              </div>

              {currentDayHabits.length === 0 ? (
                <div className="py-14 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                    <Calendar size={22} />
                  </div>
                  <div className="flex flex-col gap-1 max-w-xs">
                    <h3 className="text-sm font-bold text-white">
                      {isAr ? `لا توجد مواعيد مجدولة ليوم ${DAYS[selectedDay].labelAr}` : `No habits scheduled for ${DAYS[selectedDay].labelEn}`}
                    </h3>
                    <p className="text-xs text-white/40">
                      {isAr ? 'أضف محاضراتك أو روتينك اليومي هنا وهيظهر تلقائياً في صفحتك الرئيسية كل أسبوع.' : 'Add your classes or routine here to appear on your home screen every week.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(selectedDay)}
                    className="mt-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-black active:scale-95 transition-all shadow-lg"
                  >
                    {isAr ? 'إضافة أول موعد لهذا اليوم' : 'Add First Slot'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentDayHabits.map((habit) => {
                    const catObj = CATEGORIES.find(c => c.id === habit.category) || CATEGORIES[4];
                    const IconComp = catObj.icon;
                    return (
                      <div 
                        key={habit.id}
                        className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/25 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${catObj.color}`}>
                            <IconComp size={18} />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                              {habit.name}
                            </span>

                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {habit.time && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/80 flex items-center gap-1">
                                  <Clock size={10} />
                                  {habit.time}
                                </span>
                              )}
                              {habit.duration && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/80 flex items-center gap-1">
                                  <Hourglass size={10} />
                                  {habit.duration}
                                </span>
                              )}
                              {habit.location && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/80 flex items-center gap-1">
                                  <MapPin size={10} />
                                  {habit.location}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-white/50">
                                {isAr ? catObj.labelAr : catObj.labelEn}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(habit)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-90"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all active:scale-90"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: FULL WEEK GRID */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-start">
              {DAYS.map(day => {
                const dayItems = habitsByDay[day.id] || [];
                const isToday = new Date().getDay() === day.id;
                return (
                  <div 
                    key={day.id}
                    className={`rounded-2xl p-3 border flex flex-col gap-2 transition-all ${
                      isToday
                        ? 'bg-white/[0.06] border-white/30 shadow-lg'
                        : 'bg-white/[0.02] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span className={`text-xs font-black ${isToday ? 'text-white' : 'text-white/60'}`}>
                        {isAr ? day.labelAr : day.shortEn}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(day.id)}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Add slot"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="space-y-1.5 min-h-[100px]">
                      {dayItems.length === 0 ? (
                        <div className="h-20 flex items-center justify-center text-[11px] text-white/20 select-none">
                          -
                        </div>
                      ) : (
                        dayItems.map(item => {
                          const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[4];
                          return (
                            <div 
                              key={item.id}
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 cursor-pointer transition-all flex flex-col gap-0.5 active:scale-95"
                            >
                              <span className="text-[11px] font-bold text-white truncate leading-tight">
                                {item.name}
                              </span>
                              <div className="flex items-center justify-between text-[9px] text-white/50 font-mono">
                                <span>{item.time || 'All Day'}</span>
                                {item.location && <span className="truncate max-w-[60px]">{item.location}</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* --- INLINE / DRAWER FORM FOR ADDING / EDITING --- */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-[10002] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div 
              className="w-full max-w-lg bg-[#18181b] border border-white/15 rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-200 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-base font-black text-white">
                  {editingHabitId 
                    ? (isAr ? 'تعديل موعد مجدول' : 'Edit Scheduled Slot') 
                    : (isAr ? 'إضافة موعد مجدول جديد' : 'New Scheduled Slot')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Habit / Class Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-white/60">
                  {isAr ? 'اسم المادة / العادة / النشاط:' : 'Slot Title:'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={isAr ? 'مثلاً: شبكات حاسب، جيم، قراءة...' : 'e.g., Computer Graphics, Gym...'}
                  className="px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white placeholder-white/30 text-sm outline-none focus:border-white/50"
                />
              </div>

              {/* Category Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-white/60">
                  {isAr ? 'التصنيف:' : 'Category:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {CATEGORIES.map(cat => {
                    const isSelected = formCategory === cat.id;
                    const IconC = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategory(cat.id)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <IconC size={15} />
                        <span className="text-[10px]">{isAr ? cat.labelAr : cat.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Days Selector (Multi-Day Bulk Assignment) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white/60">
                    {isAr ? 'أيام التكرار الأسبوعي:' : 'Recurring Days:'}
                  </label>
                  <span className="text-[10px] text-white/40">
                    {isAr ? 'اختر يوماً أو أكثر في نفس الوقت' : 'Select one or multiple days'}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map(d => {
                    const isSelected = formDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDaySelection(d.id)}
                        className={`py-2 rounded-xl text-[11px] font-black transition-all ${
                          isSelected
                            ? 'bg-white text-black shadow-sm'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isAr ? d.shortAr : d.shortEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time, Duration, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/50">{isAr ? 'وقت البدء:' : 'Start Time:'}</label>
                  <div className="flex items-center gap-1 px-2 py-2 rounded-xl bg-black/50 border border-white/15">
                    <select
                      value={formHour}
                      onChange={(e) => setFormHour(e.target.value)}
                      className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                        <option key={h} value={h} className="bg-black text-white">{h}</option>
                      ))}
                    </select>
                    <span className="text-white/40">:</span>
                    <select
                      value={formMinute}
                      onChange={(e) => setFormMinute(e.target.value)}
                      className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer"
                    >
                      {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m} className="bg-black text-white">{m}</option>
                      ))}
                    </select>
                    <select
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer ml-auto"
                    >
                      <option value="AM" className="bg-black text-white">AM</option>
                      <option value="PM" className="bg-black text-white">PM</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/50">{isAr ? 'المدة:' : 'Duration:'}</label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="1h 30m"
                    className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/50">{isAr ? 'المكان / القاعة:' : 'Location:'}</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder={isAr ? 'قاعة 302' : 'Hall 302'}
                    className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={!formName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-black text-xs hover:bg-white/90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-lg"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>{editingHabitId ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إضافة إلى الجدول' : 'Add to Schedule')}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Footer Done */}
        <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/50 font-medium">
            <Sparkles size={14} className="text-white/40" />
            <span>
              {isAr 
                ? 'كل المواعيد في هذا الجدول مربوطة بالعادات في الصفحة الرئيسية وتظهر في أيامها تلقائياً.' 
                : 'All slots sync directly with your home screen habits on their scheduled days.'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs sm:text-sm hover:bg-white/90 transition-all shadow-xl active:scale-95"
          >
            {isAr ? 'تم' : 'Done'}
          </button>
        </div>

      </div>
    </div>
  );
}
