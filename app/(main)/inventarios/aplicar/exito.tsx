import { useThemeColors } from '@/context/theme-context';
import { getAuditData } from '@/services/auditStore';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExitoScreen() {
  const colors = useThemeColors();
  const { folio, fecha } = useLocalSearchParams<{ 
    folio: string; 
    fecha: string;
  }>();

  const [isGenerating, setIsGenerating] = React.useState(false);
  const auditData = getAuditData();

  const handleVolverInicio = () => {
    router.replace('/(main)/inventarios/aplicar');
  };

  const handleCompartirPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const { caratula, detalles, signature } = auditData;
      const items = detalles || [];
      
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; margin: 0; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
              .logo-section { display: flex; align-items: center; gap: 12px; }
              .logo-box { width: 44px; height: 44px; background-color: #7B2CBF; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px; }
              .company-name { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.8px; }
              .folio-section { text-align: right; }
              .folio-label { font-size: 11px; font-weight: 600; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px; }
              .folio-value { font-size: 22px; font-weight: 800; color: #7B2CBF; }
              
              .report-title { font-size: 34px; font-weight: 800; color: #111827; margin-bottom: 6px; letter-spacing: -1px; }
              .report-subtitle { font-size: 14px; color: #6b7280; margin-bottom: 40px; font-weight: 500; }
              
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; background-color: #f9fafb; padding: 30px; border-radius: 16px; }
              .info-item { margin-bottom: 0px; }
              .info-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
              .info-value { font-size: 15px; font-weight: 600; color: #111827; }
              .status-badge { display: inline-block; padding: 6px 14px; border-radius: 99px; background-color: #d1fae5; color: #10b981; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
              
              .table-section { margin-bottom: 60px; }
              .table-header-text { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: separate; border-spacing: 0; }
              th { text-align: left; font-size: 11px; font-weight: 700; color: #9ca3af; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; text-transform: uppercase; }
              td { padding: 18px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
              .sku { font-weight: 800; color: #111827; margin-bottom: 4px; font-size: 15px; }
              .item-name { font-size: 12px; color: #6b7280; font-weight: 500; }
              .qty { font-weight: 700; text-align: center; font-size: 16px; color: #111827; }
              .status-col { font-weight: 700; text-align: right; font-size: 13px; }
              
              .footer-signature { margin-top: 60px; display: flex; flex-direction: column; align-items: center; }
              .signature-wrapper { border-bottom: 2px solid #e5e7eb; width: 300px; display: flex; justify-content: center; margin-bottom: 12px; padding-bottom: 10px; }
              .signature-img { width: 240px; height: 100px; object-fit: contain; }
              .signature-label { font-size: 13px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1px; }
              .audit-id { font-size: 11px; color: #9ca3af; margin-top: 6px; font-family: monospace; }
              
              @page { margin: 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-section">
                <div class="logo-box">K</div>
                <div class="company-name">KRKN WMS</div>
              </div>
              <div class="folio-section">
                <div class="folio-label">FOLIO AUDITORÍA</div>
                <div class="folio-value">#${formatFolio(folio)}</div>
              </div>
            </div>

            <div class="report-title">REPORTE DE AUDITORÍA</div>
            <div class="report-subtitle">Documento Oficial de Control de Inventario</div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Fecha de Auditoría</div>
                <div class="info-value">${fecha || new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Auditor Responsable</div>
                <div class="info-value">${caratula?.USUARIO || 'Usuario del Sistema'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Almacén</div>
                <div class="info-value">${caratula?.ALMACEN || 'Almacén Principal'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Estado</div>
                <div><span class="status-badge">Validado</span></div>
              </div>
            </div>

            <div class="table-section">
              <div class="table-header-text">Detalles del Inventario</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 50%;">SKU / ARTÍCULO</th>
                    <th style="text-align: center;">SISTEMA</th>
                    <th style="text-align: center;">FÍSICO</th>
                    <th style="text-align: right;">DIF</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: any) => {
                    const diff = item.DIFERENCIA;
                    const diffColor = diff === 0 ? '#10b981' : (diff > 0 ? '#3b82f6' : '#ef4444');
                    const diffText = diff > 0 ? `+${diff}` : `${diff}`;
                    return `
                      <tr>
                        <td>
                          <div class="sku">${item.CLAVE_ARTICULO || 'N/A'}</div>
                          <div class="item-name">${item.NOMBRE_ARTICULO}</div>
                        </td>
                        <td class="qty" style="color: #6b7280;">${item.EXISTENCIA_SISTEMA}</td>
                        <td class="qty">${item.UNIDADES_FISICAS}</td>
                        <td class="status-col" style="color: ${diffColor};">${diffText}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="footer-signature">
              <div class="signature-wrapper">
                ${signature ? `<img src="${signature}" class="signature-img" />` : '<div style="height: 100px;"></div>'}
              </div>
              <div class="signature-label">Firma del Responsable</div>
              <div class="audit-id">ID Verificación: ${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'No se pudo generar el reporte PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.successCircle, { backgroundColor: colors.success, shadowColor: colors.success }]}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>¡Inventario Aplicado{'\n'}Exitosamente!</Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Los niveles de stock han sido actualizados correctamente en el sistema WMS.
        </Text>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>RESUMEN DE AUDITORÍA</Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Folio Auditoría</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>#{formatFolio(folio)}</Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Estado</Text>
            <Text style={[styles.summaryValueGreen, { color: colors.success }]}>Aplicado ✓</Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>Fecha</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {fecha || new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.pdfBtn, { backgroundColor: colors.accent }, isGenerating && { opacity: 0.7 }]}
            onPress={handleCompartirPDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.pdfBtnText}>
              {isGenerating ? 'Generando...' : 'Compartir Reporte PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.homeBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleVolverInicio}
          >
            <Text style={[styles.homeBtnText, { color: colors.text }]}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decorative checkmark in corner */}
      <View style={styles.cornerDecoration}>
        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  cornerDecoration: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryKey: {
    fontSize: 15,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryValueGreen: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  actionsContainer: {
    gap: 8,
    marginTop: 'auto',
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  pdfBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  homeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

