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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const todayKey = () => new Date().toISOString().split("T")[0];
const HISTORY_KEY = "scripture_history";
const THEME_KEY = "scripture_theme_color";
const TOTAL_KEY = "scripture_total";

export default function App() {
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [history, setHistory] = useState([]);
  const [goalInput, setGoalInput] = useState("");
  const [autoCountActive, setAutoCountActive] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(500);
  const [themeColor, setThemeColor] = useState("#E29F36");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [speedInput, setSpeedInput] = useState("500");

  const autoInterval = useRef(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Load stored data
  useEffect(() => {
    (async () => {
      const t = todayKey();
      const [c, g, h, theme, total] = await Promise.all([
        AsyncStorage.getItem(`count_${t}`),
        AsyncStorage.getItem(`goal_${t}`),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(TOTAL_KEY),
      ]);
      if (c !== null) setCount(parseInt(c, 10) || 0);
      if (g !== null) setDailyGoal(parseInt(g, 10) || 0);
      if (h !== null) setHistory(JSON.parse(h));
      if (theme) setThemeColor(theme);
      if (total) setTotalCount(parseInt(total, 10) || 0);
    })();
  }, []);

  // Persist count & total
  useEffect(() => {
    AsyncStorage.setItem(`count_${todayKey()}`, String(count));
    AsyncStorage.setItem(TOTAL_KEY, String(totalCount));
  }, [count, totalCount]);
  useEffect(() => {
    if (dailyGoal > 0) AsyncStorage.setItem(`goal_${todayKey()}`, String(dailyGoal));
    else AsyncStorage.removeItem(`goal_${todayKey()}`);
  }, [dailyGoal]);
  useEffect(() => {
    AsyncStorage.setItem(THEME_KEY, themeColor);
  }, [themeColor]);

  // Glow animation
  const triggerGlow = () => {
    glowAnim.setValue(0);
    Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // Increment count
  const increment = () => {
    setCount((c) => c + 1);
    setTotalCount((t) => t + 1);
    triggerGlow();
  };

  // Auto count toggle
  const toggleAutoCount = () => {
    if (autoCountActive) {
      clearInterval(autoInterval.current);
      setAutoCountActive(false);
    } else {
      const speed = parseInt(speedInput, 10) || 500;
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

  const handleSetGoal = () => {
    const g = parseInt(goalInput, 10);
    if (Number.isNaN(g) || g < 0) return alert("Enter a valid goal");
    setDailyGoal(g);
    setGoalInput("");
    setShowGoalModal(false);
  };

  const getProgressPercentage = () => (dailyGoal === 0 ? 0 : Math.min(100, Math.round((count / dailyGoal) * 100)));
  const glowInterpolation = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Scroll</Text>

        <Animated.View style={[styles.circleContainer, { transform: [{ scale: glowInterpolation }] }]}>
          <TouchableOpacity
            onPress={increment}
            activeOpacity={0.7}
            style={[styles.circle, { borderColor: themeColor }]}
          >
            <Text style={[styles.count, { color: themeColor }]}>{count}</Text>
            <Text style={styles.totalCount}>Total: {totalCount}</Text>
          </TouchableOpacity>
        </Animated.View>

        {dailyGoal > 0 && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${getProgressPercentage()}%`, backgroundColor: themeColor }]}
              />
            </View>
            <Text style={styles.progressText}>
              {count} / {dailyGoal} — {getProgressPercentage()}%
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity onPress={resetToday} style={[styles.controlBtn, { borderColor: themeColor }]}>
            <Text style={[styles.controlText, { color: themeColor }]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAutoCount} style={[styles.controlBtn, { borderColor: themeColor }]}>
            <Text style={[styles.controlText, { color: themeColor }]}>
              {autoCountActive ? "Stop Auto" : "Auto Count"}
            </Text>
          </TouchableOpacity>

          <TextInput
            value={speedInput}
            onChangeText={setSpeedInput}
            placeholder="Speed ms"
            keyboardType="numeric"
            style={styles.speedInput}
          />

          <TouchableOpacity
            onPress={() => setShowColorModal(true)}
            style={[styles.controlBtn, { borderColor: themeColor }]}
          >
            <Text style={[styles.controlText, { color: themeColor }]}>Theme</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyRow}>
          <TouchableOpacity onPress={() => setShowGoalModal(true)} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: themeColor }]}>Set Goal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              commitDayHistory();
              setShowHistoryModal(true);
            }}
            style={styles.actionBtn}
          >
            <Text style={[styles.actionText, { color: themeColor }]}>History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f3e5ff" },
  content: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: "800", color: "#6B4426", textAlign: "center", marginBottom: 20 },
  circleContainer: { alignItems: "center", marginVertical: 20 },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF9F0",
  },
  count: { fontSize: 48, fontWeight: "800" },
  totalCount: { fontSize: 14, color: "#7A5533", marginTop: 6 },
  progressWrap: { marginTop: 20 },
  progressBar: { height: 12, backgroundColor: "#EFE6CF", borderRadius: 12, overflow: "hidden" },
  progressFill: { height: "100%" },
  progressText: { textAlign: "center", marginTop: 4, fontWeight: "600", color: "#7A4F2B" },
  controls: { flexDirection: "row", justifyContent: "space-around", marginVertical: 12, flexWrap: "wrap" },
  controlBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, marginVertical: 4 },
  controlText: { fontWeight: "700" },
  speedInput: { borderWidth: 1, borderColor: "#CCC", borderRadius: 10, padding: 6, width: 80, textAlign: "center" },
  historyRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  actionBtn: {
    backgroundColor: "#FFF9F0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  actionText: { color: "#6B4426", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  modalCard: {
    width: "90%",
    backgroundColor: "#FFF9F0",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFE2C4",
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#6B4426", marginBottom: 8 },
  input: { borderBottomWidth: 1.4, borderBottomColor: "#E6D8BE", fontSize: 16, color: "#6B4426", paddingVertical: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 8, backgroundColor: "#F2E7D1" },
  modalBtnText: { color: "#FFF", fontWeight: "700" },
  modalBtnTextNeutral: { color: "#6B4426", fontWeight: "700", marginHorizontal: 4 },
  emptyHistory: { textAlign: "center", marginTop: 20, color: "#8A6A4F" },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFAF0",
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#EFE6CF",
  },
  historyDate: { fontWeight: "700", color: "#6B4426" },
  historyMeta: { color: "#8A6A4F", marginTop: 4 },
  deleteText: { color: "#7A5533", fontSize: 13, marginTop: 6 },
});
