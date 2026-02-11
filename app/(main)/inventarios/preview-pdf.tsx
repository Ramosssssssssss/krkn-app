import { generatePDFFromHtml, getPDFHtml, PDFData } from '@/utils/pdf-generator';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function PDFPreviewScreen() {
    const params = useLocalSearchParams<{ data: string }>();
    const [pdfData, setPdfData] = useState<PDFData | null>(null);
    const [html, setHtml] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (params.data) {
            try {
                const parsedData = JSON.parse(params.data as string);
                setPdfData(parsedData);
                setHtml(getPDFHtml(parsedData));
            } catch (e) {
                console.error('Error parsing PDF data:', e);
            }
        }
    }, [params.data]);

    const handleAction = async () => {
        if (!html || !pdfData) return;
        try {
            setIsGenerating(true);
            await generatePDFFromHtml(html, pdfData.folio);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!pdfData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0891B2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={26} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>KRKN WMS</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleAction} style={styles.actionBtn}>
                            <Ionicons name="print-outline" size={24} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleAction} style={styles.actionBtn}>
                            <Ionicons name="share-social-outline" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <View style={styles.previewContainer}>
                <View style={styles.paperShadow}>
                    <View style={styles.paper}>
                        <WebView 
                            originWhitelist={['*']}
                            source={{ html: html }}
                            style={styles.webview}
                            showsVerticalScrollIndicator={false}
                            scalesPageToFit={true}
                            overScrollMode="never"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.footerContainer}>
                <TouchableOpacity 
                    style={[styles.downloadBtn, { backgroundColor: pdfData.accentColor || '#0891B2' }]}
                    onPress={handleAction}
                    disabled={isGenerating}
                    activeOpacity={0.8}
                >
                    {isGenerating ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="download-outline" size={22} color="#FFF" />
                            <Text style={styles.downloadBtnText}>Descargar PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E2E8F0', // Fondo grisáceo para resaltar el "papel"
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSafeArea: {
        backgroundColor: '#FFF',
        ...Platform.select({
            android: {
                paddingTop: StatusBar.currentHeight,
            }
        })
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        backgroundColor: '#FFF',
    },
    backBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '900',
        color: '#1E293B',
        marginLeft: 4,
    },
    headerActions: {
        flexDirection: 'row',
        marginRight: 8,
    },
    actionBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    paperShadow: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 4,
        // Sombra más pronunciada para efecto papel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    paper: {
        flex: 1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    footerContainer: {
        backgroundColor: '#FFF',
        padding: 20,
        paddingTop: 16,
        paddingBottom: 60, // Aumentado para evadir barra de navegación
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    downloadBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
    },
});
