  // --- Flight Focus Logic ---
  const fetchFlights = async (duration = 0) => {
    setFlightLoading(true);
    setFlightOptions([]);
    try {
      const res = await apiFetch(`/api/flight?duration=${duration}`);
      const data = await res.json();
      if (data.flights) {
        setFlightOptions(data.flights);
      }
    } catch (err) {
      console.warn("[bokra Flights] Flight radar fetch failed (offline or network):", err);
    }
    setFlightLoading(false);
  };

  useEffect(() => {
    // If modal is open, but no filter chosen yet, we don't fetch flights yet
    if (isFlightFocusOpen && flightOptions.length === 0 && !selectedFlight && flightDurationFilter !== null) {
      fetchFlights(flightDurationFilter);
    }
    let intervalId;
    if (isFlightFocusOpen && flightDurationFilter !== null) {
      intervalId = setInterval(() => {
        if (!selectedFlight) fetchFlights(flightDurationFilter);
      }, 15 * 60 * 1000); // Poll every 15 minutes if no flight selected
    }
    return () => clearInterval(intervalId);
  }, [isFlightFocusOpen, flightOptions.length, selectedFlight, flightDurationFilter]);

  const flightLastTickRef = useRef(null);

  useEffect(() => {
    if (!selectedFlight) {
      stopHumSynthesis();
      if (isCabinHumPlaying) setIsCabinHumPlaying(false);
      if (isMapView) setIsMapView(false);
      flightLastTickRef.current = null;
      return;
    }
    
    // Flight timer runs purely on timestamp delta now and is always live!
    const remaining = selectedFlight.estimatedArrival - currentUnixTime;
    
    if (remaining > 0) {
      setFlightTimer(remaining);
      
      // ONLY log focus time if the focus timer is actively running
      if (isFlightTimerRunning) {
        if (!flightLastTickRef.current) {
          flightLastTickRef.current = Date.now();
        }
        
        const now = Date.now();
        const deltaMs = now - flightLastTickRef.current;
        const delta = Math.floor(deltaMs / 1000);
        
        if (delta > 0) {
          flightLastTickRef.current = now;
          const todayStr = getFormatDateStr(new Date());
          
          setFocusTimeData(prev => {
            const updated = { ...prev, [todayStr]: (prev[todayStr] || 0) + delta };
            localStorage.setItem('daybase_focusTime_v4', JSON.stringify(updated));
            return updated;
          });
          
          // Flight time is no longer added to pomodoro Tasks Data. It is only kept in finishedTickets.
        }
      } else {
        flightLastTickRef.current = null;
      }
    } else if (remaining <= 0) {
      // Flight landed!
      setFlightTimer(0);
      setIsFlightTimerRunning(false);
      flightLastTickRef.current = null;
      // Only trigger sound once when it first hits 0
      if (flightTimer > 0) {
        playAirportChime();
        setIsBoardingPassOpen(true);
        setFinishedTickets(prev => {
          if (prev.length > 0 && prev[0].id === selectedFlight.id && Date.now() - prev[0].completedAt < 10000) return prev;
          const newTicket = { ...selectedFlight, seat: selectedSeat, date: new Date().toLocaleDateString(), completedAt: Date.now() };
          const updated = [newTicket, ...prev];
          if (typeof window !== 'undefined') {
            localStorage.setItem('trackert_finished_tickets_v1', JSON.stringify(updated));
          }
          return updated;
        });
      }
    }
  }, [currentUnixTime, isFlightTimerRunning, selectedFlight]);

  // --- Modals & Inputs ---
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [missionInput, setMissionInput] = useState(mission);
  
  // ─── Modal Animations ───
  const [isAddMounted, setIsAddMounted] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isManageMounted, setIsManageMounted] = useState(false);
  const [isManageVisible, setIsManageVisible] = useState(false);
  const [isEditMounted, setIsEditMounted] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);

  // Edit Habit States
  const [editingHabit, setEditingHabit] = useState(null);
  const [editHabitName, setEditHabitName] = useState("");
  const [editHabitFrequency, setEditHabitFrequency] = useState('daily');
  const [editHabitScheduleDays, setEditHabitScheduleDays] = useState([0]);
  const [editHabitScheduleOnceDate, setEditHabitScheduleOnceDate] = useState("");
  const [editHabitScheduleDayOfMonth, setEditHabitScheduleDayOfMonth] = useState(1);
  const [editHabitScheduleMonthDay, setEditHabitScheduleMonthDay] = useState("01-01");
  const [editHabitTime, setEditHabitTime] = useState("");
  const [editHabitDuration, setEditHabitDuration] = useState("");
  const [editHabitLocation, setEditHabitLocation] = useState("");
  const [editHabitCategory, setEditHabitCategory] = useState("habit");
  const [editTimeHour, setEditTimeHour] = useState(4);
  const [editTimeMinute, setEditTimeMinute] = useState("00");
  const [editTimePeriod, setEditTimePeriod] = useState("PM");
  const [editHabitIsPrivate, setEditHabitIsPrivate] = useState(false);
  const [editHabitHasReminder, setEditHabitHasReminder] = useState(false);
  const [editHabitReminderTime, setEditHabitReminderTime] = useState("");
  const [editHabitReminderHour, setEditHabitReminderHour] = useState(8);
  const [editHabitReminderMinute, setEditHabitReminderMinute] = useState("00");
  const [editHabitReminderPeriod, setEditHabitReminderPeriod] = useState("AM");
  const [editHabitReminderMessage, setEditHabitReminderMessage] = useState("");

  // Auth gate prompt for unauthenticated browsing
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  const requireAuth = (callback) => {
    const isOfflineNow = typeof navigator !== 'undefined' && !navigator.onLine;
    if (!isSignedIn && !isPreview && !isOfflineNow) {
      setIsAuthPromptOpen(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  const handleOpenAdd = () => {
    if (!requireAuth()) return;
    setIsAddMounted(true);
    setTimeout(() => setIsAddVisible(true), 10);
  };
  const handleCloseAdd = () => {
    setIsAddVisible(false);
    setTimeout(() => setIsAddMounted(false), 300);
  };

  const handleOpenManage = () => {
    if (!requireAuth()) return;
    closeAllModals(true);
    setIsManageMounted(true);
    setTimeout(() => setIsManageVisible(true), 10);
  };
  const handleCloseManage = () => {
    setIsManageVisible(false);
    setTimeout(() => setIsManageMounted(false), 300);
  };

  // Close all modals/pages — ensures only one is visible at a time
  const closeAllModals = (skipManage = false) => {
    setIsAnalyticsModalOpen(false);
    setIsTasksModalOpen(false);
    setIsPomodoroOpen(false);
    setIsAmbientModalOpen(false);
    setIsFlightFocusOpen(false);
    setIsHowToUseOpen(false);
    setIsCardsModalOpen(false);
    setIsAvatarModalOpen(false);
    setIsSettingsMenuOpen(false);
    setIsFocusMenuOpen(false);
    setIsWidgetsModalOpen(false);
    setIsAppearanceModalOpen(false);
    setIsFriendsModalOpen(false);
    setSelectedFriendForModal(null);
    setIsScheduleCalendarOpen(false);
    setIsEditVisible(false);
    setTimeout(() => setIsEditMounted(false), 300);
    if (!skipManage) {
      setIsManageVisible(false);
      setTimeout(() => setIsManageMounted(false), 300);
    }
  };

  // Nav helpers: close everything, then open the target
  const navTo = (target) => {
    closeAllModals();
    if (target === 'analytics') setIsAnalyticsModalOpen(true);
    else if (target === 'tasks') setIsTasksModalOpen(true);
    else if (target === 'schedule') setIsScheduleCalendarOpen(true);
    else if (target === 'pomodoro') setIsPomodoroOpen(true);
    else if (target === 'ambient') setIsAmbientModalOpen(true);
    else if (target === 'flight') setIsFlightFocusOpen(true);
    else if (target === 'friends') {
      setSelectedFriendForModal(null);
      setIsFriendsModalOpen(true);
    }
    else if (target === 'home') topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState('single');
  const [newHabitSubItems, setNewHabitSubItems] = useState(['', '']);

  // Habit frequency & scheduling
  const [habitFrequency, setHabitFrequency] = useState('daily'); // 'daily' | 'once' | 'weekly' | 'monthly' | 'yearly'
  const [habitScheduleOnceDate, setHabitScheduleOnceDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [habitScheduleDays, setHabitScheduleDays] = useState([0]); // 0=Sun, 1=Mon...
  const [habitScheduleDayOfMonth, setHabitScheduleDayOfMonth] = useState(1);
  const [habitScheduleMonthDay, setHabitScheduleMonthDay] = useState("01-01");

  // Additional habit data (time, duration & location)
  const [habitTime, setHabitTime] = useState("");
  const [habitDuration, setHabitDuration] = useState("");
  const [habitLocation, setHabitLocation] = useState("");
  const [habitCategory, setHabitCategory] = useState("habit");
  const [selectedTimeHour, setSelectedTimeHour] = useState(4);
  const [selectedTimeMinute, setSelectedTimeMinute] = useState("00");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("PM");
  const [habitIsPrivate, setHabitIsPrivate] = useState(false);
  const [habitHasReminder, setHabitHasReminder] = useState(false);
  const [habitReminderTime, setHabitReminderTime] = useState("");
  const [habitReminderHour, setHabitReminderHour] = useState(8);
  const [habitReminderMinute, setHabitReminderMinute] = useState("00");
  const [habitReminderPeriod, setHabitReminderPeriod] = useState("AM");
  const [habitReminderMessage, setHabitReminderMessage] = useState("");

  // --- Emergency Cards Modal ---
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);

  function getFormatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const [habitCustomMessage, setHabitCustomMessage] = useState("");

  const [sleepInput, setSleepInput] = useState("");

  const activeDateStr = getFormatDateStr(baseDate);
  const realTodayStr = getFormatDateStr(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = getFormatDateStr(yesterdayObj);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getFormatDateStr(tomorrowObj);

  // Helper: check if habit is scheduled for date
  const isHabitScheduledForDate = (habit, targetDateStr) => {
    if (!habit) return false;
    const freq = habit.frequency || 'daily';
    if (freq === 'daily') return true;

    // Parse targetDateStr "YYYY-MM-DD"
    const parts = targetDateStr.split('-');
    if (parts.length !== 3) return true;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10); // 1-12
    const d = parseInt(parts[2], 10); // 1-31
    const targetDate = new Date(y, m - 1, d);

    if (freq === 'once') {
      return habit.scheduleDate === targetDateStr;
    }

    if (freq === 'weekly') {
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday...
      return Array.isArray(habit.scheduleDays) && habit.scheduleDays.includes(dayOfWeek);
    }

    if (freq === 'monthly') {
      const scheduledDay = parseInt(habit.scheduleDate, 10);
      return scheduledDay === d;
    }

    if (freq === 'yearly') {
      const monthDay = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return habit.scheduleDate === monthDay;
    }

    return true;
  };

  // Helper to parse time string like "09:30 AM", "2:00 PM", "14:30" to minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 99999;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return 99999;