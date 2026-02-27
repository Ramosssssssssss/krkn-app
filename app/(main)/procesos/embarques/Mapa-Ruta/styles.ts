import { StyleSheet } from 'react-native';

export const getStyles = (colors: any, insets: any) => StyleSheet.create({
    container: { flex: 1 },

    // --- Header Flotante Premium ---
    header: {
        position: "absolute",
        top: 0, left: 0, right: 0,
        zIndex: 100,
    },
    headerBlur: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(0,0,0,0.1)",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: -0.4,
    },
    headerSub: {
        fontSize: 12,
        fontWeight: "500",
        marginTop: 1,
    },
    headerActions: {
        flexDirection: "row",
        gap: 4,
    },

    // --- Mapa ---
    mapContainer: {
        flex: 1,
    },

    // --- Custom Map Controls (Floating) ---
    mapControls: {
        position: "absolute",
        right: 16,
        bottom: 85,
        gap: 12,
        zIndex: 10,
    },
    mapControlBtn: {
        width: 54,
        height: 54,
        borderRadius: 27,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    controlBlur: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.7)",
    },

    // --- Marcadores ---
    markerWrap: {
        justifyContent: "center",
        alignItems: "center",
        borderColor: "#ffffff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        overflow: "hidden",
    },
    markerNum: {
        color: "#fff",
        fontWeight: "900",
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    markerBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "#FF3B30",
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#fff",
    },

    // --- Marcador CEDIS ---
    cedisMarker: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#1c1c1e",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowRadius: 5,
        shadowOpacity: 0.3,
        elevation: 6,
    },

    // --- Driver Marker (Samsara) ---
    driverMarker: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2.5,
        shadowColor: "#000",
        shadowRadius: 4,
        shadowOpacity: 0.2,
        elevation: 5,
    },
    driverPhoto: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },

    // --- Badges ---
    statsBadge: {
        position: "absolute",
        top: 16,
        right: 16,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
        zIndex: 10,
    },
    statsBlur: {
        padding: 14,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.6)",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statsText: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: -0.2,
    },

    // --- Form Section ---
    formContainer: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -32,
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 20,
    },
    formHandleContainer: {
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },
    formHandle: {
        width: 36, height: 5, borderRadius: 2.5,
    },
    formScroll: { paddingHorizontal: 24, paddingTop: 4 },

    formTitle: {
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: -0.6,
        marginBottom: 24,
        textAlign: 'center'
    },

    formGroup: { marginBottom: 20 },
    formLabel: {
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
        color: "#8E8E93",
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    formInputWrapper: {
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    formInputText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
        padding: 0,
    },
    formInputMulti: {
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },

    // --- Action Buttons ---
    navRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
    navBtn: { flex: 1, borderRadius: 16, overflow: "hidden" },
    navBtnGrad: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14,
    },
    navBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    createBtn: {
        borderRadius: 22,
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    createBtnGrad: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 12, paddingVertical: 20,
    },
    createBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },

    // --- Modal Operators ---
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        maxHeight: "90%",
        paddingTop: 12,
        paddingHorizontal: 24,
    },
    modalHandle: {
        width: 36, height: 5, borderRadius: 2.5,
        backgroundColor: "rgba(0,0,0,0.1)",
        alignSelf: "center", marginBottom: 20,
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: "800",
        letterSpacing: -1,
        marginBottom: 20,
        textAlign: 'center'
    },
    modalSearch: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
    },
    modalSearchInput: { flex: 1, fontSize: 16, fontWeight: "500", padding: 0 },

    operadorItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "transparent",
    },
    operadorSelected: {
        borderColor: "rgba(0,122,255,0.1)",
        backgroundColor: "rgba(0,122,255,0.05)",
    },
    operadorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    operadorInitial: { fontSize: 20, fontWeight: "800" },
    operadorNombre: { fontSize: 17, fontWeight: "700" },
    operadorUser: { fontSize: 13, marginTop: 2, fontWeight: "500" },

    modalCloseBtn: {
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.05)",
        paddingVertical: 18,
        alignItems: "center",
        marginTop: 10,
    },
    modalCloseBtnText: { fontSize: 17, fontWeight: "700", color: "#8E8E93" },

    // --- Driver Detail Modal (Premium) ---
    driverDetailSheet: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingTop: 12,
        paddingHorizontal: 24,
        paddingBottom: 10,
    },
    driverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    avatarStats: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    largeAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    largeInitial: {
        fontSize: 28,
        fontWeight: '800',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#fff',
    },
    driverNameLarge: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    driverSubText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    driverStatsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        padding: 12,
        borderRadius: 18,
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    locationCard: {
        padding: 16,
        borderRadius: 20,
        marginBottom: 24,
        gap: 8,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    locationText: {
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'column',
        gap: 12,
    },
    modalActionBtn: {
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    modalActionBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    modalActionBtnSecondary: {
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalActionBtnTextSecondary: {
        fontSize: 16,
        fontWeight: '600',
    },

    // --- Chips (Stops) ---
    chipsOverlay: {
        position: "absolute",
        bottom: 24, left: 0, right: 0,
    },
    chipsScroll: { paddingHorizontal: 16, gap: 12 },
    miniChip: {
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    miniChipBlur: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.6)",
    },
    miniChipText: { fontSize: 14, fontWeight: "800", letterSpacing: -0.3 },
    pedidoStopNum: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },

    // --- Calendar Picker (iOS Style) ---
    calendarSheet: {
        width: "100%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
    },
    sheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: "rgba(0,0,0,0.1)",
        alignSelf: "center",
        marginTop: 12,
    },
    sheetHeader: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    sheetHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    calendarContainer: {
        paddingHorizontal: 16,
    },
    calHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
    },
    calNavBtn: {
        padding: 8,
    },
    calMonthLabel: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.3,
    },
    calWeekRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    calWeekCell: {
        flex: 1,
        alignItems: "center",
    },
    calWeekText: {
        fontSize: 13,
        fontWeight: "600",
    },
    calGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    calDayCell: {
        width: "14.28%",
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    calDayInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: 'transparent',
    },
    calDayText: {
        fontSize: 17,
        fontWeight: "500",
    },
    calTodayDot: {
        position: "absolute",
        bottom: 4,
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    calSelectedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    calSelectedText: {
        fontSize: 16,
        fontWeight: "600",
        textTransform: "capitalize",
        flex: 1,
    },
});
