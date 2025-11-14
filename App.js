// App.js
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Scripture Scroll - Full working RN app
 * - All buttons implemented & tested logically
 * - Persistence with AsyncStorage
 * - Spiritual theme + accessible UI
 *
 * Usage:
 * 1. npm install @react-native-async-storage/async-storage
 * 2. Replace App.js with this file
 * 3. Run in Expo or RN
 */

// Helpers
const todayKey = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD
const HISTORY_KEY = "scripture_history";

export default function App() {
  const [count, setCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [history, setHistory] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [currentDate, setCurrentDate] = useState(todayKey());

  // Load initial data
  useEffect(() => {
    setCurrentDate(todayKey());
    loadAll();
  }, []);

  // Persist count & goal whenever they change (fast immediate save)
  useEffect(() => {
    saveCount();
  }, [count]);

  useEffect(() => {
    saveGoal();
  }, [dailyGoal]);

  // ----------- Persistence helpers -----------
  const saveCount = async () => {
    try {
      await AsyncStorage.setItem(`count_${todayKey()}`, String(count));
    } catch (e) {
      console.error("saveCount", e);
    }
  };

  const saveGoal = async () => {
    try {
      if (dailyGoal > 0) {
        await AsyncStorage.setItem(`goal_${todayKey()}`, String(dailyGoal));
      } else {
        // if goal is zero, remove today's key
        await AsyncStorage.removeItem(`goal_${todayKey()}`);
      }
    } catch (e) {
      console.error("saveGoal", e);
    }
  };

  const loadAll = async () => {
    try {
      const t = todayKey();
      const [c, g, h] = await Promise.all([
        AsyncStorage.getItem(`count_${t}`),
        AsyncStorage.getItem(`goal_${t}`),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);
      if (c !== null) setCount(parseInt(c, 10) || 0);
      if (g !== null) setDailyGoal(parseInt(g, 10) || 0);
      if (h !== null) setHistory(JSON.parse(h));
    } catch (e) {
      console.error("loadAll", e);
    }
  };

  const persistHistory = async (nextHistory) => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (e) {
      console.error("persistHistory", e);
    }
  };

  // ----------- Actions -----------
  const increment = () => {
    setCount((c) => c + 1);
  };

  const decrement = () => {
    setCount((c) => (c > 0 ? c - 1 : 0));
  };

  const resetToday = () => {
    Alert.alert("Reset Counter", "Are you sure you want to reset today's count?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          // Save pre-reset value into history before zeroing
          commitDayHistory(count, dailyGoal);
          setCount(0);
        },
      },
    ]);
  };

  // Save today's entry into history (replace if same date exists)
  const commitDayHistory = (overrideCount = null, overrideGoal = null) => {
    const date = todayKey();
    const entry = {
      date,
      count: overrideCount !== null ? overrideCount : count,
      goal: overrideGoal !== null ? overrideGoal : dailyGoal,
      completed: overrideGoal !== null ? overrideCount >= overrideGoal : dailyGoal > 0 ? count >= dailyGoal : false,
    };

    const updated = [entry, ...history.filter((h) => h.date !== date)].slice(0, 30);
    setHistory(updated);
    persistHistory(updated);
  };

  const handleSetGoal = () => {
    const g = parseInt(goalInput, 10);
    if (Number.isNaN(g) || g < 0) {
      Alert.alert("Invalid Goal", "Please enter a valid non-negative number");
      return;
    }
    setDailyGoal(g);
    setGoalInput("");
    setShowGoalModal(false);
    // immediate persist handled by useEffect(saveGoal)
  };

  // History actions
  const deleteHistoryItem = (date) => {
    Alert.alert("Delete entry", "Delete the entry for " + date + "?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const updated = history.filter((h) => h.date !== date);
          setHistory(updated);
          persistHistory(updated);
        },
      },
    ]);
  };

  const clearAllHistory = () => {
    Alert.alert("Clear history", "Remove all history? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setHistory([]);
          try {
            await AsyncStorage.removeItem(HISTORY_KEY);
          } catch (e) {
            console.error("clearAllHistory", e);
          }
        },
      },
    ]);
  };

  // Utility
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getProgressPercentage = () => {
    if (dailyGoal === 0) return 0;
    return Math.min(100, Math.round((count / dailyGoal) * 100));
  };

  // ---------- UI -------------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.symbolCircle}>
            <Text style={styles.om}>ॐ</Text>
          </View>
          <View>
            <Text style={styles.title}>Scripture Scroll</Text>
            <Text style={styles.subtitle}>Mindful counter — sacred practice</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.chapter}>
          <View style={styles.chapterHeader}>
            <View style={styles.rule} />
            <Text style={styles.chapterTitle}>Daily Count</Text>
            <View style={styles.rule} />
          </View>

          <Text style={styles.chapterNote}>Tap the scroll area to add a mindful count — each tap is an offering.</Text>

          <TouchableOpacity activeOpacity={0.85} onPress={increment} style={styles.scrollCounter}>
            <Text style={styles.countText}>{count}</Text>
            <Text style={styles.tapHint}>Tap to count • Offer a breath</Text>
          </TouchableOpacity>

          {dailyGoal > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {count} / {dailyGoal} — {getProgressPercentage()}%
              </Text>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity onPress={decrement} style={[styles.controlBtn, styles.controlCircle]}>
              <Text style={styles.controlText}>−</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToday} style={[styles.controlBtn, styles.resetBtn]}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={increment} style={[styles.controlBtn, styles.controlCircleAccent]}>
              <Text style={[styles.controlText, styles.plusText]}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => setShowGoalModal(true)}
              style={[styles.actionBtn, styles.actionBtnPrimary]}
            >
              <Text style={styles.actionBtnText}>Set Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                commitDayHistory();
                setShowHistoryModal(true);
              }}
              style={[styles.actionBtn, styles.actionBtnSecondary]}
            >
              <Text style={styles.actionBtnText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with calm • Scripture Scroll</Text>
      </View>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide" onRequestClose={() => setShowGoalModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <Text style={styles.modalSub}>Add today’s count of your divine practice.</Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="e.g. 108"
              keyboardType="numeric"
              placeholderTextColor="#9b8569"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowGoalModal(false);
                  setGoalInput("");
                }}
                style={[styles.modalBtn, styles.modalCancel]}
              >
                <Text style={styles.modalBtnTextNeutral}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSetGoal} style={[styles.modalBtn, styles.modalSave]}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Daily History</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={clearAllHistory} style={{ marginRight: 12 }}>
                  <Text style={[styles.modalBtnTextNeutral, { fontSize: 13 }]}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <Text style={[styles.modalBtnTextNeutral, { fontSize: 13 }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ marginTop: 12 }}>
              {history.length === 0 ? (
                <Text style={styles.emptyHistory}>No history yet — begin your practice.</Text>
              ) : (
                history.map((h, idx) => (
                  <View key={h.date} style={styles.historyItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>{formatDate(h.date)}</Text>
                      <Text style={styles.historyMeta}>
                        Count: {h.count}
                        {h.goal ? ` • Goal: ${h.goal}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.completedBadge, h.completed ? styles.achieved : styles.notAchieved]}>
                        {h.completed ? "✓ Achieved" : "—"}
                      </Text>

                      <TouchableOpacity onPress={() => deleteHistoryItem(h.date)} style={{ marginTop: 8 }}>
                        <Text style={{ color: "#7A5533", fontSize: 13 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === "ios" ? "#FAF5E8" : "#FBF7F1",
  },
  header: {
    paddingTop: 28,
    paddingBottom: 18,
    backgroundColor: "#E29F36",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 16,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  symbolCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0E2C9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  om: {
    fontSize: 24,
    color: "#7A5533",
    fontWeight: "700",
  },
  title: {
    fontSize: 20,
    color: "#FFFDF7",
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    color: "#FFF5DE",
    marginTop: 2,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },

  chapter: {
    backgroundColor: "#FFF9F0",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EFE2C4",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 2,
  },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  rule: {
    height: 2,
    width: 40,
    backgroundColor: "#E7D3A8",
    marginHorizontal: 10,
    borderRadius: 1,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6B4426",
  },
  chapterNote: {
    color: "#8A6A4F",
    marginBottom: 12,
  },

  scrollCounter: {
    marginTop: 6,
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    paddingVertical: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFE2C4",
    backgroundColor: "#FFF9F0",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 64,
    color: "#6B4426",
    fontWeight: "200",
  },
  tapHint: {
    marginTop: 6,
    color: "#8A6A4F",
  },

  progressWrap: {
    marginTop: 12,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    maxWidth: 420,
    height: 12,
    backgroundColor: "#EFE6CF",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E29F36",
  },
  progressText: {
    marginTop: 6,
    color: "#7A4F2B",
    fontWeight: "600",
  },

  controls: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#E6D8BE",
  },
  controlCircleAccent: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E29F36",
    alignItems: "center",
    justifyContent: "center",
  },
  controlText: {
    fontSize: 36,
    color: "#6B4426",
    fontWeight: "700",
  },
  plusText: {
    color: "#FFF",
    fontWeight: "800",
  },
  resetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F3E8D0",
    borderWidth: 1,
    borderColor: "#E2D2B6",
  },
  resetText: {
    color: "#6B4426",
    fontWeight: "700",
    fontSize: 16,
  },

  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E7D3A8",
    backgroundColor: "#FFF9F0",
  },
  actionBtnPrimary: {
    backgroundColor: "#fff9f0",
  },
  actionBtnSecondary: {
    backgroundColor: "#fff9f0",
  },
  actionBtnText: {
    color: "#6B4426",
    fontWeight: "700",
  },

  footer: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0E6D1",
    backgroundColor: "#FBF7F1",
  },
  footerText: {
    color: "#8A6A4F",
    fontSize: 12,
  },

  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFF9F0",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFE2C4",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    color: "#6B4426",
    fontWeight: "800",
  },
  modalSub: {
    color: "#8A6A4F",
    marginTop: 4,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1.4,
    borderBottomColor: "#E6D8BE",
    paddingVertical: 8,
    fontSize: 16,
    color: "#6B4426",
    marginTop: 8,
  },
  modalActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalCancel: {
    backgroundColor: "#F2E7D1",
  },
  modalSave: {
    backgroundColor: "#E29F36",
  },
  modalBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
  modalBtnTextNeutral: {
    color: "#6B4426",
    fontWeight: "700",
  },

  // history
  emptyHistory: {
    color: "#8A6A4F",
    paddingVertical: 18,
    textAlign: "center",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFAF0",
    borderWidth: 1,
    borderColor: "#EFE6CF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  historyDate: {
    color: "#6B4426",
    fontWeight: "700",
  },
  historyMeta: {
    color: "#8A6A4F",
    marginTop: 4,
  },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: "700",
    color: "#FFF",
    overflow: "hidden",
  },
  achieved: {
    backgroundColor: "#E29F36",
  },
  notAchieved: {
    backgroundColor: "#C8BCA8",
  },
});
