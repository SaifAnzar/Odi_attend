import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar as RNStatusBar,
  Image,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as AppThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { colors } from './constants/colors';

import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

NetInfo.configure({
  shouldFetchWiFiSSID: true,
});

const { width } = Dimensions.get('window');
const apiUrl = 'https://odi-attend-admin.vercel.app';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Employee' | 'Intern' | 'Admin';
  status: 'Active' | 'Inactive';
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

interface PunchSession {
  checkIn: string;
  checkOut?: string;
  checkInLocation: { latitude: number; longitude: number; address?: string };
  checkOutLocation?: { latitude: number; longitude: number; address?: string };
  checkInDevice?: string;
  checkOutDevice?: string;
}

interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;
  shiftSnapshot: {
    name: string;
    startTime: string;
    endTime: string;
  };
  sessions: PunchSession[];
  attendanceStatus: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'Off-Day';
  totalMinutesWorked: number;
  isFlagged?: boolean;
  flagReason?: string;
  status?: 'Approved' | 'Pending Approval' | 'Rejected';
}

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseYYYYMMDD = (str: string) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDisplayDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatApiDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  title: string;
}

function CalendarModal({ visible, onClose, selectedDate, onSelectDate, title }: CalendarModalProps) {
  const { theme } = useAppTheme();
  const styles = getStyles(theme);
  const parsedDate = parseYYYYMMDD(selectedDate);
  const [currentMonth, setCurrentMonth] = useState(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));

  useEffect(() => {
    if (visible) {
      const d = parseYYYYMMDD(selectedDate);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [visible, selectedDate]);

  if (!visible) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Generate days array (including padding for empty cells at the start)
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    onSelectDate(formatDateToYYYYMMDD(new Date(year, month, day)));
    onClose();
  };

  return (
    <Modal transparent={true} visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.calendarModalOverlay}>
        <View style={styles.calendarModalCard}>
          <View style={styles.calendarModalHeader}>
            <Text style={styles.calendarModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.calendarCloseBtn}>
              <Ionicons name="close" size={20} color={colors[theme].text} />
            </TouchableOpacity>
          </View>

          {/* Month selector */}
          <View style={styles.calendarMonthHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarNavBtn}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>{monthNames[month]} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.calendarNavBtn}>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Week Days Headers */}
          <View style={styles.calendarWeekdaysRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd, i) => (
              <Text key={i} style={styles.calendarWeekdayLabel}>{wd}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.calendarDaysGrid}>
            {days.map((day, index) => {
              const isSelected = day !== null && 
                parsedDate.getDate() === day && 
                parsedDate.getMonth() === month && 
                parsedDate.getFullYear() === year;

              return (
                <TouchableOpacity
                  key={index}
                  disabled={day === null}
                  onPress={() => day && handleSelectDay(day)}
                  style={[
                    styles.calendarDayCell,
                    isSelected && styles.calendarDayCellSelected
                  ]}
                >
                  <Text style={[
                    styles.calendarDayText,
                    day === null && { color: 'transparent' },
                    isSelected && styles.calendarDayTextSelected
                  ]}>
                    {day || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Custom Alert Context
interface CustomAlertContextType {
  showAlert: (
    title: string,
    message: string,
    type?: 'success' | 'error' | 'confirm',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => void;
}

const CustomAlertContext = React.createContext<CustomAlertContextType | null>(null);

export function useCustomAlert() {
  const context = React.useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within a CustomAlertProvider');
  }
  return context;
}

interface CustomAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
}

function CustomAlertModal({ config, onClose }: { config: CustomAlertConfig; onClose: () => void }) {
  const { theme } = useAppTheme();
  const styles = getStyles(theme);
  if (!config.visible) return null;

  const handleConfirm = () => {
    if (config.onConfirm) config.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (config.onCancel) config.onCancel();
    onClose();
  };

  let iconName: any = 'checkmark-circle-outline';
  let iconColor = '#4ADE80';
  let glowColor = 'rgba(74, 222, 128, 0.15)';
  
  if (config.type === 'error') {
    iconName = 'alert-circle-outline';
    iconColor = '#E16167';
    glowColor = 'rgba(225, 97, 103, 0.15)';
  } else if (config.type === 'confirm') {
    iconName = 'help-circle-outline';
    iconColor = '#FBBF24';
    glowColor = 'rgba(251, 191, 36, 0.15)';
  }

  return (
    <Modal transparent={true} visible={config.visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertModalOverlay}>
        <View style={[styles.alertModalCard, { shadowColor: iconColor }]}>
          <View style={[styles.alertIconGlow, { backgroundColor: glowColor }]}>
            <Ionicons name={iconName} size={36} color={iconColor} />
          </View>
          
          <Text style={styles.alertTitle}>{config.title}</Text>
          <Text style={styles.alertMessage}>{config.message}</Text>

          <View style={styles.alertActionsRow}>
            {config.type === 'confirm' ? (
              <>
                <TouchableOpacity onPress={handleCancel} style={styles.alertCancelBtn}>
                  <Text style={styles.alertCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.alertConfirmBtn}>
                  <Text style={styles.alertConfirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={handleConfirm} style={[styles.alertConfirmBtn, { flex: 1, backgroundColor: '#E16167' }]}>
                <Text style={styles.alertConfirmBtnText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CustomAlertProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'confirm' = 'success',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    setConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      onCancel
    });
  };

  const hideAlert = () => {
    setConfig(prev => ({ ...prev, visible: false }));
  };

  return (
    <CustomAlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlertModal config={config} onClose={hideAlert} />
    </CustomAlertContext.Provider>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const existingStatus = (await Notifications.getPermissionsAsync()) as any;
    let finalGranted = existingStatus?.granted || existingStatus?.status === 'granted';
    if (!finalGranted) {
      const askStatus = (await Notifications.requestPermissionsAsync()) as any;
      finalGranted = askStatus?.granted || askStatus?.status === 'granted';
    }
    if (!finalGranted) {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.error('Failed to fetch push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <CustomAlertProvider>
          <AppContent />
        </CustomAlertProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useAppTheme();
  const styles = getStyles(theme);
  const { showAlert } = useCustomAlert();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'leaves' | 'wfh' | 'swaps'>('dashboard');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Task Logger Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [completedTasksText, setCompletedTasksText] = useState('');

  // Notice System States
  const [notices, setNotices] = useState<any[]>([]);

  // Shift Swaps States
  const [swaps, setSwaps] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [swapColleagueId, setSwapColleagueId] = useState('');
  const [swapDate, setSwapDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [showSwapDatePicker, setShowSwapDatePicker] = useState(false);
  const [submittingSwap, setSubmittingSwap] = useState(false);
  const [fetchingSwaps, setFetchingSwaps] = useState(false);
  const [swapTab, setSwapTab] = useState<'create' | 'incoming' | 'outgoing'>('create');

  // Leave System States
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [leaveEndDate, setLeaveEndDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [fetchingLeaves, setFetchingLeaves] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Punch UI
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchNotes, setPunchNotes] = useState('');
  const [liveTimer, setLiveTimer] = useState('00:00:00');
  const [gpsLocked, setGpsLocked] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  // Load saved session on launch
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load session:', e);
      }
    };
    loadSession();

    // Ask for location permissions pre-emptively
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setGpsLocked(true);
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (err) {
          console.warn('GPS location fetch timed out on launch');
        }
      }
    })();

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isAuthenticated]);

  // Push Notification listeners
  useEffect(() => {
    // Foreground notification listener
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      const { title, body } = notification.request.content;
      if (title && body) {
        showAlert(title, body, 'success');
      }
    });

    // Notification response listener (when user taps the notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Register push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      const registerPush = async () => {
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            console.log('Sending push token to server:', pushToken);
            await fetch(`${apiUrl}/api/users/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ token: pushToken })
            });
          }
        } catch (e) {
          console.error('Failed to register push token on server:', e);
        }
      };
      registerPush();
    }
  }, [isAuthenticated, token]);

  const formatDate = (isoStr: string) => {
    return formatDisplayDate(isoStr);
  };

  const fetchNotices = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/notices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.notices) {
        setNotices(data.notices);
      }
    } catch (e) {
      console.error('Fetch notices failed:', e);
    }
  };

  const fetchColleagues = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/users/colleagues`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.colleagues) {
        setColleagues(data.colleagues);
      }
    } catch (e) {
      console.error('Fetch colleagues failed:', e);
    }
  };

  const fetchSwaps = async () => {
    if (!token) return;
    try {
      setFetchingSwaps(true);
      const res = await fetch(`${apiUrl}/api/swaps`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      console.log('[DEBUG SWAPS] data.swaps:', JSON.stringify(data.swaps));
      console.log('[DEBUG SWAPS] current user:', JSON.stringify(user));
      if (res.ok && data.swaps) {
        setSwaps(data.swaps);
      }
    } catch (e) {
      console.error('Fetch swaps failed:', e);
    } finally {
      setFetchingSwaps(false);
    }
  };

  const handleAcknowledgeNotice = async (noticeId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/notices/${noticeId}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchNotices();
      }
    } catch (err) {
      console.error('Acknowledge notice failed:', err);
    }
  };

  const handleCreateSwap = async () => {
    if (!swapColleagueId) {
      showAlert('Error', 'Please select a colleague to swap shifts with.', 'error');
      return;
    }

    try {
      setSubmittingSwap(true);
      const res = await fetch(`${apiUrl}/api/swaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: swapColleagueId,
          swapDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Success', 'Shift swap request submitted successfully.', 'success');
        setSwapColleagueId('');
        fetchSwaps();
      } else {
        showAlert('Error', data.error || 'Failed to submit shift swap request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error', 'An unexpected network error occurred.', 'error');
    } finally {
      setSubmittingSwap(false);
    }
  };

  const handleReviewSwap = async (swapId: string, status: 'Pending Admin' | 'Rejected') => {
    try {
      const res = await fetch(`${apiUrl}/api/swaps/${swapId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Success', status === 'Pending Admin' ? 'Swap request accepted! Pending Admin approval.' : 'Swap request rejected.', 'success');
        fetchSwaps();
      } else {
        showAlert('Error', data.error || 'Failed to review shift swap.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error', 'An unexpected network error occurred.', 'error');
    }
  };

  // Fetch personal logs
  const fetchLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/attendance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      console.error('Fetch logs failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch personal leaves
  const [fetchingLeavesError, setFetchingLeavesError] = useState(''); // tracking error
  const fetchMyLeaves = async () => {
    if (!token) return;
    try {
      setFetchingLeaves(true);
      const res = await fetch(`${apiUrl}/api/leaves/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.leaves) {
        setLeaves(data.leaves);
      }
    } catch (e) {
      console.error('Fetch leaves failed:', e);
    } finally {
      setFetchingLeaves(false);
    }
  };

  const handleApplyLeave = async (reqType: 'Leave' | 'WFH' = 'Leave') => {
    if (!leaveReason.trim()) {
      showAlert('Error', `Please provide a reason for the ${reqType === 'WFH' ? 'WFH' : 'leave'} request.`, 'error');
      return;
    }

    if (parseYYYYMMDD(leaveStartDate) > parseYYYYMMDD(leaveEndDate)) {
      showAlert('Error', 'Start Date cannot be after End Date.', 'error');
      return;
    }

    try {
      setSubmittingLeave(true);
      const res = await fetch(`${apiUrl}/api/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user?._id,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason,
          requestType: reqType
        })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert('Success', `${reqType === 'WFH' ? 'WFH' : 'Leave'} request submitted successfully.`, 'success');
        setLeaveReason('');
        setLeaveStartDate(formatDateToYYYYMMDD(new Date()));
        setLeaveEndDate(formatDateToYYYYMMDD(new Date()));
        fetchMyLeaves();
      } else {
        showAlert('Error', data.error || 'Failed to submit leave request.', 'error');
      }
    } catch (e) {
      console.error('Submit leave failed:', e);
      showAlert('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogs();
      fetchMyLeaves();
      fetchNotices();
      fetchColleagues();
      fetchSwaps();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentTab === 'swaps') {
      fetchSwaps();
      fetchColleagues();
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab === 'leaves') {
      fetchMyLeaves();
    }
  }, [currentTab]);

  // Today's attendance session state
  const todayRecord = records.find(r => r.date === todayStr);
  const activeSession = todayRecord?.sessions.find(s => !s.checkOut);
  const isCheckedIn = !!activeSession;

  // Running timer for active shifts
  useEffect(() => {
    if (isCheckedIn && activeSession) {
      const startTime = new Date(activeSession.checkIn).getTime();
      
      const updateTimer = () => {
        const diffMs = Date.now() - startTime;
        const diffSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        const secs = diffSecs % 60;
        
        setLiveTimer(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setLiveTimer('00:00:00');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isCheckedIn, activeSession]);

  // Handle Login Submit
  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Missing Fields', 'Please enter your email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user.role === 'Admin') {
          showAlert('Access Denied', 'Administrators must log in through the Web Admin portal.', 'error');
          setLoading(false);
          return;
        }

        // Save token and user details to storage
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        showAlert('Login Failed', data.error || 'Invalid credentials', 'error');
      }
    } catch (e) {
      showAlert('Connection Timeout', 'Could not reach the server. Make sure the API URL is correct.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Punch In / Out Trigger Execution
  const executePunch = async (completedTasksList: string[] = []) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Location Blocked', 'GPS Location permission is required to log punches.', 'error');
      return;
    }

    setPunchLoading(true);
    try {
      // 1. Fetch Wi-Fi settings from backend
      const settingsRes = await fetch(`${apiUrl}/api/settings/wifi`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const settingsData = await settingsRes.json();
      
      let clientSsid: string | null = null;
      let clientIsFlagged = false;
      let clientFlagReason = '';

      if (settingsRes.ok && settingsData.config?.isWifiLockEnabled) {
        const allowedSSID = settingsData.config.allowedWifiSSID;
        
        try {
          // 2. Fetch current connected Wi-Fi SSID
          const netState = await NetInfo.fetch();
          clientSsid = netState.type === 'wifi' ? (netState.details as any).ssid : null;
        } catch (err) {
          console.warn('Failed to fetch Wi-Fi SSID:', err);
        }
        
        if (!clientSsid || clientSsid !== allowedSSID) {
          clientIsFlagged = true;
          clientFlagReason = 'Wi-Fi mismatch or network unavailable';
        }
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const deviceLabel = `${Platform.OS === 'ios' ? 'iOS App' : 'Android App'} (${Platform.Version})`;

      const res = await fetch(`${apiUrl}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: isCheckedIn ? 'Check-Out' : 'Check-In',
          location: { 
            latitude: loc.coords.latitude, 
            longitude: loc.coords.longitude, 
            address: `Mobile App Punch Location`
          },
          deviceInfo: deviceLabel,
          notes: punchNotes || undefined,
          ssid: clientSsid || undefined,
          isFlagged: clientIsFlagged,
          flagReason: clientFlagReason || undefined,
          completedTasks: isCheckedIn ? completedTasksList : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPunchNotes('');
        if (clientIsFlagged) {
          showAlert('Punch Recorded', `Shift check-${isCheckedIn ? 'out' : 'in'} recorded, but flagged: ${clientFlagReason}.`, 'error');
        } else {
          showAlert('Success', `Shift check-${isCheckedIn ? 'out' : 'in'} recorded!`, 'success');
        }
        fetchLogs();
      } else {
        showAlert('Punch Failed', data.error || 'Operation denied by server.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Check your internet connection and try again.', 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunch = () => {
    if (isCheckedIn) {
      setCompletedTasksText('');
      setShowTaskModal(true);
    } else {
      executePunch();
    }
  };

  const handleTaskSubmit = () => {
    setShowTaskModal(false);
    const tasks = completedTasksText
      .split('\n')
      .map(t => t.replace(/^[-*•\s]+/, '').trim())
      .filter(t => t.length > 0);
    executePunch(tasks);
  };

  // Log out
  const handleLogout = async () => {
    showAlert(
      'Logout',
      'Are you sure you want to log out?',
      'confirm',
      async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setCurrentTab('dashboard');
      }
    );
  };
  // ----------------- RENDER LOGIN INTERFACE -----------------
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.darkBackground}>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
        
        {/* Top-Right Theme Toggle */}
        <TouchableOpacity 
          onPress={toggleTheme} 
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 12 : 20,
            right: 20,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} 
            size={14} 
            color={colors[theme].text} 
          />
          <Text style={{ fontSize: 11, color: colors[theme].text, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollCenter} bounces={false}>
            {/* Top Logo / Accent */}
            <View style={styles.logoContainer}>
              <View style={styles.redDotGlow}></View>
              <Image 
                source={require('./assets/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>

            {/* Glass Form Panel */}
            <View style={styles.formPanel}>
              <Text style={styles.formTitle}>Sign In</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors[theme].textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={colors[theme].textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors[theme].textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={colors[theme].textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  style={styles.textInput}
                />
              </View>

              <TouchableOpacity 
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} ODIZO. All rights reserved.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ----------------- RENDER PORTAL INTERFACE -----------------
  return (
    <SafeAreaView style={styles.darkBackground}>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      
      {/* Header Panel */}
      <View style={styles.portalHeader}>
        <View style={{ flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
          <Image 
            source={require('./assets/logo.png')} 
            style={styles.portalLogoImage} 
            resizeMode="contain" 
          />
          <Text style={styles.portalHeaderSub}>{user?.name} ({user?.role})</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn} activeOpacity={0.7}>
            <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={20} color={colors[theme].text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#E16167" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Wrapper */}
      <View style={styles.tabContent}>
        {currentTab === 'dashboard' ? (
          /* ================= DASHBOARD TAB ================= */
          <ScrollView contentContainerStyle={styles.tabScroll} bounces={true}>
            {/* active notices board */}
            {notices.filter(n => !n.acknowledgedBy.some((id: any) => (id?._id || id) === ((user as any)?.id || user?._id))).map((notice) => {
              let cardBg = 'rgba(56, 189, 248, 0.08)';
              let cardBorder = 'rgba(56, 189, 248, 0.15)';
              let textAccent = '#38BDF8';
              let iconName: any = 'information-circle-outline';

              if (notice.type === 'Warning') {
                cardBg = 'rgba(225, 97, 103, 0.08)';
                cardBorder = 'rgba(225, 97, 103, 0.15)';
                textAccent = '#E16167';
                iconName = 'alert-circle-outline';
              } else if (notice.type === 'Holiday') {
                cardBg = 'rgba(74, 222, 128, 0.08)';
                cardBorder = 'rgba(74, 222, 128, 0.15)';
                textAccent = '#4ADE80';
                iconName = 'calendar-outline';
              }

              return (
                <View key={notice._id} style={[styles.noticeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={styles.noticeHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={iconName} size={18} color={textAccent} />
                      <Text style={[styles.noticeTag, { color: textAccent }]}>{notice.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.noticeTime}>
                      {new Date(notice.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.noticeTitleText}>{notice.title}</Text>
                  <Text style={styles.noticeContentText}>{notice.content}</Text>
                  <TouchableOpacity
                    onPress={() => handleAcknowledgeNotice(notice._id)}
                    style={[styles.noticeAckBtn, { borderColor: cardBorder }]}
                  >
                    <Ionicons name="eye-outline" size={14} color={colors[theme].text} style={{ marginRight: 4 }} />
                    <Text style={styles.noticeAckBtnText}>Acknowledge / Mark as Read</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Shift snapshot Header */}
            <View style={styles.shiftCard}>
              <View style={styles.shiftCardHeader}>
                <Text style={styles.shiftTitle}>Daily Shift</Text>
                <Text style={styles.shiftStatusLabel}>
                  {isCheckedIn ? 'ON-SHIFT' : 'OFF-SHIFT'}
                </Text>
              </View>
              <Text 
                style={styles.shiftValue}
                adjustsFontSizeToFit={true}
                numberOfLines={1}
              >
                {user?.shift.name}
              </Text>
              <Text style={styles.shiftTime}>
                Hours: {user?.shift.startTime} - {user?.shift.endTime}
              </Text>
            </View>

            {/* Live Ticking Timer display */}
            <View style={styles.timerWrapper}>
              <Text style={styles.timerTitle}>Active Clock-In Duration</Text>
              <Text 
                style={styles.timerValue}
                adjustsFontSizeToFit={true}
                numberOfLines={1}
              >
                {liveTimer}
              </Text>
            </View>

            {/* Glowing Action Button Container */}
            <View style={styles.punchActionSection}>
              <TouchableOpacity
                onPress={handlePunch}
                disabled={punchLoading}
                activeOpacity={0.8}
                style={[
                  styles.punchCircleBtn,
                  isCheckedIn ? styles.punchBtnOut : styles.punchBtnIn
                ]}
              >
                <LinearGradient
                  colors={isCheckedIn ? ['#E16167', '#A3464B'] : ['#FFFFFF', '#D1D1D2']}
                  style={styles.punchGradient}
                >
                  {punchLoading ? (
                    <ActivityIndicator color={isCheckedIn ? '#FFFFFF' : '#000000'} size="large" />
                  ) : (
                    <>
                      <Ionicons
                        name={isCheckedIn ? 'stop' : 'play'}
                        size={32}
                        color={isCheckedIn ? '#FFFFFF' : '#000000'}
                      />
                      <Text style={[
                        styles.punchBtnText,
                        { color: isCheckedIn ? '#FFFFFF' : '#000000' }
                      ]}>
                        {isCheckedIn ? 'Punch Out' : 'Punch In'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* GPS check & details */}
            <View style={styles.detailsSection}>
              <View style={styles.infoRow}>
                <Ionicons name="pin" size={16} color="#E16167" />
                {gpsCoords ? (
                  <Text 
                    style={styles.infoRowText}
                    adjustsFontSizeToFit={true}
                    numberOfLines={1}
                  >
                    GPS Locked: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                  </Text>
                ) : (
                  <Text 
                    style={styles.infoRowText}
                    adjustsFontSizeToFit={true}
                    numberOfLines={1}
                  >
                    Searching for GPS satellite signal...
                  </Text>
                )}
              </View>

              <View style={styles.noteWrapper}>
                <TextInput
                  placeholder="Add notes for today's punch..."
                  placeholderTextColor={colors[theme].textMuted}
                  value={punchNotes}
                  onChangeText={setPunchNotes}
                  style={styles.notesInput}
                />
              </View>
            </View>

            {/* Today's stats */}
            <View style={styles.summaryStatsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Today's Duration</Text>
                <Text style={styles.statValue}>
                  {todayRecord 
                    ? `${Math.floor(todayRecord.totalMinutesWorked / 60)}h ${todayRecord.totalMinutesWorked % 60}m`
                    : '0h 0m'}
                </Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Session status</Text>
                <Text style={[
                  styles.statValue, 
                  { color: todayRecord?.attendanceStatus === 'Present' ? '#4ADE80' : '#FBBF24' }
                ]}>
                  {todayRecord ? todayRecord.attendanceStatus : 'None'}
                </Text>
              </View>
            </View>
          </ScrollView>
        ) : currentTab === 'history' ? (
          /* ================= HISTORY TAB ================= */
          <View style={styles.historyWrapper}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Shift Log History</Text>
              <TouchableOpacity onPress={fetchLogs} style={styles.refreshLogsBtn}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#E16167" size="large" style={styles.historyLoader} />
            ) : records.length === 0 ? (
              <View style={styles.emptyLogs}>
                <Ionicons name="calendar-outline" size={48} color="#9E9E9F" />
                <Text style={styles.emptyLogsText}>No attendance records found.</Text>
              </View>
            ) : (
              <ScrollView bounces={true} style={styles.historyScroll}>
                {records.map((r) => (
                  <View key={r._id} style={styles.historyRecordCard}>
                    <View style={styles.recordCardTop}>
                      <Text style={styles.recordDate}>{formatDisplayDate(r.date)}</Text>
                      <View style={[
                        styles.recordStatusBadge,
                        { backgroundColor: r.attendanceStatus === 'Present' ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)' }
                      ]}>
                        <Text style={[
                          styles.recordStatusText,
                          { color: r.attendanceStatus === 'Present' ? '#4ADE80' : '#FBBF24' }
                        ]}>
                          {r.attendanceStatus}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.recordShiftName}>Shift: {r.shiftSnapshot.name}</Text>

                    {/* Render session list */}
                    <View style={styles.sessionList}>
                      {r.sessions.map((s, idx) => (
                        <View key={idx} style={styles.sessionRow}>
                          <Text style={styles.sessionLabel}>Session {idx + 1}:</Text>
                          <Text style={styles.sessionTime}>
                            {new Date(s.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {s.checkOut ? ` - ${new Date(s.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Active)'}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.recordCardFooter}>
                      <Text style={styles.recordHoursLabel}>Time worked:</Text>
                      <Text style={styles.recordHours}>
                        {Math.floor(r.totalMinutesWorked / 60)}h {r.totalMinutesWorked % 60}m
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : currentTab === 'leaves' ? (
          /* ================= LEAVES TAB ================= */
          <View style={styles.historyWrapper}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Leave Management</Text>
              <TouchableOpacity onPress={fetchMyLeaves} style={styles.refreshLogsBtn} disabled={fetchingLeaves}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={true} style={styles.historyScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* UI Component 1: Apply Leave Form */}
              <View style={styles.applyLeaveCard}>
                <Text style={styles.applyLeaveTitle}>Apply For Leave</Text>
                
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerField}>
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                    <TouchableOpacity 
                      style={styles.datePickerBtn}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#E16167" style={{ marginRight: 6 }} />
                      <Text style={styles.datePickerBtnText}>
                        {formatDisplayDate(leaveStartDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerField}>
                    <Text style={styles.datePickerLabel}>End Date</Text>
                    <TouchableOpacity 
                      style={styles.datePickerBtn}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#E16167" style={{ marginRight: 6 }} />
                      <Text style={styles.datePickerBtnText}>
                        {formatDisplayDate(leaveEndDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.datePickerLabel}>Reason for Leave</Text>
                  <TextInput
                    placeholder="Describe the reason for your leave request..."
                    placeholderTextColor={colors[theme].textMuted}
                    multiline={true}
                    numberOfLines={3}
                    value={leaveReason}
                    onChangeText={setLeaveReason}
                    style={styles.leaveReasonInput}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => handleApplyLeave('Leave')}
                  disabled={submittingLeave}
                  style={styles.submitLeaveBtn}
                >
                  {submittingLeave ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitLeaveBtnText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* UI Component 2: Leave History */}
              <Text style={[styles.historyTitle, { marginTop: 24, marginBottom: 12, fontSize: 16 }]}>
                Leave Application History
              </Text>

              {fetchingLeaves && leaves.length === 0 ? (
                <ActivityIndicator color="#E16167" size="large" style={styles.historyLoader} />
              ) : leaves.filter((l: any) => !l.requestType || l.requestType === 'Leave').length === 0 ? (
                <View style={styles.emptyLogs}>
                  <Ionicons name="airplane-outline" size={48} color="#9E9E9F" />
                  <Text style={styles.emptyLogsText}>No past leave requests found.</Text>
                </View>
              ) : (
                leaves.filter((l: any) => !l.requestType || l.requestType === 'Leave').map((l) => {
                  const sDate = new Date(l.startDate).toISOString().split('T')[0];
                  const eDate = new Date(l.endDate).toISOString().split('T')[0];
                  const diffTime = Math.abs(new Date(l.endDate).getTime() - new Date(l.startDate).getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                  let badgeBg = 'rgba(251,191,36,0.15)';
                  let badgeText = '#FBBF24';
                  if (l.status === 'Approved') {
                    badgeBg = 'rgba(74,222,128,0.15)';
                    badgeText = '#4ADE80';
                  } else if (l.status === 'Rejected') {
                    badgeBg = 'rgba(225,97,103,0.15)';
                    badgeText = '#E16167';
                  }

                  return (
                    <View key={l._id} style={styles.historyRecordCard}>
                      <View style={styles.recordCardTop}>
                        <View style={{ flexDirection: 'column', gap: 4 }}>
                          <Text style={styles.recordDate}>
                            {formatDisplayDate(l.startDate)} to {formatDisplayDate(l.endDate)}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <View style={[styles.recordTypeBadge, { backgroundColor: 'rgba(225, 97, 103, 0.15)' }]}>
                              <Text style={[styles.recordTypeText, { color: '#E16167' }]}>
                                Leave
                              </Text>
                            </View>
                            <Text style={styles.recordDuration}>({diffDays} {diffDays === 1 ? 'day' : 'days'})</Text>
                          </View>
                        </View>
                        <View style={[styles.recordStatusBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.recordStatusText, { color: badgeText }]}>
                            {l.status}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.recordShiftName, { marginTop: 4, color: '#FFFFFF' }]}>Reason: {l.reason}</Text>

                      {l.adminRemarks ? (
                        <View style={styles.adminRemarksBox}>
                          <Text style={styles.adminRemarksTitle}>Admin Remarks:</Text>
                          <Text style={styles.adminRemarksText}>{l.adminRemarks}</Text>
                        </View>
                      ) : null}

                      <View style={styles.recordCardFooter}>
                        <Text style={styles.recordHoursLabel}>Applied on:</Text>
                        <Text style={styles.recordHours}>
                          {new Date(l.appliedOn).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        ) : currentTab === 'swaps' ? (
          /* ================= SHIFT SWAPS TAB ================= */
          <View style={styles.historyWrapper}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Shift Swapping</Text>
              <TouchableOpacity onPress={fetchSwaps} style={styles.refreshLogsBtn} disabled={fetchingSwaps}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Sub-tab selectors */}
            <View style={styles.swapTabRow}>
              <TouchableOpacity 
                onPress={() => setSwapTab('create')}
                style={[styles.swapTabItem, swapTab === 'create' && styles.swapTabActive]}
              >
                <Text style={[styles.swapTabLabel, { color: swapTab === 'create' ? '#E16167' : '#9E9E9F' }]}>Request</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setSwapTab('incoming')}
                style={[styles.swapTabItem, swapTab === 'incoming' && styles.swapTabActive]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.swapTabLabel, { color: swapTab === 'incoming' ? '#E16167' : '#9E9E9F' }]}>Incoming</Text>
                  {swaps.filter(s => {
                    const targetId = s.targetUserId?._id || s.targetUserId?.id || s.targetUserId;
                    const currentUserId = (user as any)?.id || user?._id;
                    return targetId === currentUserId && s.status === 'Pending Target';
                  }).length > 0 && (
                    <View style={{
                      backgroundColor: '#E16167',
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 1.5,
                    }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }}>
                        {swaps.filter(s => {
                          const targetId = s.targetUserId?._id || s.targetUserId?.id || s.targetUserId;
                          const currentUserId = (user as any)?.id || user?._id;
                          return targetId === currentUserId && s.status === 'Pending Target';
                        }).length}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setSwapTab('outgoing')}
                style={[styles.swapTabItem, swapTab === 'outgoing' && styles.swapTabActive]}
              >
                <Text style={[styles.swapTabLabel, { color: swapTab === 'outgoing' ? '#E16167' : '#9E9E9F' }]}>My Requests</Text>
              </TouchableOpacity>
            </View>

            <ScrollView bounces={true} style={styles.historyScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {swapTab === 'create' ? (
                /* Create Request Form */
                <View style={styles.applyLeaveCard}>
                  <Text style={styles.applyLeaveTitle}>Request Shift Swap</Text>
                  
                  <Text style={styles.datePickerLabel}>Select Colleague</Text>
                  <View style={styles.dropdownContainer}>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {colleagues.length === 0 ? (
                        <Text style={{ color: '#9E9E9F', fontSize: 12 }}>No active colleagues found.</Text>
                      ) : (
                        colleagues.map((c) => (
                          <TouchableOpacity
                            key={c._id}
                            onPress={() => setSwapColleagueId(c._id)}
                            style={[
                              styles.colleagueChip,
                              swapColleagueId === c._id && styles.colleagueChipActive
                            ]}
                          >
                            <Text style={[
                              styles.colleagueChipText,
                              swapColleagueId === c._id && { color: '#000000', fontWeight: 'bold' }
                            ]}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.datePickerLabel}>Swap Date</Text>
                    <TouchableOpacity 
                      style={[styles.datePickerBtn, { width: '100%' }]}
                      onPress={() => setShowSwapDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#E16167" style={{ marginRight: 6 }} />
                      <Text style={styles.datePickerBtnText}>
                        {formatDisplayDate(swapDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleCreateSwap}
                    disabled={submittingSwap}
                    style={styles.submitLeaveBtn}
                  >
                    {submittingSwap ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="swap-horizontal-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.submitLeaveBtnText}>Submit Swap Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : swapTab === 'incoming' ? (
                /* Incoming Requests Tab */
                fetchingSwaps && swaps.length === 0 ? (
                  <ActivityIndicator color="#E16167" size="large" style={styles.historyLoader} />
                ) : swaps.filter(s => {
                  const targetId = s.targetUserId?._id || s.targetUserId?.id || s.targetUserId;
                  const currentUserId = (user as any)?.id || user?._id;
                  return targetId === currentUserId && s.status === 'Pending Target';
                }).length === 0 ? (
                  <View style={styles.emptyLogs}>
                    <Ionicons name="swap-horizontal-outline" size={48} color="#9E9E9F" />
                    <Text style={styles.emptyLogsText}>No incoming requests from colleagues.</Text>
                  </View>
                ) : (
                  swaps.filter(s => {
                    const targetId = s.targetUserId?._id || s.targetUserId?.id || s.targetUserId;
                    const currentUserId = (user as any)?.id || user?._id;
                    return targetId === currentUserId && s.status === 'Pending Target';
                  }).map((s) => (
                    <View key={s._id} style={styles.historyRecordCard}>
                      <View style={styles.recordCardTop}>
                        <View style={{ flexDirection: 'column', gap: 4 }}>
                          <Text style={styles.recordDate}>{formatDate(s.swapDate)}</Text>
                          <Text style={styles.recordShiftName}>From: {s.requesterId?.name}</Text>
                        </View>
                        <View style={[styles.recordStatusBadge, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                          <Text style={[styles.recordStatusText, { color: '#FBBF24' }]}>{s.status}</Text>
                        </View>
                      </View>
                      <Text style={{ color: '#9E9E9F', fontSize: 11, marginTop: 4 }}>
                        They want to swap their shift ({s.requesterId?.shift?.startTime} - {s.requesterId?.shift?.endTime}) with yours ({s.targetUserId?.shift?.startTime} - {s.targetUserId?.shift?.endTime}).
                      </Text>
                      <View style={styles.swapActionRow}>
                        <TouchableOpacity
                          onPress={() => handleReviewSwap(s._id, 'Rejected')}
                          style={styles.swapDeclineBtn}
                        >
                          <Text style={styles.swapDeclineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleReviewSwap(s._id, 'Pending Admin')}
                          style={styles.swapAcceptBtn}
                        >
                          <Text style={styles.swapAcceptText}>Accept Swap</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              ) : (
                /* Outgoing Requests Tab */
                fetchingSwaps && swaps.length === 0 ? (
                  <ActivityIndicator color="#E16167" size="large" style={styles.historyLoader} />
                ) : swaps.filter(s => {
                  const requesterId = s.requesterId?._id || s.requesterId?.id || s.requesterId;
                  const currentUserId = (user as any)?.id || user?._id;
                  return requesterId === currentUserId;
                }).length === 0 ? (
                  <View style={styles.emptyLogs}>
                    <Ionicons name="paper-plane-outline" size={48} color="#9E9E9F" />
                    <Text style={styles.emptyLogsText}>You haven't requested any swaps yet.</Text>
                  </View>
                ) : (
                  swaps.filter(s => {
                    const requesterId = s.requesterId?._id || s.requesterId?.id || s.requesterId;
                    const currentUserId = (user as any)?.id || user?._id;
                    return requesterId === currentUserId;
                  }).map((s) => {
                    let badgeBg = 'rgba(251,191,36,0.15)';
                    let badgeText = '#FBBF24';
                    if (s.status === 'Approved') {
                      badgeBg = 'rgba(74,222,128,0.15)';
                      badgeText = '#4ADE80';
                    } else if (s.status === 'Rejected') {
                      badgeBg = 'rgba(225,97,103,0.15)';
                      badgeText = '#E16167';
                    }

                    return (
                      <View key={s._id} style={styles.historyRecordCard}>
                        <View style={styles.recordCardTop}>
                          <View style={{ flexDirection: 'column', gap: 4 }}>
                            <Text style={styles.recordDate}>{formatDate(s.swapDate)}</Text>
                            <Text style={styles.recordShiftName}>Colleague: {s.targetUserId?.name}</Text>
                          </View>
                          <View style={[styles.recordStatusBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.recordStatusText, { color: badgeText }]}>{s.status}</Text>
                          </View>
                        </View>
                        {s.adminRemarks ? (
                          <View style={styles.adminRemarksBox}>
                            <Text style={styles.adminRemarksTitle}>Admin Remarks:</Text>
                            <Text style={styles.adminRemarksText}>{s.adminRemarks}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )
              )}
            </ScrollView>
          </View>
        ) : (
          /* ================= WFH TAB ================= */
          <View style={styles.historyWrapper}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Work From Home (WFH)</Text>
              <TouchableOpacity onPress={fetchMyLeaves} style={styles.refreshLogsBtn} disabled={fetchingLeaves}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={true} style={styles.historyScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* UI Component 1: Apply WFH Form */}
              <View style={styles.applyLeaveCard}>
                <Text style={styles.applyLeaveTitle}>Apply For WFH</Text>
                
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerField}>
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                    <TouchableOpacity 
                      style={styles.datePickerBtn}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#E16167" style={{ marginRight: 6 }} />
                      <Text style={styles.datePickerBtnText}>
                        {formatDisplayDate(leaveStartDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerField}>
                    <Text style={styles.datePickerLabel}>End Date</Text>
                    <TouchableOpacity 
                      style={styles.datePickerBtn}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#E16167" style={{ marginRight: 6 }} />
                      <Text style={styles.datePickerBtnText}>
                        {formatDisplayDate(leaveEndDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.datePickerLabel}>Reason for WFH</Text>
                  <TextInput
                    placeholder="Describe the reason for your WFH request..."
                    placeholderTextColor={colors[theme].textMuted}
                    multiline={true}
                    numberOfLines={3}
                    value={leaveReason}
                    onChangeText={setLeaveReason}
                    style={styles.leaveReasonInput}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => handleApplyLeave('WFH')}
                  disabled={submittingLeave}
                  style={styles.submitLeaveBtn}
                >
                  {submittingLeave ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitLeaveBtnText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* UI Component 2: WFH History */}
              <Text style={[styles.historyTitle, { marginTop: 24, marginBottom: 12, fontSize: 16 }]}>
                WFH Request History
              </Text>

              {fetchingLeaves && leaves.length === 0 ? (
                <ActivityIndicator color="#E16167" size="large" style={styles.historyLoader} />
              ) : leaves.filter((l: any) => l.requestType === 'WFH').length === 0 ? (
                <View style={styles.emptyLogs}>
                  <Ionicons name="home-outline" size={48} color="#9E9E9F" />
                  <Text style={styles.emptyLogsText}>No past WFH requests found.</Text>
                </View>
              ) : (
                leaves.filter((l: any) => l.requestType === 'WFH').map((l) => {
                  const sDate = new Date(l.startDate).toISOString().split('T')[0];
                  const eDate = new Date(l.endDate).toISOString().split('T')[0];
                  const diffTime = Math.abs(new Date(l.endDate).getTime() - new Date(l.startDate).getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                  let badgeBg = 'rgba(251,191,36,0.15)';
                  let badgeText = '#FBBF24';
                  if (l.status === 'Approved') {
                    badgeBg = 'rgba(74,222,128,0.15)';
                    badgeText = '#4ADE80';
                  } else if (l.status === 'Rejected') {
                    badgeBg = 'rgba(225,97,103,0.15)';
                    badgeText = '#E16167';
                  }

                  return (
                    <View key={l._id} style={styles.historyRecordCard}>
                      <View style={styles.recordCardTop}>
                        <View style={{ flexDirection: 'column', gap: 4 }}>
                          <Text style={styles.recordDate}>
                            {formatDisplayDate(l.startDate)} to {formatDisplayDate(l.endDate)}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <View style={[styles.recordTypeBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                              <Text style={[styles.recordTypeText, { color: '#38BDF8' }]}>
                                WFH
                              </Text>
                            </View>
                            <Text style={styles.recordDuration}>({diffDays} {diffDays === 1 ? 'day' : 'days'})</Text>
                          </View>
                        </View>
                        <View style={[styles.recordStatusBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.recordStatusText, { color: badgeText }]}>
                            {l.status}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.recordShiftName, { marginTop: 4, color: '#FFFFFF' }]}>Reason: {l.reason}</Text>

                      {l.adminRemarks ? (
                        <View style={styles.adminRemarksBox}>
                          <Text style={styles.adminRemarksTitle}>Admin Remarks:</Text>
                          <Text style={styles.adminRemarksText}>{l.adminRemarks}</Text>
                        </View>
                      ) : null}

                      <View style={styles.recordCardFooter}>
                        <Text style={styles.recordHoursLabel}>Applied on:</Text>
                        <Text style={styles.recordHours}>
                          {new Date(l.appliedOn).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Dynamic Tab bar Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setCurrentTab('dashboard')}
          style={[styles.tabItem, currentTab === 'dashboard' && styles.tabActive]}
        >
          <Ionicons 
            name={currentTab === 'dashboard' ? 'time' : 'time-outline'} 
            size={22} 
            color={currentTab === 'dashboard' ? '#E16167' : colors[theme].textMuted} 
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'dashboard' ? '#E16167' : colors[theme].textMuted }]}>
            Clock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('swaps')}
          style={[styles.tabItem, currentTab === 'swaps' && styles.tabActive]}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons 
              name={currentTab === 'swaps' ? 'swap-horizontal' : 'swap-horizontal-outline'} 
              size={22} 
              color={currentTab === 'swaps' ? '#E16167' : colors[theme].textMuted} 
            />
            {swaps.filter(s => {
              const targetId = s.targetUserId?._id || s.targetUserId?.id || s.targetUserId;
              const currentUserId = (user as any)?.id || user?._id;
              return targetId === currentUserId && s.status === 'Pending Target';
            }).length > 0 && (
              <View 
                style={{
                  position: 'absolute',
                  right: -4,
                  top: -2,
                  backgroundColor: '#E16167',
                  borderRadius: 6,
                  width: 8,
                  height: 8,
                  borderWidth: 1.5,
                  borderColor: '#0C0C0D',
                }} 
              />
            )}
          </View>
          <Text style={[styles.tabLabel, { color: currentTab === 'swaps' ? '#E16167' : colors[theme].textMuted }]}>
            Swaps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('leaves')}
          style={[styles.tabItem, currentTab === 'leaves' && styles.tabActive]}
        >
          <Ionicons 
            name={currentTab === 'leaves' ? 'airplane' : 'airplane-outline'} 
            size={22} 
            color={currentTab === 'leaves' ? '#E16167' : colors[theme].textMuted} 
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'leaves' ? '#E16167' : colors[theme].textMuted }]}>
            Leaves
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('wfh')}
          style={[styles.tabItem, currentTab === 'wfh' && styles.tabActive]}
        >
          <Ionicons 
            name={currentTab === 'wfh' ? 'home' : 'home-outline'} 
            size={22} 
            color={currentTab === 'wfh' ? '#E16167' : colors[theme].textMuted} 
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'wfh' ? '#E16167' : colors[theme].textMuted }]}>
            WFH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('history')}
          style={[styles.tabItem, currentTab === 'history' && styles.tabActive]}
        >
          <Ionicons 
            name={currentTab === 'history' ? 'calendar' : 'calendar-outline'} 
            size={22} 
            color={currentTab === 'history' ? '#E16167' : colors[theme].textMuted} 
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'history' ? '#E16167' : colors[theme].textMuted }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Date Pickers */}
      <CalendarModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        selectedDate={leaveStartDate}
        onSelectDate={setLeaveStartDate}
        title="Select Start Date"
      />
      <CalendarModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        selectedDate={leaveEndDate}
        onSelectDate={setLeaveEndDate}
        title="Select End Date"
      />
      <CalendarModal
        visible={showSwapDatePicker}
        onClose={() => setShowSwapDatePicker(false)}
        selectedDate={swapDate}
        onSelectDate={setSwapDate}
        title="Select Swap Date"
      />

      {/* Task Logger Modal */}
      <Modal transparent={true} visible={showTaskModal} animationType="slide" onRequestClose={() => setShowTaskModal(false)}>
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalCard}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>End-of-Day Tasks</Text>
              <TouchableOpacity onPress={() => setShowTaskModal(false)} style={styles.calendarCloseBtn}>
                <Ionicons name="close" size={20} color={colors[theme].text} />
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', marginTop: 12 }}>
              <Text style={styles.datePickerLabel}>What tasks did you complete today?</Text>
              <TextInput
                placeholder="Type your completed tasks here (use separate lines)..."
                placeholderTextColor={colors[theme].textMuted}
                multiline={true}
                numberOfLines={6}
                value={completedTasksText}
                onChangeText={setCompletedTasksText}
                style={[styles.leaveReasonInput, { height: 120, textAlignVertical: 'top' }]}
              />
            </View>

            <TouchableOpacity
              onPress={handleTaskSubmit}
              disabled={punchLoading}
              style={[styles.submitLeaveBtn, { width: '100%', marginTop: 20 }]}
            >
              {punchLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitLeaveBtnText}>Submit & Check-Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------- PREMIUM GLASSMORPHIC STYLING -----------------
const getStyles = (theme: 'light' | 'dark') => {
  const themeColors = colors[theme];
  const screenWidth = Dimensions.get('window').width;
  const punchBtnSize = screenWidth * 0.5;
  return StyleSheet.create({
  // Alert Modal Styles
  alertModalOverlay: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertModalCard: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: theme === 'light' ? '#FFFFFF' : '#131315',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: themeColors.shadowOpacity,
    shadowRadius: 20,
    elevation: 8,
  },
  alertIconGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    color: themeColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    justifyContent: 'center',
  },
  alertConfirmBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#E16167',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  alertConfirmBtnText: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: themeColors.inputBg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCancelBtnText: {
    color: themeColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  darkBackground: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    width: '100%',
  },
  redDotGlow: {
    position: 'absolute',
    top: -10,
    width: 140,
    height: 60,
    backgroundColor: '#E16167',
    opacity: 0.1,
    borderRadius: 30,
    blurRadius: 15,
  } as any,
  logoImage: {
    width: 180,
    height: 54,
  },
  formPanel: {
    width: '100%',
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: themeColors.text,
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: '#E16167',
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnText: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  footerCopyright: {
    color: '#6E6E70',
    fontSize: 10,
    marginTop: 40,
  },

  // ----------------- PORTAL LAYOUTS -----------------
  portalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  portalLogoImage: {
    width: 90,
    height: 27,
  },
  portalHeaderSub: {
    color: themeColors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  themeToggleBtn: {
    padding: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: 'rgba(225, 97, 103, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(225, 97, 103, 0.1)',
  },
  tabContent: {
    flex: 1,
  },
  tabScroll: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  shiftCard: {
    backgroundColor: themeColors.cardBackground,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftTitle: {
    color: themeColors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  shiftStatusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: themeColors.primary,
    letterSpacing: 0.5,
  },
  shiftValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  shiftTime: {
    color: themeColors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  timerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  timerTitle: {
    color: themeColors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  timerValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 32,
    fontWeight: 'bold',
    color: themeColors.text,
    letterSpacing: 2,
  },
  punchActionSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  punchCircleBtn: {
    width: punchBtnSize,
    height: punchBtnSize,
    borderRadius: punchBtnSize / 2,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  punchBtnIn: {
    shadowOpacity: themeColors.shadowOpacity,
  },
  punchBtnOut: {
    shadowOpacity: 0.35,
  },
  punchGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  punchBtnText: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsSection: {
    backgroundColor: themeColors.cardBackground,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRowText: {
    color: themeColors.textMuted,
    fontSize: 12,
  },
  noteWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  notesInput: {
    color: themeColors.text,
    fontSize: 12,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: themeColors.cardBackground,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    color: themeColors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  statValue: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
  },

  // ----------------- HISTORY DISPLAY -----------------
  historyWrapper: {
    flex: 1,
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  refreshLogsBtn: {
    padding: 6,
    backgroundColor: themeColors.inputBg,
    borderRadius: 8,
  },
  historyLoader: {
    marginTop: 40,
  },
  emptyLogs: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyLogsText: {
    color: themeColors.textMuted,
    fontSize: 13,
  },
  historyScroll: {
    flex: 1,
  },
  historyRecordCard: {
    backgroundColor: themeColors.cardBackground,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  recordCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: themeColors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recordStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  recordStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  recordShiftName: {
    color: themeColors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  sessionList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 8,
    gap: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionLabel: {
    color: '#6E6E70',
    fontSize: 11,
  },
  sessionTime: {
    color: themeColors.text,
    fontSize: 11,
    fontWeight: '500',
  },
  recordCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
    marginTop: 4,
  },
  recordHoursLabel: {
    color: themeColors.textMuted,
    fontSize: 11,
  },
  recordHours: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // ----------------- TAB BAR -----------------
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 76 : 60,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: '#060607',
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {
    backgroundColor: 'rgba(225, 97, 103, 0.02)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Calendar Modal Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: theme === 'light' ? '#FFFFFF' : '#131315',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: themeColors.shadowOpacity,
    shadowRadius: 20,
    elevation: 5,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#202023',
    paddingBottom: 10,
  },
  calendarModalTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: themeColors.inputBg,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  calendarMonthText: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekdayLabel: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    width: 36,
    textAlign: 'center',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 18,
  },
  calendarDayCellSelected: {
    backgroundColor: '#E16167',
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarDayText: {
    color: themeColors.text,
    fontSize: 13,
  },
  calendarDayTextSelected: {
    color: themeColors.text,
    fontWeight: 'bold',
  },
  applyLeaveCard: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  applyLeaveTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePickerField: {
    flex: 1,
  },
  datePickerLabel: {
    color: themeColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.inputBg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerBtnText: {
    color: themeColors.text,
    fontSize: 13,
  },
  leaveReasonInput: {
    backgroundColor: themeColors.inputBg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    color: themeColors.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitLeaveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E16167',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  submitLeaveBtnText: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminRemarksBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(225, 97, 103, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(225, 97, 103, 0.15)',
    borderRadius: 10,
  },
  adminRemarksTitle: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  adminRemarksText: {
    color: themeColors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  segmentControlContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(225, 97, 103, 0.1)',
    borderColor: 'rgba(225, 97, 103, 0.25)',
  },
  segmentBtnText: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: themeColors.primary,
    fontWeight: 'bold',
  },
  recordTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recordTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  recordDuration: {
    color: themeColors.textMuted,
    fontSize: 11,
  },
  // Notice styles
  noticeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTag: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  noticeTime: {
    color: themeColors.textMuted,
    fontSize: 10,
  },
  noticeTitleText: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noticeContentText: {
    color: themeColors.text,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  noticeAckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.inputBg,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  noticeAckBtnText: {
    color: themeColors.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Swaps styles
  swapTabRow: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  swapTabItem: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  swapTabActive: {
    backgroundColor: 'rgba(225, 97, 103, 0.1)',
    borderColor: 'rgba(225, 97, 103, 0.25)',
  },
  swapTabLabel: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownContainer: {
    marginTop: 2,
    marginBottom: 8,
  },
  colleagueChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: themeColors.inputBg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  colleagueChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  colleagueChipText: {
    color: themeColors.text,
    fontSize: 12,
  },
  swapActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: 12,
  },
  swapDeclineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(225, 97, 103, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225, 97, 103, 0.2)',
  },
  swapDeclineText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  swapAcceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  swapAcceptText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: 'bold',
  },
  });
};
