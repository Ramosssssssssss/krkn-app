/**
 * Modal para crear artículos que no existen en la BD
 * Diseño estilo iOS con secciones agrupadas
 */

import { useThemeColors } from '@/context/theme-context'
import { useSucursalesAlmacenes } from '@/hooks/use-sucursales-almacenes'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import type { CrearArticuloPayload, LineaArticulo, ProductoXML } from '../types/xml'
import { crearArticulo, obtenerCatalogosArticulos, obtenerLineasArticulos, type CatalogoItem } from '../utils/api'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface Props {
  visible: boolean
  producto: ProductoXML | null
  onClose: () => void
  onCreated: (codigo: string) => void
}

type UnidadVenta = 'PAR' | 'PZA'
type TipoImpuesto = 'NO SUJETO DEL IMPUESTO' | 'IVA 16%' | 'IVA 0%'

// Componente de sección estilo iOS
const Section = ({ title, children, colors }: { title?: string; children: React.ReactNode; colors: any }) => (
  <View style={styles.section}>
    {title && <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>}
    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  </View>
)

// Componente de fila estilo iOS
const Row = ({ 
  label, 
  value, 
  onPress, 
  placeholder,
  isLast,
  required,
  colors,
  loading,
  children,
}: { 
  label: string
  value?: string
  onPress?: () => void
  placeholder?: string
  isLast?: boolean
  required?: boolean
  colors: any
  loading?: boolean
  children?: React.ReactNode
}) => (
  <TouchableOpacity 
    style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
    onPress={onPress}
    disabled={!onPress || loading}
    activeOpacity={onPress ? 0.6 : 1}
  >
    <Text style={[styles.rowLabel, { color: colors.text }]}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    {children || (
      <View style={styles.rowRight}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <>
            <Text style={[styles.rowValue, { color: value ? colors.text : colors.textTertiary }]} numberOfLines={1}>
              {value || placeholder || 'Seleccionar'}
            </Text>
            {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
          </>
        )}
      </View>
    )}
  </TouchableOpacity>
)

// Componente de input estilo iOS
const InputRow = ({
  label,
  value,
  onChangeText,
  placeholder,
  isLast,
  required,
  colors,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
}: {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  isLast?: boolean
  required?: boolean
  colors: any
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  maxLength?: number
}) => (
  <View style={[styles.inputRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
    <Text style={[styles.inputLabel, { color: colors.text }]}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <TextInput
      style={[styles.inputField, { color: colors.text }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
    />
  </View>
)

// Componente Picker Modal estilo iOS
const PickerModal = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  colors,
  allowEmpty,
  emptyLabel = 'Sin selección',
}: {
  visible: boolean
  title: string
  options: { id: string | number; label: string }[]
  selectedValue: string | number
  onSelect: (value: any) => void
  onClose: () => void
  colors: any
  allowEmpty?: boolean
  emptyLabel?: string
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.pickerOverlay}>
      <TouchableOpacity style={styles.pickerDismiss} onPress={onClose} activeOpacity={1} />
      <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.pickerHandle} />
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
          {allowEmpty && (
            <TouchableOpacity
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => { onSelect(''); onClose(); }}
            >
              <Text style={[styles.pickerOptionText, { color: colors.textTertiary, fontStyle: 'italic' }]}>
                {emptyLabel}
              </Text>
              {!selectedValue && <Ionicons name="checkmark" size={22} color={colors.accent} />}
            </TouchableOpacity>
          )}
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.pickerOption, idx < options.length - 1 && { borderBottomColor: colors.border }]}
              onPress={() => { onSelect(opt.id); onClose(); }}
            >
              <Text style={[
                styles.pickerOptionText, 
                { color: colors.text },
                selectedValue === opt.id && { color: colors.accent, fontWeight: '600' }
              ]}>
                {opt.label}
              </Text>
              {selectedValue === opt.id && <Ionicons name="checkmark" size={22} color={colors.accent} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  </Modal>
)

