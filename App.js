// App.js
import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  Pressable,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

const todayKey = () => new Date().toISOString().split("T")[0];
const HISTORY_KEY = "scripture_history";
const THEME_KEY = "scripture_theme_color";
const TOTAL_KEY = "scripture_total";

const { height } = Dimensions.get("window");

function MainApp() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const counterDiameter = Math.min(screenWidth * (isTablet ? 0.45 : 0.78), 420);
  const contentBottomPadding = (isTablet ? 110 : 170) + insets.bottom;

  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [history, setHistory] = useState([]);
  const [goalInput, setGoalInput] = useState("");
  const [autoCountActive, setAutoCountActive] = useState(false);
  const [themeColor, setThemeColor] = useState("#E29F36");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [speedInput, setSpeedInput] = useState("500");

  const autoInterval = useRef(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Load stored data on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const t = todayKey();
        const [c, g, h, theme, total] = await Promise.all([
          AsyncStorage.getItem(`count_${t}`),
          AsyncStorage.getItem(`goal_${t}`),
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(TOTAL_KEY),
        ]);

        if (!isMounted) return;

        if (c !== null) setCount(parseInt(c, 10) || 0);
        if (g !== null) setDailyGoal(parseInt(g, 10) || 0);
        if (h !== null) setHistory(JSON.parse(h));
        if (theme) setThemeColor(theme);
        if (total) setTotalCount(parseInt(total, 10) || 0);
      } catch (e) {
        // fail silently in production; you could hook this to a logger
        console.warn("Failed to load stored data", e);
      }
    })();

    return () => {
      isMounted = false;
      if (autoInterval.current) {
        clearInterval(autoInterval.current);
        autoInterval.current = null;
      }
    };
  }, []);

  // Persist count & total
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(`count_${todayKey()}`, String(count));
        await AsyncStorage.setItem(TOTAL_KEY, String(totalCount));
      } catch (e) {
        console.warn("Failed to persist count data", e);
      }
    })();
  }, [count, totalCount]);

  useEffect(() => {
    (async () => {
      try {
        if (dailyGoal > 0) {
          await AsyncStorage.setItem(`goal_${todayKey()}`, String(dailyGoal));
        } else {
          await AsyncStorage.removeItem(`goal_${todayKey()}`);
        }
      } catch (e) {
        console.warn("Failed to persist goal", e);
      }
    })();
  }, [dailyGoal]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(THEME_KEY, themeColor);
      } catch (e) {
        console.warn("Failed to persist theme", e);
      }
    })();
  }, [themeColor]);

  // Glow animation
  const triggerGlow = () => {
    glowAnim.setValue(0);
    Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // Increment count
  const increment = () => {
    setCount((c) => c + 1);
    setTotalCount((t) => t + 1); // persistent total
    triggerGlow();
  };

  // Auto count toggle with min speed 300ms
  const toggleAutoCount = () => {
    if (autoCountActive) {
      clearInterval(autoInterval.current);
      setAutoCountActive(false);
    } else {
      let speed = parseInt(speedInput, 10) || 500;
      if (speed < 300) speed = 300;
      setAutoCountActive(true);
      autoInterval.current = setInterval(() => {
        setCount((c) => c + 1);
        setTotalCount((t) => t + 1);
        triggerGlow();
      }, speed);
    }
  };

  const resetToday = () => {
    commitDayHistory();
    setCount(0);
  };

  const commitDayHistory = () => {
    const date = todayKey();
    const entry = {
      date,
      count,
      goal: dailyGoal,
      completed: dailyGoal > 0 ? count >= dailyGoal : false,
    };
    const updated = [entry, ...history.filter((h) => h.date !== date)].slice(0, 30);
    setHistory(updated);
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const deleteHistoryItem = (date) => {
    const updated = history.filter((h) => h.date !== date);
    setHistory(updated);
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const clearAllHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  };

  const resetAllTimeTotal = async () => {
    try {
      setTotalCount(0);
      await AsyncStorage.setItem(TOTAL_KEY, "0");
    } catch (e) {
      console.warn("Failed to reset all-time total", e);
    }
  };

  const getBestDayCount = () => {
    if (!history || history.length === 0) return 0;
    return history.reduce((max, h) => (h.count > max ? h.count : max), 0);
  };

  // Count how many consecutive days (including today) the user has completed their goal
  const getCurrentStreak = () => {
    if (!history || history.length === 0) return 0;

    // Map by date for quick lookup
    const byDate = history.reduce((acc, item) => {
      acc[item.date] = item;
      return acc;
    }, {});

    let streak = 0;
    let cursor = new Date(todayKey());

    while (true) {
      const key = cursor.toISOString().split("T")[0];
      const entry = byDate[key];
      if (!entry || !entry.completed) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  };

  const handleSetGoal = () => {
    const g = parseInt(goalInput, 10);
    if (Number.isNaN(g) || g < 0) return alert("Enter a valid goal");
    setDailyGoal(g);
    setGoalInput("");
    setShowGoalModal(false);
  };

  const getProgressPercentage = () => (dailyGoal === 0 ? 0 : Math.min(100, Math.round((count / dailyGoal) * 100)));
  const glowInterpolation = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  const colorPalette = [
    "#E29F36",
    "#7A5533",
    "#b82988ff",
    "#A33E6B",
    "#3E6BA3",
    "#3EA36B",
    "#2fbb4dff",
    "#D9A066",
    "#8A6A4F",
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: contentBottomPadding,
            paddingHorizontal: isTablet ? 32 : 20,
          },
        ]}
      >
        {/* Top section: branding + quick stats */}
        <View style={[styles.headerSection, !isTablet && styles.headerSectionMobile]}>
          <View>
            <Text style={styles.appName}>Naam Jap Counter</Text>
            <Text style={styles.appTagline}>Mindful naam jap & tasbih counter.</Text>
            {history.length > 0 && (
              <Text style={styles.streakText}>
                Streak {getCurrentStreak()} day{getCurrentStreak() === 1 ? "" : "s"} · Best {getBestDayCount()}
              </Text>
            )}
          </View>
          <View style={[styles.headerStatsRow, !isTablet && styles.headerStatsRowMobile]}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Today</Text>
              <Text style={styles.chipValue}>{count}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>All time</Text>
              <Text style={styles.chipValue}>{totalCount}</Text>
            </View>
          </View>
        </View>

        {/* Main counter */}
        <Animated.View style={[styles.counterShell, { transform: [{ scale: glowInterpolation }] }]}>
          <Pressable
            onPress={increment}
            android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
            style={({ pressed }) => [
              styles.counterCircle,
              {
                borderColor: themeColor,
                shadowColor: themeColor,
                opacity: pressed ? 0.85 : 1,
                width: counterDiameter,
                height: counterDiameter,
                borderRadius: counterDiameter / 2,
              },
            ]}
          >
            <Text style={[styles.counterValue, { color: themeColor }]}>{count}</Text>
            <Text style={styles.counterHint}>Tap to add 1</Text>
          </Pressable>
        </Animated.View>

        <View style={[styles.sectionStack, isTablet && styles.sectionStackTablet]}>
          {dailyGoal > 0 && (
            <View style={[styles.progressCard, isTablet && styles.pairedCard]}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>Daily goal</Text>
                <Text style={[styles.progressPercent, { color: themeColor }]}>{getProgressPercentage()}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${getProgressPercentage()}%`, backgroundColor: themeColor }]}
                />
              </View>
              <Text style={styles.progressMeta}>
                {count} / {dailyGoal}
              </Text>
            </View>
          )}

          {/* Auto count controls */}
          <View style={[styles.sectionCard, isTablet && styles.pairedCard]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Auto counting</Text>
              <View
                style={[
                  styles.autoStatusPill,
                  { backgroundColor: autoCountActive ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.35)" },
                ]}
              >
                <View
                  style={[
                    styles.autoStatusDot,
                    { backgroundColor: autoCountActive ? "#22c55e" : "#64748b" },
                  ]}
                />
                <Text style={styles.autoStatusText}>{autoCountActive ? "Running" : "Idle"}</Text>
              </View>
            </View>

            <View style={styles.autoRow}>
              <TouchableOpacity
                onPress={toggleAutoCount}
                style={[
                  styles.primaryPillButton,
                  {
                    backgroundColor: autoCountActive ? "rgba(239,68,68,0.18)" : "rgba(56,189,248,0.16)",
                    borderColor: themeColor,
                  },
                ]}
              >
                <Text style={[styles.primaryPillText, { color: themeColor }]}>
                  {autoCountActive ? "Stop auto" : "Start auto"}
                </Text>
              </TouchableOpacity>

              <View style={styles.speedContainer}>
                <Text style={styles.speedLabel}>Speed (ms)</Text>
                <TextInput
                  value={speedInput}
                  onChangeText={setSpeedInput}
                  placeholder="500"
                  placeholderTextColor="#6b7280"
                  keyboardType="numeric"
                  style={styles.speedInput}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom sheet style controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={resetToday} style={styles.bottomItem} activeOpacity={0.8}>
            <Text style={[styles.bottomIcon, { color: themeColor }]}>⟳</Text>
            <Text style={styles.bottomLabel}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowGoalModal(true)}
            style={styles.bottomItem}
            activeOpacity={0.8}
          >
            <Text style={[styles.bottomIcon, { color: themeColor }]}>🎯</Text>
            <Text style={styles.bottomLabel}>Goal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              commitDayHistory();
              setShowHistoryModal(true);
            }}
            style={styles.bottomItem}
            activeOpacity={0.8}
          >
            <Text style={[styles.bottomIcon, { color: themeColor }]}>📜</Text>
            <Text style={styles.bottomLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowColorModal(true)}
            style={styles.bottomItem}
            activeOpacity={0.8}
          >
            <Text style={[styles.bottomIcon, { color: themeColor }]}>🎨</Text>
            <Text style={styles.bottomLabel}>Theme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals (Goal, History, Color) */}
      {/* Goal Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="e.g. 108"
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowGoalModal(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnTextNeutral}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSetGoal} style={[styles.modalBtn, { backgroundColor: themeColor }]}>
                <Text style={[styles.modalBtnText, { color: themeColor }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              {history.length === 0 ? (
                <Text style={styles.emptyHistory}>No history yet</Text>
              ) : (
                history.map((h) => (
                  <View key={h.date} style={styles.historyItem}>
                    <View>
                      <Text style={styles.historyDate}>{new Date(h.date).toLocaleDateString()}</Text>
                      <Text style={styles.historyMeta}>
                        Count: {h.count} • Goal: {h.goal}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteHistoryItem(h.date)}>
                      <Text style={[styles.deleteText, { color: themeColor }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity onPress={clearAllHistory} style={[styles.actionBtn, { marginTop: 10 }]}>
                <Text style={[styles.actionText, { color: themeColor }]}>Clear All History</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAllTimeTotal} style={[styles.actionBtn, { marginTop: 10 }]}>
                <Text style={[styles.actionText, { color: themeColor }]}>Reset All-Time Total</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={[styles.actionBtn, { marginTop: 10 }]}
              >
                <Text style={[styles.actionText, { color: themeColor }]}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Color Modal */}
      <Modal visible={showColorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Theme Color</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
              {colorPalette.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    setThemeColor(c);
                    setShowColorModal(false);
                  }}
                  style={{
                    backgroundColor: c,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    margin: 6,
                    borderWidth: 2,
                    borderColor: themeColor === c ? "#000" : "#fff",
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617", // slate-950
  },
  content: {},
  // Top header / branding
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  headerSectionMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
    paddingTop: 4,
    paddingBottom: 4,
    marginBottom: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#e5e7eb",
  },
  appTagline: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ca3af",
  },
  streakText: {
    marginTop: 6,
    fontSize: 12,
    color: "#e5e7eb",
  },
  headerStatsRow: {
    flexDirection: "row",
  },
  headerStatsRowMobile: {
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    marginLeft: 8,
    alignItems: "flex-start",
  },
  chipLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chipValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
  },

  // Main counter
  counterShell: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  counterCircle: {
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.98)",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 40,
    elevation: 16,
  },
  counterValue: {
    fontSize: 60,
    fontWeight: "900",
    letterSpacing: 2,
  },
  counterHint: {
    marginTop: 10,
    fontSize: 13,
    color: "#9ca3af",
  },

  sectionStack: {
    gap: 16,
  },
  sectionStackTablet: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  pairedCard: {
    flex: 1,
  },
  // Progress
  progressCard: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.45)",
    marginBottom: 16,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressBar: {
    height: 10,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressMeta: {
    marginTop: 8,
    fontSize: 12,
    color: "#9ca3af",
  },

  // Card / section
  sectionCard: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.45)",
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  autoStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  autoStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  autoStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  primaryPillButton: {
    flex: 1.2,
    marginRight: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryPillText: {
    fontSize: 14,
    fontWeight: "700",
  },
  speedContainer: {
    flex: 1,
  },
  speedLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
  },
  speedInput: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(75,85,99,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#e5e7eb",
  },

  // Bottom nav
  bottomControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: "center",
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.45)",
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
  },
  bottomIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  bottomLabel: {
    fontSize: 11,
    color: "#e5e7eb",
  },

  // Shared / modals / history
  actionBtn: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.45)",
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  actionText: {
    color: "#e5e7eb",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "rgba(15,23,42,0.98)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e5e7eb",
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75,85,99,0.9)",
    fontSize: 16,
    color: "#e5e7eb",
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginLeft: 8,
    backgroundColor: "rgba(30,64,175,0.5)",
  },
  modalBtnText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  modalBtnTextNeutral: {
    color: "#e5e7eb",
    fontWeight: "700",
    marginHorizontal: 4,
  },
  emptyHistory: {
    textAlign: "center",
    marginTop: 20,
    color: "#9ca3af",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.4)",
  },
  historyDate: {
    fontWeight: "700",
    color: "#e5e7eb",
  },
  historyMeta: {
    color: "#9ca3af",
    marginTop: 4,
  },
  deleteText: {
    color: "#f97316",
    fontSize: 13,
    marginTop: 6,
  },
});
