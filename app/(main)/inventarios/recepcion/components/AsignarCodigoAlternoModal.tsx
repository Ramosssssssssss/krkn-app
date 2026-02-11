/**
 * Modal para asignar códigos alternos (CACHORRO)
 * Diseño estilo iOS con secciones agrupadas
 */

import { API_CONFIG } from '@/config/api'
import { useThemeColors } from '@/context/theme-context'
import { getCurrentDatabaseId } from '@/services/api'
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
import CrearArticuloModal from './CrearArticuloModal'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface Props {
  visible: boolean
  codigoXml: string | null
  onClose: () => void
  onCreated: (codigoXml: string) => void
}

interface ValidacionClave {
  validando: boolean
  existeEnArticulos: boolean | null
  yaAsignado: boolean | null
  articulo: { clave: string; nombre: string; umed: string } | null
  asignacion: { codigoXml: string; codigoLargo: string; claveMicrosip: string } | null
}

// Componente de sección estilo iOS
const Section = ({ title, children, colors }: { title?: string; children: React.ReactNode; colors: any }) => (
  <View style={styles.section}>
    {title && <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>}
    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  </View>
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
  editable = true,
  onBlur,
  rightIcon,
  hint,
  status,
}: {
  label: string
  value: string
  onChangeText?: (text: string) => void
  placeholder?: string
  isLast?: boolean
  required?: boolean
  colors: any
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  maxLength?: number
  editable?: boolean
  onBlur?: () => void
  rightIcon?: React.ReactNode
  hint?: string
  status?: 'success' | 'error' | 'warning' | null
}) => {
  const statusColors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  }
  
  return (
    <View style={[!isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.inputField, 
              { color: editable ? colors.text : colors.accent },
              !editable && styles.inputReadOnly,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
            editable={editable}
            onBlur={onBlur}
          />
          {rightIcon}
        </View>
      </View>
      {hint && (
        <Text style={[styles.inputHint, { color: status ? statusColors[status] : colors.textTertiary }]}>
          {hint}
        </Text>
      )}
    </View>
  )
}

export default function AsignarCodigoAlternoModal({ visible, codigoXml, onClose, onCreated }: Props) {
  const colors = useThemeColors()
  
  const [codigoLargo, setCodigoLargo] = useState('')
  const [claveMicrosip, setClaveMicrosip] = useState('')
  const [nombreTicket, setNombreTicket] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Validación de clave
  const [validacion, setValidacion] = useState<ValidacionClave>({
    validando: false,
    existeEnArticulos: null,
    yaAsignado: null,
    articulo: null,
    asignacion: null,
  })
  
  // Modal para crear artículo
  const [showCrearArticuloModal, setShowCrearArticuloModal] = useState(false)
  
  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setCodigoLargo('')
      setClaveMicrosip('')
      setNombreTicket('')
      setValidacion({
        validando: false,
        existeEnArticulos: null,
        yaAsignado: null,
        articulo: null,
        asignacion: null,
      })
    }
  }, [visible])
  
  // Validar clave microsip
  const validarClaveMicrosip = async (clave: string) => {
    if (!clave.trim()) {
      setValidacion({
        validando: false,
        existeEnArticulos: null,
        yaAsignado: null,
        articulo: null,
        asignacion: null,
      })
      return
    }
    
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) return
    
    setValidacion(prev => ({ ...prev, validando: true }))
    
    try {
      const url = `${API_CONFIG.BASE_URL}/api/verificar-clave-microsip.php?claveMicrosip=${encodeURIComponent(clave.trim())}&databaseId=${databaseId}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.ok) {
        setValidacion({
          validando: false,
          existeEnArticulos: data.existeEnArticulos,
          yaAsignado: data.yaAsignado,
          articulo: data.articulo,
          asignacion: data.asignacion,
        })
        
        // Si no existe en artículos, preguntar si quiere crearlo
        if (!data.existeEnArticulos) {
          Alert.alert(
            'Artículo no encontrado',
            `La clave "${clave}" no existe.\n\n¿Deseas crear el artículo?`,
            [
              { text: 'No', style: 'cancel' },
              { text: 'Crear', onPress: () => setShowCrearArticuloModal(true) }
            ]
          )
        }
        // Si ya está asignado a otro código XML
        else if (data.yaAsignado && data.asignacion?.codigoXml !== codigoXml) {
          Alert.alert(
            'Clave ya asignada',
            `Esta clave ya tiene un código XML asignado:\n\n${data.asignacion?.codigoXml}`,
            [{ text: 'Entendido' }]
          )
        }
      }
    } catch (error) {
      console.error('Error validando clave:', error)
      setValidacion(prev => ({ ...prev, validando: false }))
    }
  }
  
  const handleGuardar = async () => {
    // Validaciones
    if (!codigoLargo.trim()) {
      Alert.alert('Campo requerido', 'El código largo es requerido')
      return
    }
    if (!claveMicrosip.trim()) {
      Alert.alert('Campo requerido', 'La clave Microsip es requerida')
      return
    }
    if (!codigoXml) {
      Alert.alert('Error', 'No hay código XML')
      return
    }
    
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      Alert.alert('Error', 'No hay base de datos seleccionada')
      return
    }
    
    setSaving(true)
    
    try {
      const url = `${API_CONFIG.BASE_URL}/api/crear-codigo-alterno.php`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoXml: codigoXml.trim(),
          codigoLargo: codigoLargo.trim(),
          claveMicrosip: claveMicrosip.trim(),
          databaseId,
        }),
      })
      
      const data = await response.json()
      
      if (data.ok) {
        Alert.alert('Código asignado', 'El código alterno se asignó correctamente', [
          { text: 'OK', onPress: () => onCreated(codigoXml) }
        ])
      } else {
        Alert.alert('Error', data.message || 'No se pudo crear el código alterno')
      }
    } catch (error) {
      console.error('Error creando código alterno:', error)
      Alert.alert('Error', 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }
  
  // Determinar estado de validación
  const getValidationStatus = (): 'success' | 'error' | 'warning' | null => {
    if (validacion.existeEnArticulos === false) return 'error'
    if (validacion.yaAsignado) return 'warning'
    if (validacion.existeEnArticulos === true && !validacion.yaAsignado) return 'success'
    return null
  }
  
  const getValidationHint = (): string => {
    if (validacion.validando) return 'Validando...'
    if (validacion.existeEnArticulos === false) return '✗ No existe en artículos'
    if (validacion.yaAsignado) return `⚠ Ya asignado a: ${validacion.asignacion?.codigoXml}`
    if (validacion.existeEnArticulos === true && validacion.articulo) {
      return `✓ ${validacion.articulo.nombre.substring(0, 35)}...`
    }
    return 'SKU del artículo en Microsip'
  }
  
  const getValidationIcon = () => {
    if (validacion.validando) {
      return <ActivityIndicator size="small" color={colors.accent} />
    }
    if (validacion.existeEnArticulos === false) {
      return <Ionicons name="alert-circle" size={20} color="#EF4444" />
    }
    if (validacion.yaAsignado) {
      return <Ionicons name="warning" size={20} color="#F59E0B" />
    }
    if (validacion.existeEnArticulos === true && !validacion.yaAsignado) {
      return <Ionicons name="checkmark-circle" size={20} color="#10B981" />
    }
    return null
  }
  
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
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: colors.accent }]}>Cancelar</Text>
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: colors.text }]}>Asignar Código</Text>
            
            <TouchableOpacity 
              onPress={handleGuardar} 
              style={styles.headerBtn}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.headerBtnText, styles.headerBtnPrimary, { color: colors.accent }]}>
                  Asignar
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Código XML (read only) */}
            <Section title="CÓDIGO DE FACTURA" colors={colors}>
              <InputRow
                label="Código XML"
                value={codigoXml || 'N/A'}
                editable={false}
                isLast
                colors={colors}
                hint="NoIdentificacion del XML de factura"
              />
            </Section>
            
            {/* Códigos */}
            <Section title="RELACIÓN CON MICROSIP" colors={colors}>
              <InputRow
                label="Código Largo"
                value={codigoLargo}
                onChangeText={setCodigoLargo}
                placeholder="100074214151080492NT205"
                autoCapitalize="characters"
                required
                colors={colors}
                hint="Código de barras completo (con talla)"
              />
              <InputRow
                label="Clave Microsip"
                value={claveMicrosip}
                onChangeText={(text) => {
                  setClaveMicrosip(text)
                  setValidacion(prev => ({ 
                    ...prev, 
                    existeEnArticulos: null, 
                    yaAsignado: null, 
                    articulo: null, 
                    asignacion: null 
                  }))
                }}
                onBlur={() => validarClaveMicrosip(claveMicrosip)}
                placeholder="ZAPN12415-19 20.5"
                required
                isLast
                colors={colors}
                rightIcon={getValidationIcon()}
                hint={getValidationHint()}
                status={getValidationStatus()}
              />
            </Section>
            
            {/* Nombre ticket opcional */}
            <Section title="OPCIONAL" colors={colors}>
              <InputRow
                label="Nombre Ticket"
                value={nombreTicket}
                onChangeText={setNombreTicket}
                placeholder="Nombre corto para tickets"
                maxLength={30}
                isLast
                colors={colors}
                hint="Máximo 30 caracteres"
              />
            </Section>
            
            {/* Botón crear artículo si no existe */}
            {validacion.existeEnArticulos === false && (
              <Section colors={colors}>
                <TouchableOpacity
                  style={[styles.createBtn]}
                  onPress={() => setShowCrearArticuloModal(true)}
                >
                  <View style={[styles.createBtnIcon, { backgroundColor: '#22C55E15' }]}>
                    <Ionicons name="add-circle" size={22} color="#22C55E" />
                  </View>
                  <View style={styles.createBtnContent}>
                    <Text style={[styles.createBtnLabel, { color: colors.text }]}>
                      Crear artículo nuevo
                    </Text>
                    <Text style={[styles.createBtnHint, { color: colors.textTertiary }]}>
                      La clave no existe en el sistema
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </Section>
            )}
            
            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: `${colors.accent}10` }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Este registro relacionará el código del proveedor con el artículo en Microsip para futuras recepciones.
              </Text>
            </View>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      
      {/* Modal para crear artículo si no existe */}
      <CrearArticuloModal
        visible={showCrearArticuloModal}
        producto={claveMicrosip ? { 
          CLAVE: claveMicrosip, 
          CLAVE_ORIGINAL: claveMicrosip,
          DESCRIPCION: '', 
          CANTIDAD: 1, 
          VALOR_UNITARIO: 0, 
          IMPORTE: 0,
          packed: 0,
          scanned: 0,
        } : null}
        onClose={() => setShowCrearArticuloModal(false)}
        onCreated={(codigo) => {
          setShowCrearArticuloModal(false)
          // Re-validar después de crear
          setTimeout(() => validarClaveMicrosip(claveMicrosip), 500)
        }}
      />
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
  },
  inputLabel: {
    fontSize: 16,
    width: 110,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
    paddingVertical: 12,
  },
  inputReadOnly: {
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -4,
  },
  required: {
    color: '#EF4444',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  createBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnContent: {
    flex: 1,
  },
  createBtnLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  createBtnHint: {
    fontSize: 13,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
})
