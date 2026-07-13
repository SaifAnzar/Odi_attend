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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar as RNStatusBar,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  status: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'Off-Day';
  totalMinutesWorked: number;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Navigation & Data
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history'>('dashboard');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState('http://10.217.44.114:3000'); // Default local dev API URL
  const [showSettings, setShowSettings] = useState(false);

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
        const savedApi = await AsyncStorage.getItem('apiUrl');
        if (savedApi) setApiUrl(savedApi);

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogs();
    }
  }, [isAuthenticated]);

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
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      // Save API URL preference
      await AsyncStorage.setItem('apiUrl', apiUrl);

      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user.role === 'Admin') {
          Alert.alert('Access Denied', 'Administrators must log in through the Web Admin portal.');
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
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (e) {
      Alert.alert('Connection Timeout', 'Could not reach the server. Make sure the API URL is correct.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Punch In / Out Trigger
  const handlePunch = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Blocked', 'GPS Location permission is required to log punches.');
      return;
    }

    setPunchLoading(true);
    try {
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
            address: 'Mobile App Checkpoint'
          },
          deviceInfo: deviceLabel,
          notes: punchNotes || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPunchNotes('');
        Alert.alert('Success', `Shift check-${isCheckedIn ? 'out' : 'in'} recorded!`);
        fetchLogs();
      } else {
        Alert.alert('Punch Failed', data.error || 'Operation denied by server.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Check your internet connection and try again.');
    } finally {
      setPunchLoading(false);
    }
  };

  // Log out
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setCurrentTab('dashboard');
        }
      }
    ]);
  };

  // ----------------- RENDER LOGIN INTERFACE -----------------
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.darkBackground}>
        <StatusBar style="light" />
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
                <Ionicons name="mail-outline" size={18} color="#9E9E9F" style={styles.inputIcon} />
                <TextInput
                  placeholder="name@odizo.in"
                  placeholderTextColor="#9E9E9F"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#9E9E9F" style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9E9E9F"
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

            {/* Server Settings Panel */}
            <TouchableOpacity 
              onPress={() => setShowSettings(!showSettings)} 
              style={styles.settingsToggle}
            >
              <Ionicons name="cog-outline" size={16} color="#9E9E9F" />
              <Text style={styles.settingsToggleText}>API Connections Settings</Text>
            </TouchableOpacity>

            {showSettings && (
              <View style={styles.settingsPanel}>
                <Text style={styles.settingsTitle}>Server Endpoint URL</Text>
                <TextInput
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  placeholder="http://192.168.X.X:3000"
                  placeholderTextColor="#9E9E9F"
                  autoCapitalize="none"
                  style={styles.settingsInput}
                />
                <Text style={styles.settingsInfo}>
                  Enter the computer local IP hosting the Next.js API portal.
                </Text>
              </View>
            )}

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
      <StatusBar style="light" />
      
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#E16167" />
        </TouchableOpacity>
      </View>

      {/* Main Tab Wrapper */}
      <View style={styles.tabContent}>
        {currentTab === 'dashboard' ? (
          /* ================= DASHBOARD TAB ================= */
          <ScrollView contentContainerStyle={styles.tabScroll} bounces={true}>
            {/* Shift snapshot Header */}
            <View style={styles.shiftCard}>
              <View style={styles.shiftCardHeader}>
                <Text style={styles.shiftTitle}>Daily Shift</Text>
                <Text style={styles.shiftStatusLabel}>
                  {isCheckedIn ? 'ON-SHIFT' : 'OFF-SHIFT'}
                </Text>
              </View>
              <Text style={styles.shiftValue}>{user?.shift.name}</Text>
              <Text style={styles.shiftTime}>
                Hours: {user?.shift.startTime} - {user?.shift.endTime}
              </Text>
            </View>

            {/* Live Ticking Timer display */}
            <View style={styles.timerWrapper}>
              <Text style={styles.timerTitle}>Active Clock-In Duration</Text>
              <Text style={styles.timerValue}>{liveTimer}</Text>
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
                  <Text style={styles.infoRowText}>
                    GPS Locked: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                  </Text>
                ) : (
                  <Text style={styles.infoRowText}>Searching for GPS satellite signal...</Text>
                )}
              </View>

              <View style={styles.noteWrapper}>
                <TextInput
                  placeholder="Add notes for today's punch..."
                  placeholderTextColor="#9E9E9F"
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
                  { color: todayRecord?.status === 'Present' ? '#4ADE80' : '#FBBF24' }
                ]}>
                  {todayRecord ? todayRecord.status : 'None'}
                </Text>
              </View>
            </View>
          </ScrollView>
        ) : (
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
                      <Text style={styles.recordDate}>{r.date}</Text>
                      <View style={[
                        styles.recordStatusBadge,
                        { backgroundColor: r.status === 'Present' ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)' }
                      ]}>
                        <Text style={[
                          styles.recordStatusText,
                          { color: r.status === 'Present' ? '#4ADE80' : '#FBBF24' }
                        ]}>
                          {r.status}
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
            color={currentTab === 'dashboard' ? '#E16167' : '#9E9E9F'} 
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'dashboard' ? '#E16167' : '#9E9E9F' }]}>
            Clock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('history')}
          style={[styles.tabItem, currentTab === 'history' && styles.tabActive]}
        >
          <Ionicons 
            name={currentTab === 'history' ? 'calendar' : 'calendar-outline'} 
            size={22} 
            color={currentTab === 'history' ? '#E16167' : '#9E9E9F'} 
          />
          <Text style={[styles.tabLabel, { color: currentTab === 'history' ? '#E16167' : '#9E9E9F' }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ----------------- PREMIUM GLASSMORPHIC STYLING -----------------
const styles = StyleSheet.create({
  darkBackground: {
    flex: 1,
    backgroundColor: '#0B0B0C',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 8,
  },
  settingsToggleText: {
    color: '#9E9E9F',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsPanel: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  settingsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  settingsInfo: {
    color: '#9E9E9F',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  portalLogoImage: {
    width: 90,
    height: 27,
  },
  portalHeaderSub: {
    color: '#9E9E9F',
    fontSize: 11,
    marginTop: 2,
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
    padding: 20,
    paddingBottom: 40,
  },
  shiftCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#9E9E9F',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  shiftStatusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E16167',
    letterSpacing: 0.5,
  },
  shiftValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shiftTime: {
    color: '#9E9E9F',
    fontSize: 12,
    marginTop: 6,
  },
  timerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  timerTitle: {
    color: '#9E9E9F',
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
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  punchActionSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  punchCircleBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#E16167',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  punchBtnIn: {
    shadowOpacity: 0.15,
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
    color: '#9E9E9F',
    fontSize: 12,
  },
  noteWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  notesInput: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    color: '#9E9E9F',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  statValue: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  refreshLogsBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#9E9E9F',
    fontSize: 13,
  },
  historyScroll: {
    flex: 1,
  },
  historyRecordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
    color: '#FFFFFF',
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
    color: '#9E9E9F',
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
    color: '#FFFFFF',
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
    color: '#9E9E9F',
    fontSize: 11,
  },
  recordHours: {
    color: '#E16167',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // ----------------- TAB BAR -----------------
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 76 : 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
});
