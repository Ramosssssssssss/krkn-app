import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    flex: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerFolio: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  headerProveedor: {
    fontSize: 13,
    marginTop: 2,
  },
  // Contenedor de botones del header
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Botón de cámara en el header
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  // Botón de cajas en el header
  cajasBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  // Botón +1 para agregar órdenes adicionales
  addOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 2,
    position: "relative" as const,
  },
  addOrderBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  ordersBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: "#fff",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  ordersBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800" as const,
  },
  // Estilos de escaneo
  hiddenScanInput: {
    position: "absolute",
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  scanFeedbackFloating: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  scanFeedbackFloatingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  bulkOptimizingIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    alignSelf: "flex-start" as const,
    marginTop: 4,
  },
  bulkOptimizingText: {
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    opacity: 0.9,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  // Estilos para secciones de órdenes combinadas
  sectionHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    gap: 8,
  },
  sectionHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  sectionBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
  },
  sectionBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  // Botón de recibir orden individual en sección
  sectionRecibirBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sectionRecibirBtnDisabled: {
    opacity: 0.6,
  },
  sectionRecibirBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchBtn: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  truckIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  providerInfo: {
    flex: 1,
    gap: 2,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  deliveryInfo: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  // Estilos de detalle
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  caratulaCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
  },
  caratulaRow: {
    flexDirection: "row",
  },
  caratulaItem: {
    flex: 1,
  },
  caratulaLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  caratulaValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  articleCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  articleRow: {
    flexDirection: "row",
    gap: 12,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  articleImage: {
    width: "100%",
    height: "100%",
  },
  articleInfo: {
    flex: 1,
    justifyContent: "center",
  },
  articleClave: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  articleDesc: {
    fontSize: 13,
    lineHeight: 17,
  },
  articleBarcode: {
    fontSize: 10,
    marginTop: 4,
  },
  cantidadContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  cantidadLabel: {
    fontSize: 10,
  },
  cantidadValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  unidadLabel: {
    fontSize: 10,
  },
  innerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  innerLabel: {
    fontSize: 11,
  },
  innerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  innerText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Estilos de swipe actions
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  swipeAction: {
    width: 70,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  swipeBtnQuantity: {
    backgroundColor: "#3B82F6",
  },
  swipeBtnIncidencia: {
    backgroundColor: "#EF4444",
  },
  swipeBtnDevolucion: {
    backgroundColor: "#F59E0B",
  },
  swipeBtnBackorder: {
    backgroundColor: "#3B82F6",
  },
  swipeBtnDetails: {
    backgroundColor: "#6366F1",
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  // Quantity controls
  quantitySection: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  expectedLabel: {
    fontSize: 9,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyDisplay: {
    minWidth: 30,
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
  },
  unitLabel: {
    fontSize: 9,
  },
  // Inner badges mini (en la tarjeta)
  innerBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  innerBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  innerBadgeMiniText: {
    fontSize: 9,
    fontWeight: "600",
  },
  innerBadgeMore: {
    fontSize: 9,
  },
  // Modal de cantidad
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  modalExpected: {
    fontSize: 12,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInput: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveBtn: {},
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Progress bar
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  // Detail modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  detailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailModalBody: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  detailSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  empaquesList: {
    gap: 8,
  },
  empaqueBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  empaqueCode: {
    fontSize: 13,
    fontWeight: "700",
  },
  empaqueQty: {
    fontSize: 12,
    marginLeft: "auto",
  },
  // Estilos para zoom de imagen
  zoomIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    padding: 2,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "60%",
  },
  imageModalInfo: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  imageModalClave: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  imageModalDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  closeImageBtn: {
    position: "absolute",
    top: 60,
    right: 20,
  },
  // Estilos del modal de imagen estilo EditProductModal
  photoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoContainer: {
    borderRadius: 24,
    overflow: "hidden",
    width: "100%",
    position: "relative",
  },
  photoFull: {
    width: "100%",
    height: 400,
    backgroundColor: "#fff",
  },
  photoInfoBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  photoInfo: {
    padding: 24,
    alignItems: "center",
  },
  skuBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoSku: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  photoName: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },
  photoBarcode: {
    fontSize: 12,
    marginTop: 8,
  },
  photoCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  maxHint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  // Indicador de incidencia
  incidenciaIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    padding: 4,
    zIndex: 10,
  },
  incidenciaArticulo: {
    fontSize: 13,
    marginBottom: 16,
  },
  incidenciasList: {
    gap: 10,
  },
  incidenciaOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  incidenciaLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  recibirButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recibirButtonDisabled: {
    backgroundColor: "#6EE7B7",
    opacity: 0.7,
  },
  recibirButtonConIncidencias: {
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
  },
  recibirButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  devolucionHint: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  // Estilos para modal de confirmación
  confirmModalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmModalFolio: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  confirmModalInfo: {
    gap: 12,
    marginBottom: 20,
  },
  confirmModalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  confirmModalInfoText: {
    fontSize: 14,
    flex: 1,
  },
  // Boton flotante de camara
  fabCamera: {
    position: "absolute" as const,
    bottom: 100,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 10,
  },
  // Monitor de Urgencias Banner
  urgenciaBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B", // Ámbar para llamar la atención
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    gap: 12,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  urgenciaIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  urgenciaTextContainer: {
    flex: 1,
    gap: 2,
  },
  urgenciaTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  urgenciaDesc: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
  },
  urgenciaClose: {
    padding: 4,
  },
});
