/**
 * Pantalla de selección y procesamiento de XML
 * Maneja la carga del archivo y el procesamiento según proveedor
 */

import { useAuth } from '@/context/auth-context'
import { useThemeColors } from '@/context/theme-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

// Tipos
import type { DatosComprobante, ProductoXML, ProveedorXML, XMLMeta } from '../types/xml'

// Parser
import { parseXML } from '../utils/xml-parser'

// Proveedores
import {
    generarMetaCachorro,
    generarMetaMundo,
    generarMetaPanam,
    procesarConceptosCachorro,
    procesarConceptosMundo,
    procesarConceptosPanam,
    validarProductosPanam,
} from '../providers'

const RECEPCION_COLOR = '#1565C0'

const NOMBRES_PROVEEDOR: Record<ProveedorXML, string> = {
  panam: 'GRUPO PANAM',
  cachorro: 'EL CACHORRO',
  mundo: 'MUNDO',
}

export default function SelectorXMLScreen() {
  const colors = useThemeColors()
  const { getBaseURL } = useAuth()
  const params = useLocalSearchParams<{ proveedor: ProveedorXML }>()
  const proveedor = params.proveedor || 'panam'
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null)
  const [datosComprobante, setDatosComprobante] = useState<DatosComprobante | null>(null)
  const [productosPreview, setProductosPreview] = useState<ProductoXML[]>([])
  const [meta, setMeta] = useState<XMLMeta | null>(null)

  const baseURL = getBaseURL().trim().replace(/\/+$/, '')

  /**
   * Selecciona un archivo XML
   */
  const seleccionarArchivo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.[0]) {
        return
      }

      const archivo = result.assets[0]
      setArchivoNombre(archivo.name)
      setIsLoading(true)
      setLoadingMessage('Leyendo archivo...')

      // Leer contenido del archivo
      const contenido = await FileSystem.readAsStringAsync(archivo.uri)

      // Parsear XML
      setLoadingMessage('Parseando XML...')
      const parseResult = parseXML(contenido)

      if (!parseResult.ok || !parseResult.comprobante || !parseResult.conceptos) {
        Alert.alert('Error', parseResult.error || 'No se pudo leer el XML')
        setIsLoading(false)
        return
      }

      setDatosComprobante(parseResult.comprobante)

      // Procesar según proveedor
      let productos: ProductoXML[] = []
      let xmlMeta: XMLMeta

      if (proveedor === 'cachorro') {
        setLoadingMessage('Procesando productos (Cachorro)...')
        productos = procesarConceptosCachorro(parseResult.conceptos)
        xmlMeta = generarMetaCachorro(parseResult.comprobante, productos)
      } else if (proveedor === 'panam') {
        setLoadingMessage('Procesando productos (PANAM)...')
        productos = procesarConceptosPanam(parseResult.conceptos)
        
        // Validar en BD
        if (baseURL) {
          setLoadingMessage('Validando códigos en BD...')
          const validacion = await validarProductosPanam(baseURL, productos)
          productos = validacion.productos
          xmlMeta = generarMetaPanam(
            parseResult.comprobante,
            productos,
            validacion.codigosNoEncontrados
          )
          
          // Alertar si hay códigos no encontrados
          if (validacion.codigosNoEncontrados.length > 0) {
            const lista = validacion.codigosNoEncontrados.slice(0, 5).join('\n')
            const mas = validacion.codigosNoEncontrados.length > 5 
              ? `\n... y ${validacion.codigosNoEncontrados.length - 5} más`
              : ''
            Alert.alert(
              '⚠️ Códigos no encontrados',
              `Los siguientes códigos NO existen en la BD:\n\n${lista}${mas}\n\nEstos productos NO se podrán recibir.`,
              [{ text: 'Entendido' }]
            )
          }
        } else {
          xmlMeta = generarMetaPanam(parseResult.comprobante, productos, [])
        }
      } else {
        setLoadingMessage('Procesando productos (Mundo)...')
        productos = procesarConceptosMundo(parseResult.conceptos)
        xmlMeta = generarMetaMundo(parseResult.comprobante, productos)
      }

      setProductosPreview(productos)
      setMeta(xmlMeta)
      setIsLoading(false)
    } catch (error) {
      console.error('Error seleccionando archivo:', error)
      Alert.alert('Error', 'No se pudo leer el archivo')
      setIsLoading(false)
    }
  }, [proveedor, baseURL])

  /**
   * Continuar a la pantalla de escaneo
   */
  const handleContinuar = useCallback(async () => {
    if (!productosPreview.length || !meta) {
      Alert.alert('Error', 'No hay productos para procesar')
      return
    }

    try {
      // Guardar datos en AsyncStorage para la siguiente pantalla
      const navData = {
        productos: productosPreview,
        meta,
        folio: meta.folio,
      }
      
      await AsyncStorage.setItem('xml_nav_data', JSON.stringify(navData))
      
      // Navegar a pantalla de escaneo
      router.push({
        pathname: '/(main)/inventarios/recepcion/xml/procesar' as any,
        params: { proveedor },
      })
    } catch (error) {
      console.error('Error guardando datos:', error)
      Alert.alert('Error', 'No se pudieron guardar los datos')
    }
  }, [productosPreview, meta, proveedor])

  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Importar XML</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {NOMBRES_PROVEEDOR[proveedor]}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Botón de seleccionar archivo */}
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={seleccionarArchivo}
          disabled={isLoading}
        >
          <View style={[styles.selectIconWrapper, { backgroundColor: `${RECEPCION_COLOR}15` }]}>
            <Ionicons name="document-outline" size={32} color={RECEPCION_COLOR} />
          </View>
          <Text style={[styles.selectText, { color: colors.text }]}>
            {archivoNombre || 'Seleccionar archivo XML'}
          </Text>
          <Text style={[styles.selectHint, { color: colors.textSecondary }]}>
            Toca para buscar en tu dispositivo
          </Text>
        </TouchableOpacity>

        {/* Loading */}
        {isLoading && (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={RECEPCION_COLOR} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {loadingMessage}
            </Text>
          </View>
        )}

        {/* Preview de datos */}
        {!isLoading && datosComprobante && (
          <>
            {/* Info del comprobante */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="receipt-outline" size={20} color={RECEPCION_COLOR} />
                <Text style={[styles.infoTitle, { color: colors.text }]}>Datos del Comprobante</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Folio:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {datosComprobante.serie}-{datosComprobante.folio}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Emisor:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {datosComprobante.emisor}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total:</Text>
                <Text style={[styles.infoValue, { color: RECEPCION_COLOR, fontWeight: '600' }]}>
                  {currency.format(datosComprobante.total)}
                </Text>
              </View>
            </View>

            {/* Resumen de productos */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="cube-outline" size={20} color={RECEPCION_COLOR} />
                <Text style={[styles.infoTitle, { color: colors.text }]}>Productos</Text>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {meta?.totalProductos || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Líneas</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {meta?.totalPiezas || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Piezas</Text>
                </View>
                {meta?.codigosNoEncontrados && meta.codigosNoEncontrados.length > 0 && (
                  <>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: '#F44336' }]}>
                        {meta.codigosNoEncontrados.length}
                      </Text>
                      <Text style={[styles.statLabel, { color: '#F44336' }]}>No encontrados</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Preview de primeros 5 productos */}
              <View style={[styles.previewList, { borderTopColor: colors.border }]}>
                <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
                  Vista previa:
                </Text>
                {productosPreview.slice(0, 5).map((producto, idx) => (
                  <View key={idx} style={[styles.previewItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.previewCode, { color: colors.text }]}>{producto.CLAVE}</Text>
                    <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {producto.DESCRIPCION}
                    </Text>
                    <Text style={[styles.previewQty, { color: RECEPCION_COLOR }]}>
                      x{producto.CANTIDAD}
                    </Text>
                  </View>
                ))}
                {productosPreview.length > 5 && (
                  <Text style={[styles.previewMore, { color: colors.textSecondary }]}>
                    ... y {productosPreview.length - 5} más
                  </Text>
                )}
              </View>
            </View>

            {/* Botón continuar */}
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: RECEPCION_COLOR }]}
              onPress={handleContinuar}
            >
              <Text style={styles.continueText}>Continuar a Escaneo</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 16 },
  
  selectButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  selectIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { fontSize: 16, fontWeight: '500' },
  selectHint: { fontSize: 13 },
  
  loadingCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoTitle: { fontSize: 15, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  
  previewList: { borderTopWidth: 1, padding: 12 },
  previewTitle: { fontSize: 12, marginBottom: 8 },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  previewCode: { fontSize: 13, fontWeight: '500', width: 80 },
  previewDesc: { fontSize: 12, flex: 1 },
  previewQty: { fontSize: 13, fontWeight: '600' },
  previewMore: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
