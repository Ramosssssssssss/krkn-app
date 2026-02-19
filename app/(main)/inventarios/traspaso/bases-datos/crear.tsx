import ArticleCard from "@/components/inventarios/ArticleCard";
import ProductDetailModal from "@/components/inventarios/ProductDetailModal";
import ProductSearchBar from "@/components/inventarios/ProductSearchBar";
import SuccessModal from "@/components/inventarios/SuccessModal";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { Database } from "@/services/api";
import {
    crearEntradaInventario,
    crearSalidaInventario,
} from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CrearTraspasoBD() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const { databases, user, selectedDatabase: currentDB } = useAuth();

    // -- ESTADOS DE SELECCIÓN --
    const [sourceDB, setSourceDB] = useState<Database | null>(currentDB);
    const [targetDB, setTargetDB] = useState<Database | null>(null);

    const [showDBModal, setShowDBModal] = useState<{ visible: boolean; type: "source" | "target" }>({
        visible: false,
        type: "source",
    });

    // Hooks de sucursales para cada base de datos
    const sourceLocs = useSucursalesAlmacenes(sourceDB?.id);
    const targetLocs = useSucursalesAlmacenes(targetDB?.id);

    const [showLocModal, setShowLocModal] = useState<{ visible: boolean; type: "source" | "target" }>({
        visible: false,
        type: "source",
    });

    // -- SCANNER --
    const scanner = useArticleScanner({
        // Forzamos búsqueda en la base de datos origen
        customSearchUrl: (query) => 
            `https://app.krkn.mx/api/articulos.php?busqueda=${encodeURIComponent(query)}&databaseId=${sourceDB?.id || currentDB?.id}`
    });

    // -- UI STATE --
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [resultData, setResultData] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedArt, setSelectedArt] = useState<any>(null);

    const handleSave = async () => {
        if (!sourceLocs.selectedAlmacen || !targetLocs.selectedAlmacen) {
            Alert.alert("Error", "Debes seleccionar origen y destino completo");
            return;
        }
        if (scanner.detalles.length === 0) {
            Alert.alert("Error", "No hay artículos para traspasar");
            return;
        }

        setIsSubmitting(true);
        try {
            const userName = user?.NOMBRE || user?.USERNAME || "AppUser";
            const desc = `TRASP DB ${sourceDB?.nombre} -> ${targetDB?.nombre}`;
            const detallesPayload = scanner.detalles.map(d => ({
                CLAVE: d.clave,
                CANTIDAD: d.cantidad
            }));

            // 1. SALIDA EN ORIGEN
            const resSalida = await crearSalidaInventario({
                databaseId: sourceDB?.id,
                P_SUCURSAL_ID: sourceLocs.selectedSucursal!,
                P_ALMACEN_ID: sourceLocs.selectedAlmacen!,
                P_DESCRIPCION: desc,
                P_USUARIO: userName,
                detalles: detallesPayload
            } as any);

            if (!resSalida.ok) throw new Error(`Error en Salida (${sourceDB?.nombre}): ${resSalida.message}`);

            // 2. ENTRADA EN DESTINO
            const resEntrada = await crearEntradaInventario({
                databaseId: targetDB?.id,
                P_SUCURSAL_ID: targetLocs.selectedSucursal!,
                P_ALMACEN_ID: targetLocs.selectedAlmacen!,
                P_DESCRIPCION: desc,
                P_USUARIO: userName,
                detalles: detallesPayload
            } as any);

            if (!resEntrada.ok) {
                Alert.alert("Atención", `Salida exitosa (${resSalida.folio}), pero falló la Entrada: ${resEntrada.message}. Deberá hacerse manual.`);
            }

            setResultData({
                folioSalida: resSalida.folio,
                folioEntrada: resEntrada.folio,
                items: scanner.detalles.length
            });
            setShowSuccess(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderLocationPicker = (type: "source" | "target") => {
        const db = type === "source" ? sourceDB : targetDB;
        const locs = type === "source" ? sourceLocs : targetLocs;
        const name = type === "source" ? "ORIGEN" : "DESTINO";
        const color = type === "source" ? "#EF4444" : "#22C55E";

        const sucursalNombre = locs.sucursales.find(s => s.id === locs.selectedSucursal)?.nombre || "Sel. Sucursal";
        const almacenNombre = locs.almacenes.find(a => a.id === locs.selectedAlmacen)?.nombre || "Sel. Almacén";

        return (
            <View style={styles.locSection}>
                <View style={[styles.sectionHeader, { backgroundColor: color + "10" }]}>
                    <Ionicons name={type === "source" ? "log-out-outline" : "log-in-outline"} size={16} color={color} />
                    <Text style={[styles.sectionTitle, { color }]}>{name}</Text>
                </View>
                
                <View style={styles.pickersContainer}>
                    <TouchableOpacity 
                        style={[styles.pickerBtn, { borderBottomColor: colors.border }]}
                        onPress={() => setShowDBModal({ visible: true, type })}
                    >
                        <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Empresa / DB</Text>
                        <Text style={[styles.pickerValue, { color: colors.text }]}>{db?.nombre || "Seleccionar..."}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.pickerBtn}
                        onPress={() => setShowLocModal({ visible: true, type })}
                    >
                        <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Sucursal & Almacén</Text>
                        <Text style={[styles.pickerValue, { color: colors.text }]} numberOfLines={1}>
                            {locs.selectedAlmacen ? `${sucursalNombre} - ${almacenNombre}` : "Seleccionar ubicación..."}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerTitle: "Traspaso Cross-DB", headerTitleAlign: 'center' }} />
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
                {renderLocationPicker("source")}
                
                <View style={styles.connector}>
                    <Ionicons name="arrow-down" size={20} color={colors.textTertiary} />
                </View>

                {renderLocationPicker("target")}

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />

                <ProductSearchBar
                    ref={scanner.searchInputRef}
                    value={scanner.searchQuery}
                    onChangeText={scanner.handleSearchChange}
                    onSubmitEditing={scanner.handleSearchSubmit}
                    isSearching={scanner.isSearching}
                    aggressiveScan={scanner.aggressiveScan}
                    color="#8B5CF6"
                />

                <View style={styles.articlesHeader}>
                    <Text style={[styles.articlesTitle, { color: colors.text }]}>Artículos a traspasar ({scanner.detalles.length})</Text>
                </View>

                {scanner.detalles.map((item, index) => (
                    <ArticleCard
                        key={item._key}
                        item={item}
                        index={index}
                        color="#8B5CF6"
                        onUpdateQuantity={scanner.handleUpdateQuantity}
                        onSetQuantity={scanner.handleSetQuantity}
                        onRemove={scanner.handleRemoveArticle}
                        onPress={(it) => { setSelectedArt(it); setShowDetail(true); }}
                    />
                ))}

                {scanner.detalles.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="barcode-outline" size={48} color={colors.border} />
                        <Text style={{ color: colors.textTertiary, marginTop: 12 }}>Escanea artículos para comenzar</Text>
                    </View>
                )}
                
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.surface }]}>
                <TouchableOpacity 
                    style={[styles.btnSubmit, { opacity: (isSubmitting || scanner.detalles.length === 0) ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isSubmitting || scanner.detalles.length === 0}
                >
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name="swap-horizontal" size={24} color="#fff" />
                            <Text style={styles.btnSubmitText}>Ejecutar Traspaso</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* MODAL DB */}
            <Modal visible={showDBModal.visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Base de Datos</Text>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {databases.map(db => (
                                <TouchableOpacity 
                                    key={db.id} 
                                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        if (showDBModal.type === "source") setSourceDB(db);
                                        else setTargetDB(db);
                                        setShowDBModal({ ...showDBModal, visible: false });
                                    }}
                                >
                                    <View>
                                        <Text style={[styles.modalItemText, { color: colors.text }]}>{db.nombre}</Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{db.ubicacion}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setShowDBModal({ ...showDBModal, visible: false })}>
                            <Text style={{ color: colors.accent, fontWeight: '700' }}>CERRAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL SUCURSAL / ALMACEN */}
            <Modal visible={showLocModal.visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface, flex: 0.8 }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Ubicación {showLocModal.type === "source" ? "Origen" : "Destino"}</Text>
                        
                        <ScrollView>
                            <Text style={styles.subLabel}>Sucursal</Text>
                            {(showLocModal.type === "source" ? sourceLocs : targetLocs).sucursales.map(s => (
                                <TouchableOpacity 
                                    key={s.id} 
                                    style={[styles.locItem, { 
                                        borderColor: (showLocModal.type === "source" ? sourceLocs : targetLocs).selectedSucursal === s.id ? colors.accent : colors.border 
                                    }]}
                                    onPress={() => (showLocModal.type === "source" ? sourceLocs : targetLocs).setSelectedSucursal(s.id)}
                                >
                                    <Text style={{ color: colors.text }}>{s.nombre}</Text>
                                </TouchableOpacity>
                            ))}

                            <Text style={[styles.subLabel, { marginTop: 16 }]}>Almacén</Text>
                            {(showLocModal.type === "source" ? sourceLocs : targetLocs).almacenesFiltrados.map(a => (
                                <TouchableOpacity 
                                    key={a.id} 
                                    style={[styles.locItem, { 
                                        borderColor: (showLocModal.type === "source" ? sourceLocs : targetLocs).selectedAlmacen === a.id ? colors.accent : colors.border 
                                    }]}
                                    onPress={() => {
                                        (showLocModal.type === "source" ? sourceLocs : targetLocs).setSelectedAlmacen(a.id);
                                        setShowLocModal({ ...showLocModal, visible: false });
                                    }}
                                >
                                    <Text style={{ color: colors.text }}>{a.nombre}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalClose} onPress={() => setShowLocModal({ ...showLocModal, visible: false })}>
                            <Text style={{ color: colors.accent, fontWeight: '700' }}>CERRAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <SuccessModal
                visible={showSuccess}
                onClose={() => { setShowSuccess(false); router.back(); }}
                title="Traspaso Exitoso"
                subtitle={`Se completó el traspaso de ${resultData?.items} artículos.`}
                folio={resultData?.folioSalida}
                primaryButtonText="Finalizar"
                onPrimaryAction={() => { setShowSuccess(false); router.back(); }}
            />

            <ProductDetailModal
                visible={showDetail}
                articulo={selectedArt}
                onClose={() => setShowDetail(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    locSection: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: '#fff',
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    pickersContainer: {
        padding: 4,
    },
    pickerBtn: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    pickerLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 2,
    },
    pickerValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    connector: {
        alignItems: 'center',
        marginVertical: -8,
        zIndex: 1,
    },
    articlesHeader: {
        marginTop: 8,
        marginBottom: 4,
    },
    articlesTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    btnSubmit: {
        backgroundColor: '#8B5CF6',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    btnSubmitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalClose: {
        marginTop: 16,
        alignItems: 'center',
        padding: 10,
    },
    subLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#999',
        marginBottom: 8,
    },
    locItem: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 8,
    }
});