export default function CrearArticuloModal({ visible, producto, onClose, onCreated }: Props) {
  const colors = useThemeColors()
  
  // Hook de almacenes
  const { almacenes, isLoading: loadingAlmacenes } = useSucursalesAlmacenes()
  
  // Estado del formulario principal
  const [nombre, setNombre] = useState('')
  const [lineaId, setLineaId] = useState<number>(0)
  const [almacenId, setAlmacenId] = useState<number>(0)
  const [unidadVenta, setUnidadVenta] = useState<UnidadVenta>('PZA')
  const [unidadCompra, setUnidadCompra] = useState<UnidadVenta>('PZA')
  const [claveArticulo, setClaveArticulo] = useState('')
  const [claveBarras, setClaveBarras] = useState('')
  const [precioLista, setPrecioLista] = useState('')
  const [marca, setMarca] = useState('')
  const [impuesto, setImpuesto] = useState<TipoImpuesto>('IVA 16%')
  
  // Campos adicionales
  const [codigoLargo, setCodigoLargo] = useState('')
  const [nombreTicket, setNombreTicket] = useState('')
  const [codigoXml, setCodigoXml] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [talla, setTalla] = useState('')
  
  // Estado de la UI
  const [lineas, setLineas] = useState<LineaArticulo[]>([])
  const [marcas, setMarcas] = useState<CatalogoItem[]>([])
  const [proveedores, setProveedores] = useState<CatalogoItem[]>([])
  const [tallas, setTallas] = useState<CatalogoItem[]>([])
  const [loadingLineas, setLoadingLineas] = useState(false)
  const [loadingCatalogos, setLoadingCatalogos] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Pickers
  const [showLineaPicker, setShowLineaPicker] = useState(false)
  const [showAlmacenPicker, setShowAlmacenPicker] = useState(false)
  const [showMarcaPicker, setShowMarcaPicker] = useState(false)
  const [showProveedorPicker, setShowProveedorPicker] = useState(false)
  const [showTallaPicker, setShowTallaPicker] = useState(false)
  const [showImpuestoPicker, setShowImpuestoPicker] = useState(false)
  const [showOpcionesModal, setShowOpcionesModal] = useState(false)
  
  // Cargar datos al abrir
  useEffect(() => {
    if (visible) {
      cargarLineas()
      cargarCatalogos()
      // Pre-llenar datos del producto
      if (producto) {
        setNombre(producto.DESCRIPCION || '')
        setClaveArticulo(producto.CLAVE_ORIGINAL || producto.CLAVE || '')
        setPrecioLista(producto.VALOR_UNITARIO?.toString() || '')
      }
    }
  }, [visible, producto])
  
  // Seleccionar primer almacén disponible
  useEffect(() => {
    if (almacenes.length > 0 && almacenId === 0) {
      setAlmacenId(almacenes[0].id)
    }
  }, [almacenes, almacenId])
  
  const cargarLineas = async () => {
    setLoadingLineas(true)
    const data = await obtenerLineasArticulos()
    setLineas(data)
    if (data.length > 0 && lineaId === 0) {
      setLineaId(data[0].id)
    }
    setLoadingLineas(false)
  }
  
  const cargarCatalogos = async () => {
    setLoadingCatalogos(true)
    const data = await obtenerCatalogosArticulos()
    if (data.ok) {
      setMarcas(data.marcas || [])
      setProveedores(data.proveedores || [])
      setTallas(data.tallas || [])
    }
    setLoadingCatalogos(false)
  }
  
  const lineaSeleccionada = lineas.find(l => l.id === lineaId)
  const almacenSeleccionado = almacenes.find(a => a.id === almacenId)
  
  const impuestoLabel: Record<TipoImpuesto, string> = {
    'IVA 16%': 'IVA 16%',
    'IVA 0%': 'IVA 0%',
    'NO SUJETO DEL IMPUESTO': 'Sin IVA',
  }
  
  const handleGuardar = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del artículo')
      return
    }
    if (!lineaId) {
      Alert.alert('Campo requerido', 'Selecciona una línea de artículo')
      return
    }
    if (!almacenId) {
      Alert.alert('Campo requerido', 'Selecciona un almacén')
      return
    }
    if (!claveArticulo.trim() && !claveBarras.trim()) {
      Alert.alert('Campo requerido', 'Ingresa al menos una clave o código de barras')
      return
    }
    
    setSaving(true)
    
    const payload: Omit<CrearArticuloPayload, 'databaseId'> = {
      P_NOMBRE: nombre.trim(),
      P_LINEA_ARTICULO_ID: lineaId,
      P_UNIDAD_VENTA: unidadVenta,
      P_UNIDAD_COMPRA: unidadCompra,
      P_CLAVE_ARTICULO: claveArticulo.trim() || claveBarras.trim(),
      P_CLAVE_BARRAS: claveBarras.trim(),
      P_ALMACEN_ID: almacenId,
      P_PRECIO_LISTA: parseFloat(precioLista) || 0,
      P_NOM_IMPUESTO: impuesto,
      P_MARCA: typeof marca === 'string' ? marca.trim() : '',
      P_CODIGO_LARGO: typeof codigoLargo === 'string' ? codigoLargo.trim() : '',
      P_NOMBRE_TICKET: typeof nombreTicket === 'string' ? nombreTicket.trim() : '',
      P_CODIGO_XML: typeof codigoXml === 'string' ? codigoXml.trim() : '',
      P_PROVEEDOR: typeof proveedor === 'string' ? proveedor.trim() : '',
      P_TALLA: typeof talla === 'string' ? talla.trim() : '',
    }
    
    const result = await crearArticulo(payload)
    
    setSaving(false)
    
    if (result.ok) {
      Alert.alert('Artículo creado', result.message, [
        { text: 'OK', onPress: () => onCreated(claveBarras || claveArticulo) }
      ])
    } else {
      Alert.alert('Error', result.message)
    }
  }
  
  const resetForm = () => {
    setNombre('')
    setLineaId(lineas[0]?.id || 0)
    setAlmacenId(almacenes[0]?.id || 0)
    setUnidadVenta('PZA')
    setUnidadCompra('PZA')
    setClaveArticulo('')
    setClaveBarras('')
    setPrecioLista('')
    setMarca('')
    setImpuesto('IVA 16%')
    setCodigoLargo('')
    setNombreTicket('')
    setCodigoXml('')
    setProveedor('')
    setTalla('')
  }
  
  const tieneOpcionesAdicionales = codigoLargo || nombreTicket || codigoXml
  
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { resetForm(); onClose(); }} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: colors.accent }]}>Cancelar</Text>
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Artículo</Text>
              {producto?.CLAVE && (
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {producto.CLAVE}
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              onPress={handleGuardar} 
              style={styles.headerBtn}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.headerBtnText, styles.headerBtnPrimary, { color: colors.accent }]}>
                  Guardar
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Información básica */}
            <Section title="INFORMACIÓN BÁSICA" colors={colors}>
              <InputRow
                label="Nombre"
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre del artículo"
                required
                colors={colors}
              />
              <Row
                label="Línea"
                value={lineaSeleccionada?.nombre}
                placeholder="Seleccionar línea"
                onPress={() => setShowLineaPicker(true)}
                loading={loadingLineas}
                required
                colors={colors}
              />
              <Row
                label="Almacén"
                value={almacenSeleccionado?.nombre}
                placeholder="Seleccionar almacén"
                onPress={() => setShowAlmacenPicker(true)}
                loading={loadingAlmacenes}
                required
                isLast
                colors={colors}
              />
            </Section>
            
            {/* Claves */}
            <Section title="IDENTIFICACIÓN" colors={colors}>
              <InputRow
                label="Clave"
                value={claveArticulo}
                onChangeText={setClaveArticulo}
                placeholder="SKU interno"
                autoCapitalize="characters"
                required
                colors={colors}
              />
              <InputRow
                label="Código Barras"
                value={claveBarras}
                onChangeText={setClaveBarras}
                placeholder="EAN/UPC"
                keyboardType="numeric"
                isLast
                colors={colors}
              />
            </Section>
            
            {/* Unidades */}
            <Section title="UNIDADES" colors={colors}>
              <Row label="Unidad Venta" colors={colors}>
                <View style={styles.segmentedControl}>
                  {(['PZA', 'PAR'] as UnidadVenta[]).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.segment,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        unidadVenta === u && { backgroundColor: colors.accent, borderColor: colors.accent }
                      ]}
                      onPress={() => setUnidadVenta(u)}
                    >
                      <Text style={[styles.segmentText, { color: unidadVenta === u ? '#fff' : colors.text }]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Row>
              <Row label="Unidad Compra" isLast colors={colors}>
                <View style={styles.segmentedControl}>
                  {(['PZA', 'PAR'] as UnidadVenta[]).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.segment,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        unidadCompra === u && { backgroundColor: colors.accent, borderColor: colors.accent }
                      ]}
                      onPress={() => setUnidadCompra(u)}
                    >
                      <Text style={[styles.segmentText, { color: unidadCompra === u ? '#fff' : colors.text }]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Row>
            </Section>
            
            {/* Precio e Impuesto */}
            <Section title="PRECIO" colors={colors}>
              <InputRow
                label="Costo"
                value={precioLista}
                onChangeText={setPrecioLista}
                placeholder="0.00"
                keyboardType="decimal-pad"
                colors={colors}
              />
              <Row
                label="Impuesto"
                value={impuestoLabel[impuesto]}
                onPress={() => setShowImpuestoPicker(true)}
                isLast
                colors={colors}
              />
            </Section>
            
            {/* Clasificadores */}
            <Section title="CLASIFICADORES" colors={colors}>
              <Row
                label="Marca"
                value={marca}
                placeholder="Sin marca"
                onPress={() => setShowMarcaPicker(true)}
                loading={loadingCatalogos}
                colors={colors}
              />
              <Row
                label="Proveedor"
                value={proveedor}
                placeholder="Sin proveedor"
                onPress={() => setShowProveedorPicker(true)}
                loading={loadingCatalogos}
                colors={colors}
              />
              <Row
                label="Talla"
                value={talla}
                placeholder="Sin talla"
                onPress={() => setShowTallaPicker(true)}
                loading={loadingCatalogos}
                isLast
                colors={colors}
              />
            </Section>
            
            {/* Opciones adicionales */}
            <Section colors={colors}>
              <TouchableOpacity
                style={[styles.optionsRow, { borderBottomWidth: 0 }]}
                onPress={() => setShowOpcionesModal(true)}
              >
                <View style={styles.optionsLeft}>
                  <View style={[styles.optionsIcon, { backgroundColor: `${colors.accent}15` }]}>
                    <Ionicons name="settings-outline" size={20} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.optionsLabel, { color: colors.text }]}>Más opciones</Text>
                    <Text style={[styles.optionsHint, { color: colors.textTertiary }]}>
                      {tieneOpcionesAdicionales ? 'Configurado' : 'Código largo, nombre ticket, código XML'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </Section>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      
      {/* Pickers */}
      <PickerModal
        visible={showLineaPicker}
        title="Línea de Artículo"
        options={lineas.map(l => ({ id: l.id, label: l.nombre }))}
        selectedValue={lineaId}
        onSelect={setLineaId}
        onClose={() => setShowLineaPicker(false)}
        colors={colors}
      />
      
      <PickerModal
        visible={showAlmacenPicker}
        title="Almacén"
        options={almacenes.map(a => ({ id: a.id, label: a.nombre }))}
        selectedValue={almacenId}
        onSelect={setAlmacenId}
        onClose={() => setShowAlmacenPicker(false)}
        colors={colors}
      />
      
      <PickerModal
        visible={showMarcaPicker}
        title="Marca"
        options={marcas.map(m => ({ id: m.nombre, label: m.nombre }))}
        selectedValue={marca}
        onSelect={setMarca}
        onClose={() => setShowMarcaPicker(false)}
        colors={colors}
        allowEmpty
        emptyLabel="Sin marca"
      />
      
      <PickerModal
        visible={showProveedorPicker}
        title="Proveedor"
        options={proveedores.map(p => ({ id: p.nombre, label: p.nombre }))}
        selectedValue={proveedor}
        onSelect={setProveedor}
        onClose={() => setShowProveedorPicker(false)}
        colors={colors}
        allowEmpty
        emptyLabel="Sin proveedor"
      />
      
      <PickerModal
        visible={showTallaPicker}
        title="Talla"
        options={tallas.map(t => ({ id: t.nombre, label: t.nombre }))}
        selectedValue={talla}
        onSelect={setTalla}
        onClose={() => setShowTallaPicker(false)}
        colors={colors}
        allowEmpty
        emptyLabel="Sin talla"
      />
      
      <PickerModal
        visible={showImpuestoPicker}
        title="Tipo de Impuesto"
        options={[
          { id: 'IVA 16%', label: 'IVA 16%' },
          { id: 'IVA 0%', label: 'IVA 0%' },
          { id: 'NO SUJETO DEL IMPUESTO', label: 'Sin IVA (No sujeto)' },
        ]}
        selectedValue={impuesto}
        onSelect={(v) => setImpuesto(v as TipoImpuesto)}
        onClose={() => setShowImpuestoPicker(false)}
        colors={colors}
      />
      
      {/* Modal de opciones adicionales */}
      <Modal 
        visible={showOpcionesModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowOpcionesModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.overlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity 
            style={styles.dismissArea} 
            onPress={() => setShowOpcionesModal(false)} 
            activeOpacity={1} 
          />
          
          <View style={[styles.optionsSheet, { backgroundColor: colors.background }]}>
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
            </View>
            
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowOpcionesModal(false)} style={styles.headerBtn}>
                <Text style={[styles.headerBtnText, { color: colors.accent }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <Text style={[styles.headerTitle, { color: colors.text }]}>Más opciones</Text>
              
              <TouchableOpacity onPress={() => setShowOpcionesModal(false)} style={styles.headerBtn}>
                <Text style={[styles.headerBtnText, styles.headerBtnPrimary, { color: colors.accent }]}>
                  Listo
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
              <Section title="CÓDIGOS ALTERNOS" colors={colors}>
                <InputRow
                  label="Código XML"
                  value={codigoXml}
                  onChangeText={setCodigoXml}
                  placeholder="NoIdentificacion del XML"
                  autoCapitalize="characters"
                  colors={colors}
                />
                <InputRow
                  label="Código Largo"
                  value={codigoLargo}
                  onChangeText={setCodigoLargo}
                  placeholder="Código de barras extendido"
                  autoCapitalize="characters"
                  isLast
                  colors={colors}
                />
              </Section>
              
              <Section title="TICKET" colors={colors}>
                <InputRow
                  label="Nombre Ticket"
                  value={nombreTicket}
                  onChangeText={setNombreTicket}
                  placeholder="Nombre corto (máx 30 car.)"
                  maxLength={30}
                  isLast
                  colors={colors}
                />
              </Section>
              
              <View style={[styles.infoBox, { backgroundColor: `${colors.accent}10` }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Estos campos son opcionales y se usan para relacionar códigos de proveedor con el artículo.
                </Text>
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    height: 50,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 50,
  },
  optionsSheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 70,
  },
  headerBtnText: {
    fontSize: 17,
  },
  headerBtnPrimary: {
    fontWeight: '600',
    textAlign: 'right',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  rowValue: {
    fontSize: 16,
    textAlign: 'right',
    maxWidth: '80%',
  },
  required: {
    color: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
  },
  inputLabel: {
    fontSize: 16,
    width: 120,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  optionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionsIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsHint: {
    fontSize: 13,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Picker styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerDismiss: {
    flex: 1,
  },
  pickerSheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  pickerHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerScroll: {
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerOptionText: {
    fontSize: 17,
  },
})
