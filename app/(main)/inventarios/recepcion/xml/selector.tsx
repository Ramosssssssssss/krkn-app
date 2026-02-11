/**
 * Pantalla de selección y procesamiento de XML
 * Maneja la carga del archivo y el procesamiento según proveedor
 */

import { useAuth } from '@/context/auth-context'
import { useThemeColors } from '@/context/theme-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  validarProductosCachorro,
  validarProductosPanam,
} from '../providers'

// API
import { cargarCodigosAlternosBatch } from '../utils/api'

// Modal crear artículo
import CrearArticuloModal from '../components/CrearArticuloModal'
// Modal asignar código alterno (Cachorro)
import AsignarCodigoAlternoModal from '../components/AsignarCodigoAlternoModal'

const NOMBRES_PROVEEDOR: Record<ProveedorXML, string> = {
  panam: 'GRUPO PANAM',
  cachorro: 'EL CACHORRO',
  mundo: 'MUNDO',
}

export default function SelectorXMLScreen() {
  const colors = useThemeColors()
  const { getBaseURL } = useAuth()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ proveedor: ProveedorXML }>()
  const proveedor = params.proveedor || 'panam'
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null)
  const [datosComprobante, setDatosComprobante] = useState<DatosComprobante | null>(null)
  const [productosPreview, setProductosPreview] = useState<ProductoXML[]>([])
  const [meta, setMeta] = useState<XMLMeta | null>(null)
  
  // Estado para crear artículo (PANAM)
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [productoParaCrear, setProductoParaCrear] = useState<ProductoXML | null>(null)
  
  // Estado para asignar código alterno (CACHORRO)
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [codigoParaAsignar, setCodigoParaAsignar] = useState<string | null>(null)
  
  // Modal para ver todos los códigos no encontrados
  const [showAllCodesModal, setShowAllCodesModal] = useState(false)

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
        
        // Obtener códigos originales del XML para validar
        const codigosOriginales = [...new Set(productos.flatMap(p => p._codigosLargos || [p.CLAVE_ORIGINAL]))]
        
        // Validar en BD
        setLoadingMessage('Validando códigos alternos...')
        const codigosResult = await cargarCodigosAlternosBatch(baseURL, codigosOriginales)
        
        // Validar productos
        const validacion = validarProductosCachorro(productos, codigosResult)
        productos = validacion.productos
        
        xmlMeta = generarMetaCachorro(parseResult.comprobante, productos)
        xmlMeta.codigosNoEncontrados = validacion.codigosNoEncontrados
        
        // Alertar si hay códigos no encontrados
        if (validacion.codigosNoEncontrados.length > 0) {
          const lista = validacion.codigosNoEncontrados.slice(0, 5).join('\n')
          const mas = validacion.codigosNoEncontrados.length > 5 
            ? `\n... y ${validacion.codigosNoEncontrados.length - 5} más`
            : ''
          Alert.alert(
            '⚠️ Códigos sin alternos',
            `Los siguientes códigos NO tienen registro en CODIGO_ALTERNO:\n\n${lista}${mas}\n\nEstos productos NO se podrán escanear correctamente.`,
            [{ text: 'Entendido' }]
          )
        }
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
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Importar XML</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {NOMBRES_PROVEEDOR[proveedor]}
          </Text>
        </View>
        {datosComprobante ? (
          <TouchableOpacity onPress={seleccionarArchivo} style={styles.headerRightBtn}>
            <Text style={[styles.headerRightBtnText, { color: colors.accent }]}>Cambiar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 24 }]}>
        {/* Botón de seleccionar archivo - solo si no hay datos */}
        {!datosComprobante && !isLoading && (
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={seleccionarArchivo}
            disabled={isLoading}
          >
            <View style={[styles.selectIconWrapper, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="document-outline" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.selectText, { color: colors.text }]}>
              Seleccionar archivo XML
            </Text>
            <Text style={[styles.selectHint, { color: colors.textSecondary }]}>
              Toca para buscar en tu dispositivo
            </Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.accent} />
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
                <Ionicons name="receipt-outline" size={20} color={colors.accent} />
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
                <Text style={[styles.infoValue, { color: colors.accent, fontWeight: '600' }]}>
                  {currency.format(datosComprobante.total)}
                </Text>
              </View>
            </View>

            {/* Resumen de productos */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="cube-outline" size={20} color={colors.accent} />
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
                    <Text style={[styles.previewQty, { color: colors.accent }]}>
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

            {/* Sección de códigos NO encontrados */}
            {meta?.codigosNoEncontrados && meta.codigosNoEncontrados.length > 0 && (
              <View style={[styles.notFoundCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <View style={styles.notFoundHeader}>
                  <View style={[styles.notFoundIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="warning" size={24} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notFoundTitle, { color: '#991B1B' }]}>
                      {proveedor === 'cachorro' ? 'Códigos Sin Alternos' : 'Códigos No Encontrados'}
                    </Text>
                    <Text style={[styles.notFoundSubtitle, { color: '#B91C1C' }]}>
                      {meta.codigosNoEncontrados.length} {proveedor === 'cachorro' ? 'sin registro en CODIGO_ALTERNO' : 'artículo(s) no existen en la BD'}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.notFoundHint, { color: '#7F1D1D' }]}>
                  {proveedor === 'cachorro' 
                    ? 'Toca un código para asignar el alterno:' 
                    : 'Toca un código para crear el artículo:'}
                </Text>
                
                <View style={styles.notFoundList}>
                  {meta.codigosNoEncontrados.slice(0, 3).map((codigo, idx) => {
                    const producto = productosPreview.find(p => 
                      p.CLAVE === codigo || p.CLAVE_ORIGINAL === codigo || p._codigosLargos?.includes(codigo)
                    )
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.notFoundItem, { backgroundColor: '#fff', borderColor: '#FECACA' }]}
                        onPress={() => {
                          if (proveedor === 'cachorro') {
                            // Modal de asignar código alterno
                            setCodigoParaAsignar(codigo)
                            setShowAsignarModal(true)
                          } else if (producto) {
                            // Modal de crear artículo
                            setProductoParaCrear(producto)
                            setShowCrearModal(true)
                          }
                        }}
                      >
                        <View style={styles.notFoundItemInfo}>
                          <Text style={[styles.notFoundCode, { color: '#DC2626' }]}>{codigo}</Text>
                          <Text style={[styles.notFoundDesc, { color: '#7F1D1D' }]} numberOfLines={1}>
                            {producto?.DESCRIPCION || 'Sin descripción'}
                          </Text>
                        </View>
                        <View style={[styles.createBadge, { backgroundColor: proveedor === 'cachorro' ? '#3B82F6' : '#22C55E' }]}>
                          <Ionicons name={proveedor === 'cachorro' ? 'link' : 'add'} size={16} color="#fff" />
                          <Text style={styles.createBadgeText}>{proveedor === 'cachorro' ? 'Asignar' : 'Crear'}</Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                  
                  {/* Botón mostrar todos si hay más de 3 */}
                  {meta.codigosNoEncontrados.length > 3 && (
                    <TouchableOpacity
                      style={[styles.showAllButton, { borderColor: '#DC2626' }]}
                      onPress={() => setShowAllCodesModal(true)}
                    >
                      <Ionicons name="list" size={18} color="#DC2626" />
                      <Text style={styles.showAllButtonText}>
                        Mostrar todos ({meta.codigosNoEncontrados.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Botón continuar */}
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.accent }]}
              onPress={handleContinuar}
            >
              <Text style={styles.continueText}>Continuar a Escaneo</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      
      {/* Modal para ver todos los códigos no encontrados */}
      <Modal
        visible={showAllCodesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllCodesModal(false)}
      >
        <View style={styles.allCodesModalOverlay}>
          <TouchableOpacity 
            style={styles.allCodesModalDismiss} 
            activeOpacity={1}
            onPress={() => setShowAllCodesModal(false)} 
          />
          <View style={[styles.allCodesModalSheet, { backgroundColor: colors.background }]}>
            {/* Handle */}
            <View style={styles.allCodesModalHandle}>
              <View style={[styles.allCodesModalHandleBar, { backgroundColor: colors.border }]} />
            </View>
            
            {/* Header */}
            <View style={[styles.allCodesModalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowAllCodesModal(false)}>
                <Text style={[styles.allCodesModalCancel, { color: colors.accent }]}>Cerrar</Text>
              </TouchableOpacity>
              <Text style={[styles.allCodesModalTitle, { color: colors.text }]}>
                {proveedor === 'cachorro' ? 'Códigos Sin Alternos' : 'Códigos No Encontrados'}
              </Text>
              <View style={{ width: 60 }} />
            </View>
            
            {/* Subtitle */}
            <View style={[styles.allCodesModalSubheader, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="warning" size={18} color="#EF4444" />
              <Text style={styles.allCodesModalSubtitle}>
                {meta?.codigosNoEncontrados?.length || 0} códigos pendientes
              </Text>
            </View>
            
            {/* Lista */}
            <ScrollView 
              style={styles.allCodesModalList}
              contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
            >
              {meta?.codigosNoEncontrados?.map((codigo, idx) => {
                const producto = productosPreview.find(p => 
                  p.CLAVE === codigo || p.CLAVE_ORIGINAL === codigo || p._codigosLargos?.includes(codigo)
                )
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.allCodesModalItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => {
                      setShowAllCodesModal(false)
                      setTimeout(() => {
                        if (proveedor === 'cachorro') {
                          setCodigoParaAsignar(codigo)
                          setShowAsignarModal(true)
                        } else if (producto) {
                          setProductoParaCrear(producto)
                          setShowCrearModal(true)
                        }
                      }, 300)
                    }}
                  >
                    <View style={styles.allCodesModalItemInfo}>
                      <Text style={[styles.allCodesModalCode, { color: '#DC2626' }]}>{codigo}</Text>
                      <Text style={[styles.allCodesModalDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {producto?.DESCRIPCION || 'Sin descripción'}
                      </Text>
                    </View>
                    <View style={[styles.createBadge, { backgroundColor: proveedor === 'cachorro' ? '#3B82F6' : '#22C55E' }]}>
                      <Ionicons name={proveedor === 'cachorro' ? 'link' : 'add'} size={16} color="#fff" />
                      <Text style={styles.createBadgeText}>{proveedor === 'cachorro' ? 'Asignar' : 'Crear'}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Modal para crear artículo (PANAM) */}
      <CrearArticuloModal
        visible={showCrearModal}
        producto={productoParaCrear}
        onClose={() => {
          setShowCrearModal(false)
          setProductoParaCrear(null)
        }}
        onCreated={(codigo: string) => {
          setShowCrearModal(false)
          setProductoParaCrear(null)
          // Actualizar la lista de no encontrados
          if (meta) {
            const nuevosNoEncontrados = meta.codigosNoEncontrados?.filter(c => c !== codigo) || []
            setMeta({ ...meta, codigosNoEncontrados: nuevosNoEncontrados })
            // Marcar el producto como encontrado
            setProductosPreview(prev => prev.map(p => 
              p.CLAVE === codigo ? { ...p, _foundInDB: true } : p
            ))
          }
        }}
      />
      
      {/* Modal para asignar código alterno (CACHORRO) */}
      <AsignarCodigoAlternoModal
        visible={showAsignarModal}
        codigoXml={codigoParaAsignar}
        onClose={() => {
          setShowAsignarModal(false)
          setCodigoParaAsignar(null)
        }}
        onCreated={(codigoXml: string) => {
          setShowAsignarModal(false)
          setCodigoParaAsignar(null)
          // Actualizar la lista de no encontrados
          if (meta) {
            const nuevosNoEncontrados = meta.codigosNoEncontrados?.filter(c => c !== codigoXml) || []
            setMeta({ ...meta, codigosNoEncontrados: nuevosNoEncontrados })
            // Marcar el producto como encontrado
            setProductosPreview(prev => prev.map(p => 
              (p.CLAVE_ORIGINAL === codigoXml || p._codigosLargos?.includes(codigoXml)) 
                ? { ...p, _foundInDB: true } 
                : p
            ))
          }
        }}
      />
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
  headerRightBtn: { minWidth: 60, alignItems: 'flex-end' },
  headerRightBtnText: { fontSize: 16, fontWeight: '500' },
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
  
  // Estilos para códigos no encontrados
  notFoundCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  notFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  notFoundIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  notFoundSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  notFoundHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  notFoundList: {
    gap: 8,
  },
  notFoundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  notFoundItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  notFoundCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  notFoundDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  createBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  createBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  
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
  
  // Botón mostrar todos
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  showAllButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal todos los códigos
  allCodesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  allCodesModalDismiss: {
    height: 80,
  },
  allCodesModalSheet: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  allCodesModalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  allCodesModalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  allCodesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  allCodesModalCancel: {
    fontSize: 16,
    fontWeight: '500',
  },
  allCodesModalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  allCodesModalSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  allCodesModalSubtitle: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  allCodesModalList: {
    flex: 1,
  },
  allCodesModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  allCodesModalItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  allCodesModalCode: {
    fontSize: 15,
    fontWeight: '600',
  },
  allCodesModalDesc: {
    fontSize: 13,
    marginTop: 2,
  },
})
