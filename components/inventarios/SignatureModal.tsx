import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onOK: (signature: string) => void;
  title?: string;
}

export default function SignatureModal({ visible, onClose, onOK, title = 'Firma de Conformidad' }: SignatureModalProps) {
  const colors = useThemeColors();
  const ref = useRef<SignatureViewRef>(null);

  const handleOK = (signature: string) => {
    onOK(signature);
    onClose();
  };

  const handleClear = () => {
    ref.current?.clearSignature();
  };

  const handleConfirm = () => {
    ref.current?.readSignature();
  };

  const style = `
    .m-signature-pad { border: none; box-shadow: none; margin: 0; }
    .m-signature-pad--body { border: none; background: transparent; }
    .m-signature-pad--footer { display: none; }
    body, html { background-color: transparent; }
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.canvasContainer}>
          <SignatureScreen
            ref={ref}
            onOK={handleOK}
            descriptionText=""
            clearText="Limpiar"
            confirmText="Confirmar"
            webStyle={style}
            autoClear={false}
            imageType="image/png"
          />
        </View>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.footerButton, styles.clearButton, { borderColor: colors.border }]} 
            onPress={handleClear}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Limpiar Pantalla</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.footerButton, styles.confirmButton, { backgroundColor: colors.accent }]} 
            onPress={handleConfirm}
          >
            <Ionicons name="checkmark-sharp" size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>Confirmar Firma</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clearButton: {
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
