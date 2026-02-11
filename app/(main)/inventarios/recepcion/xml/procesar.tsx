/**
 * Pantalla de procesamiento/escaneo de XML
 * Muestra los productos del XML y permite escanearlos
 */

import { useAuth } from '@/context/auth-context'
import { useThemeColors } from '@/context/theme-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native'

// Tipos
import type {
  CachorroTallasMap,
  ProductoXML,
  ProveedorXML,
  XMLMeta,
} from '../types/xml'

// Utils
import * as API from '../utils/api'
import { normalizarCodigo } from '../utils/xml-parser'

// Providers
import {
  convertirADetallesMundo,
  convertirADetallesPanam,
  procesarEscaneoCachorro,
  registrarTallaEscaneada
} from '../providers'

const STORAGE_KEY = '@xml_draft'

export default function ProcesarXMLScreen() {
  const colors = useThemeColors()
  const { getBaseURL } = useAuth()
  const params = useLocalSearchParams<{ proveedor: ProveedorXML }>()
  const proveedor = params.proveedor || 'panam'
  
  // Estados principales
  const [productos, setProductos] = useState<ProductoXML[]>([])
  const [meta, setMeta] = useState<XMLMeta | null>(null)
  const [folio, setFolio] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Estados Cachorro
  const [cachorroTallas, setCachorroTallas] = useState<CachorroTallasMap>({})
  const [codigosAlternosMap, setCodigosAlternosMap] = useState<Map<string, string>>(new Map())
  const [codigoLargoToXml, setCodigoLargoToXml] = useState<Map<string, string>>(new Map())
  const [claveMicrosipToXml, setClaveMicrosipToXml] = useState<Map<string, string>>(new Map())
  const [isLoadingAlternos, setIsLoadingAlternos] = useState(false)
  
  // Estados UI
  const [requireScan, setRequireScan] = useState(true)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionMessage, setCompletionMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScannedIndex, setLastScannedIndex] = useState<number | null>(null)
  
  // Timer
  const [timerStarted, setTimerStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  
  // Refs
  const scannerRef = useRef<TextInput>(null)
  const listRef = useRef<FlatList>(null)
  const lastScanTime = useRef<number>(0)
  const isProcessingRef = useRef<boolean>(false)
  const currentInputValue = useRef<string>('')
  const flashAnim = useRef(new Animated.Value(0)).current
  
  const baseURL = getBaseURL().trim().replace(/\/+$/, '')
  const isCachorro = proveedor === 'cachorro'

  // Cargar datos de navegación
  useEffect(() => {
    const loadData = async () => {
      try {
        const navDataStr = await AsyncStorage.getItem('xml_nav_data')
        if (navDataStr) {
          const navData = JSON.parse(navDataStr)
          setProductos(navData.productos || [])
          setMeta(navData.meta || null)
          setFolio(navData.folio || '')
          
          // Limpiar datos de navegación
          await AsyncStorage.removeItem('xml_nav_data')
        }
      } catch (error) {
        console.error('Error cargando datos:', error)
        Alert.alert('Error', 'No se pudieron cargar los datos del XML')
        router.back()
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Cargar códigos alternos para Cachorro
  useEffect(() => {
    if (!isCachorro || !baseURL || productos.length === 0 || isLoadingAlternos) return
    
    const loadCodigosAlternos = async () => {
      setIsLoadingAlternos(true)
      try {
        const codigosOriginales = [...new Set(productos.map(p => p.CLAVE_ORIGINAL))]
        const resultado = await API.cargarCodigosAlternosBatch(baseURL, codigosOriginales)
        
        setCodigosAlternosMap(resultado.codigosMap)
        setCodigoLargoToXml(resultado.largoToXmlMap)
        setClaveMicrosipToXml(resultado.skuToXmlMap)
        
        if (resultado.totalCargados > 0) {
          console.log(`✅ ${resultado.totalCargados} códigos alternos cargados`)
        }
      } catch (error) {
        console.error('Error cargando códigos alternos:', error)
      } finally {
        setIsLoadingAlternos(false)
      }
    }
    
    loadCodigosAlternos()
  }, [isCachorro, baseURL, productos.length])

  // Mapa de búsqueda rápida: clave -> índice
  const claveToIndex = useMemo(() => {
    const map = new Map<string, number>()
    productos.forEach((p, idx) => {
      map.set(p.CLAVE.toUpperCase(), idx)
    })
    return map
  }, [productos])

  // Estadísticas
  const stats = useMemo(() => {
    const totalLineas = productos.length
    const totalRequeridas = productos.reduce((acc, p) => acc + p.CANTIDAD, 0)
    const lineasCompletas = productos.filter(p => {
      const done = requireScan ? p.scanned : p.packed
      return p.CANTIDAD > 0 && done >= p.CANTIDAD
    }).length
    const totalHechas = productos.reduce((acc, p) => acc + (requireScan ? p.scanned : p.packed), 0)
    const progreso = totalRequeridas > 0 ? Math.min(1, totalHechas / totalRequeridas) : 0
    const listo = totalLineas > 0 && lineasCompletas === totalLineas && totalHechas === totalRequeridas
    
    return { totalLineas, totalRequeridas, lineasCompletas, totalHechas, progreso, listo }
  }, [productos, requireScan])

  // Timer
  useEffect(() => {
    if (!timerStarted || !startTime) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [timerStarted, startTime])

  // Iniciar timer al primer escaneo
  useEffect(() => {
    const totalScanned = productos.reduce((sum, p) => sum + p.scanned, 0)
    if (totalScanned > 0 && !timerStarted && productos.length > 0) {
      setTimerStarted(true)
      setStartTime(Date.now())
    }
  }, [productos, timerStarted])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const focusScanner = useCallback(() => {
    requestAnimationFrame(() => scannerRef.current?.focus())
  }, [])

  const flashLine = useCallback((idx: number) => {
    setLastScannedIndex(idx)
    flashAnim.setValue(1)
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => setLastScannedIndex(null))
  }, [flashAnim])

  // Procesar escaneo
  const processScan = useCallback((raw: string) => {
    const code = normalizarCodigo(raw)
    if (!code) return
    
    // Prevenir duplicados
    if (isProcessingRef.current) return
    
    const now = Date.now()
    if (now - lastScanTime.current < 300) return
    
    isProcessingRef.current = true
    lastScanTime.current = now
    
    let searchCode = code
    let claveMicrosip: string | null = null
    
    // Lógica específica Cachorro
    if (isCachorro) {
      const resultado = procesarEscaneoCachorro(
        code,
        codigosAlternosMap,
        codigoLargoToXml,
        claveMicrosipToXml
      )
      
      if (resultado.requiereAsignacion) {
        // TODO: Mostrar modal de asignación
        Vibration.vibrate(100)
        Alert.alert('Código no encontrado', `El código "${code}" no está en el mapa de alternos`)
        setTimeout(() => { isProcessingRef.current = false }, 300)
        return
      }
      
      if (resultado.encontrado) {
        searchCode = resultado.codigoBusqueda
        claveMicrosip = resultado.claveMicrosip
      }
    }
    
    // Buscar en productos
    const idx = claveToIndex.get(searchCode)
    
    if (idx !== undefined) {
      Vibration.vibrate(15)
      
      setProductos(prev => {
        const next = [...prev]
        const item = next[idx]
        const req = item.CANTIDAD
        const pk = item.packed
        const sc = item.scanned
        
        let newPacked = pk < req ? pk + 1 : pk
        let newScanned = sc < req ? sc + 1 : sc
        
        // Incrementar contador de clave Microsip escaneada
        const clavesMicrosip = { ...(item._clavesMicrosipAsignadas || {}) }
        if (claveMicrosip) {
          clavesMicrosip[claveMicrosip] = (clavesMicrosip[claveMicrosip] || 0) + 1
        }
        
        const updated = { 
          ...item, 
          packed: newPacked, 
          scanned: newScanned,
          _clavesMicrosipAsignadas: clavesMicrosip
        }
        
        // Mover al inicio
        next.splice(idx, 1)
        next.unshift(updated)
        
        return next
      })
      
      // Registrar talla para Cachorro
      if (isCachorro && claveMicrosip) {
        setCachorroTallas(prev => registrarTallaEscaneada(prev, searchCode, claveMicrosip!))
      }
      
      setTimeout(() => {
        flashLine(0)
        listRef.current?.scrollToIndex({ index: 0, animated: true })
      }, 50)
    } else {
      Vibration.vibrate(100)
      Alert.alert('No encontrado', `El código "${code}" no existe en este XML`)
    }
    
    setTimeout(() => { isProcessingRef.current = false }, 300)
  }, [isCachorro, codigosAlternosMap, codigoLargoToXml, claveMicrosipToXml, claveToIndex, flashLine])

  // Handle input change (scanner)
  const handleInputChange = useCallback((text: string) => {
    currentInputValue.current = text
    setSearchQuery(text)
    
    // Si tiene más de 3 caracteres y termina en Enter (scanner), procesar
    if (text.length >= 3) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        if (currentInputValue.current.length >= 3) {
          processScan(currentInputValue.current)
          setSearchQuery('')
          currentInputValue.current = ''
        }
      }, 100)
    }
  }, [processScan])

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle submit (Enter)
  const handleSubmit = useCallback(() => {
    const code = currentInputValue.current.trim()
    if (code.length >= 3) {
      processScan(code)
    }
    setSearchQuery('')
    currentInputValue.current = ''
    focusScanner()
  }, [processScan, focusScanner])

  // Incrementar/decrementar manual
  const inc = useCallback((idx: number) => {
    setProductos(prev => {
      const next = [...prev]
      const item = next[idx]
      if (item.packed < item.CANTIDAD) {
        next[idx] = { ...item, packed: item.packed + 1 }
      }
      return next
    })
    focusScanner()
  }, [focusScanner])

  const dec = useCallback((idx: number) => {
    setProductos(prev => {
      const next = [...prev]
      const item = next[idx]
      if (item.packed > 0) {
        next[idx] = { 
          ...item, 
          packed: item.packed - 1,
          scanned: Math.min(item.scanned, item.packed - 1)
        }
      }
      return next
    })
    focusScanner()
  }, [focusScanner])

  // Guardar recepción
  const handleGuardar = useCallback(async () => {
    if (!stats.listo) {
      Alert.alert('Incompleto', 'Debes completar todos los productos antes de guardar')
      return
    }
    
    if (!baseURL) {
      Alert.alert('Error', 'No se encontró la URL del servidor')
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Convertir a detalles según proveedor
      let detalles: Array<{ CLAVE: string; CANTIDAD: number; COSTO_UNITARIO?: number }>
      
      if (isCachorro) {
        // Para Cachorro: usar las claves Microsip escaneadas directamente
        detalles = []
        for (const producto of productos) {
          if (producto._clavesMicrosipAsignadas) {
            // Cada entrada es [claveMicrosip, cantidadEscaneada]
            for (const [claveMicrosip, cantidad] of Object.entries(producto._clavesMicrosipAsignadas)) {
              if (cantidad > 0) {
                detalles.push({
                  CLAVE: claveMicrosip,
                  CANTIDAD: cantidad,
                  COSTO_UNITARIO: producto.VALOR_UNITARIO || 0,
                })
              }
            }
          }
        }
        
        console.log('📦 Detalles Cachorro (claves Microsip):', detalles.length, 'líneas')
        console.log(detalles.map(d => `${d.CLAVE}: ${d.CANTIDAD}`).join(', '))
        
      } else if (proveedor === 'panam') {
        detalles = convertirADetallesPanam(productos, requireScan)
      } else {
        detalles = convertirADetallesMundo(productos, requireScan)
      }
      
      if (detalles.length === 0) {
        Alert.alert('Error', 'No hay detalles para enviar. Verifica que hayas escaneado los productos.')
        setIsProcessing(false)
        return
      }
      
      // GUARDAR BACKUP antes de enviar (por si falla)
      const backupData = {
        productos,
        meta,
        folio,
        detalles,
        timestamp: Date.now(),
      }
      await AsyncStorage.setItem('@xml_backup', JSON.stringify(backupData))
      console.log('💾 Backup guardado en AsyncStorage')
      
      // Enviar recepción
      const payload = {
        P_SISTEMA: 'IN',
        P_CONCEPTO_ID: 27,
        P_SUCURSAL_ID: 384,
        P_ALMACEN_ID: 19,
        P_DESCRIPCION: `RECEPCION XML`,
        P_NATURALEZA_CONCEPTO: 'E',
        detalles,
      }
      
      console.log('📤 Enviando payload:', JSON.stringify(payload, null, 2))
      
      const result = await API.enviarRecepcion(baseURL, payload)
      
      if (result.ok) {
        // Limpiar backup si fue exitoso
        await AsyncStorage.removeItem('@xml_backup')
        
        setCompletionMessage(
          `Folio: ${result.folio || 'N/A'}\nDOCTO_IN_ID: ${result.doctoId}\nLíneas: ${result.inserted}\nTiempo: ${formatTime(elapsedSeconds)}`
        )
        setShowCompletionModal(true)
      } else {
        Alert.alert('Error', result.message || 'Error al guardar recepción\n\n💾 Tu progreso está guardado, intenta de nuevo.')
      }
    } catch (error) {
      console.error('Error guardando:', error)
      Alert.alert('Error', 'Error de conexión\n\n💾 Tu progreso está guardado, intenta de nuevo.')
    } finally {
      setIsProcessing(false)
    }
  }, [stats.listo, baseURL, isCachorro, productos, meta, requireScan, proveedor, folio, elapsedSeconds])

  // Back handler
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      const hasProgress = productos.some(p => p.scanned > 0 || p.packed > 0)
      if (hasProgress) {
        Alert.alert(
          'Salir',
          'Tienes progreso sin guardar. ¿Deseas salir?',
          [
            { text: 'Quedarme', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => router.back() },
          ]
        )
        return true
      }
      return false
    })
    return () => handler.remove()
  }, [productos])

  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

  // Render item
  const renderItem = useCallback(({ item, index }: { item: ProductoXML; index: number }) => {
    const req = item.CANTIDAD
    const done = requireScan ? item.scanned : item.packed
    const isComplete = done >= req
    const isFlashing = lastScannedIndex === index
    
    return (
      <Animated.View
        style={[
          styles.itemCard,
          { 
            backgroundColor: colors.surface,
            borderColor: isComplete ? '#4CAF50' : colors.border,
            opacity: isFlashing ? flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.5],
            }) : 1,
          },
        ]}
      >
        <View style={styles.itemHeader}>
          <Text style={[styles.itemCode, { color: colors.text }]}>{item.CLAVE}</Text>
          {isComplete && (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          )}
        </View>
        <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.DESCRIPCION}
        </Text>
        
        {/* Badges de claves Microsip asignadas con conteo */}
        {item._clavesMicrosipAsignadas && Object.keys(item._clavesMicrosipAsignadas).length > 0 && (
          <View style={styles.badgesContainer}>
            {Object.entries(item._clavesMicrosipAsignadas).map(([clave, count]) => (
              <View key={clave} style={[styles.microsipBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="link" size={12} color="#0284C7" />
                <Text style={styles.microsipBadgeText}>{clave}</Text>
                <View style={styles.microsipBadgeCount}>
                  <Text style={styles.microsipBadgeCountText}>{count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.itemFooter}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity 
              style={[styles.qtyBtn, { backgroundColor: colors.background }]}
              onPress={() => dec(index)}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: isComplete ? '#4CAF50' : colors.text }]}>
              {done}/{req}
            </Text>
            <TouchableOpacity 
              style={[styles.qtyBtn, { backgroundColor: colors.background }]}
              onPress={() => inc(index)}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.itemPrice, { color: colors.accent }]}>
            {currency.format(item.VALOR_UNITARIO * req)}
          </Text>
        </View>
      </Animated.View>
    )
  }, [colors, requireScan, lastScannedIndex, flashAnim, currency, inc, dec])

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Recepción XML</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {folio} • {meta?.emisor?.substring(0, 20)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.timerText, { color: colors.accent }]}>
            {formatTime(elapsedSeconds)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {stats.lineasCompletas}/{stats.totalLineas} líneas • {stats.totalHechas}/{stats.totalRequeridas} pzas
          </Text>
          <Text style={[styles.progressPercent, { color: colors.accent }]}>
            {Math.round(stats.progreso * 100)}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
          <View 
            style={[styles.progressFill, { width: `${stats.progreso * 100}%`, backgroundColor: colors.accent }]} 
          />
        </View>
      </View>

      {/* Scanner input */}
      <View style={[styles.scannerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="scan-outline" size={20} color={colors.accent} />
        <TextInput
          ref={scannerRef}
          style={[styles.scannerInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSubmit}
          placeholder="Escanea o busca código..."
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          blurOnSubmit={false}
          returnKeyType="search"
        />
        {isLoadingAlternos && (
          <ActivityIndicator size="small" color={colors.accent} />
        )}
      </View>

      {/* Lista de productos */}
      <FlatList
        ref={listRef}
        data={productos}
        keyExtractor={(item) => item.CLAVE}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
      />

      {/* Footer con botón guardar */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: stats.listo ? colors.accent : colors.border },
          ]}
          onPress={handleGuardar}
          disabled={!stats.listo || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {stats.listo ? 'Guardar Recepción' : `Faltan ${stats.totalRequeridas - stats.totalHechas} pzas`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de completado */}
      <Modal visible={showCompletionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.successIcon, { backgroundColor: '#4CAF5020' }]}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>¡Recepción Completada!</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              {completionMessage}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                setShowCompletionModal(false)
                router.replace('/(main)/inventarios/recepcion' as any)
              }}
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { width: 60, alignItems: 'flex-end' },
  timerText: { fontSize: 14, fontWeight: '600' },
  
  progressContainer: { padding: 12 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 13 },
  progressPercent: { fontSize: 13, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  
  scannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  scannerInput: { flex: 1, fontSize: 16, padding: 0 },
  
  listContent: { padding: 12, gap: 10, paddingBottom: 100 },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCode: { fontSize: 15, fontWeight: '600' },
  itemDesc: { fontSize: 13, marginTop: 4, marginBottom: 4 },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  microsipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  microsipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  microsipBadgeCount: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  microsipBadgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  itemPrice: { fontSize: 14, fontWeight: '500' },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButton: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
