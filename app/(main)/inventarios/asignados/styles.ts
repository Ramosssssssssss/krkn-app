import { Platform, StyleSheet } from "react-native";

// ─── Styles ──────────────────────────────────────────────────────────────────
export const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 13, marginTop: 1 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },

  // Filters
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  tipoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tipoText: { fontSize: 11, fontWeight: "500" },

  cardBody: { paddingHorizontal: 14, paddingBottom: 10, gap: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 13, flex: 1 },

  ubicChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  ubicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ubicChipText: { fontSize: 11, fontWeight: "500" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
  },
  actionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  // Empty
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // ─── Wizard (Apple iOS Style) ────
  wizContainer: { flex: 1 },

  // iOS Nav Bar
  iosNavBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 58 : 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iosNavBtn: { minWidth: 70 },
  iosNavBtnText: { fontSize: 17, fontWeight: "400" },
  iosNavCenter: { flex: 1, alignItems: "center" },
  iosNavTitle: { fontSize: 17, fontWeight: "600", letterSpacing: -0.3 },
  iosNavSubtitle: { fontSize: 11, marginTop: 1 },

  // iOS Progress Dots
  iosDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  iosDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // iOS Footer
  iosFooter: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iosMainBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iosMainBtnText: { fontSize: 17, fontWeight: "600" },

  wizContent: { padding: 20 },
  wizStepTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  wizStepSub: { fontSize: 15, marginBottom: 20, lineHeight: 20 },

  wizList: { maxHeight: 400 },
  wizOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  wizAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  wizOptionTitle: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  wizOptionSub: { fontSize: 13, marginTop: 1 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0,
    gap: 8,
    marginBottom: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 17, height: 44 },

  // iOS Calendar
  iosCalendarCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 4,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  calMonthLabel: { fontSize: 17, fontWeight: "600", letterSpacing: -0.3 },
  calWeekRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  calWeekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  calWeekText: { fontSize: 11, fontWeight: "600" },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  calDayCell: {
    width: "14.28%" as any,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  calDayInner: {
    width: 36,
    height: 36,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  calDaySelected: {
    backgroundColor: "#3B82F6",
    borderRadius: 999,
  },
  calDayText: { fontSize: 16, fontWeight: "400" },
  calTodayDot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
  },
  calSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  calSelectedText: {
    fontSize: 15,
    fontWeight: "500",
    textTransform: "capitalize",
  },

  // iOS Grouped card
  iosGroupedCard: {
    borderRadius: 14,
    padding: 14,
  },
  iosGroupedLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  iosGroupedInput: {
    fontSize: 17,
    fontWeight: "400",
    minHeight: 60,
    textAlignVertical: "top",
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  tipoGroupCard: {
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  tipoOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    gap: 12,
  },
  tipoOptionActive: {},
  tipoOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  tipoOptionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  tipoOptionDesc: { fontSize: 13, marginTop: 1 },
  tipoSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  tipoRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  tipoRadioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Ubicaciones
  resultsBox: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: { flex: 1, fontSize: 14, fontWeight: "600" },
  resultCount: { fontSize: 12 },

  selectedUbic: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  selectedUbicText: { flex: 1, fontSize: 14, fontWeight: "600" },
  selectedUbicCount: { fontSize: 12 },

  // Confirm
  confirmCard: {
    borderRadius: 16,
    borderWidth: 0,
    padding: 4,
    marginTop: 8,
    overflow: "hidden" as const,
  },
  confirmRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    padding: 14,
    gap: 12,
  },
  confirmLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: "500" as const,
    marginTop: 1,
    letterSpacing: -0.2,
  },
});
