import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BluetoothModalProps {
    visible: boolean;
    onClose: () => void;
    onDeviceConnect?: (device: { name: string, id: string }) => void;
    onDeviceDisconnect?: () => void;
}

// Unified device type for both BLE and Classic
interface UnifiedDevice {
    id: string;
    name: string;
    rssi?: number | null;
    type: 'ble' | 'classic';
    bleDevice?: Device;
    classicDevice?: BluetoothDevice;
}

// Singleton BLE Manager
let bleManager: BleManager | null = null;

const getBleManager = (): BleManager => {
    if (!bleManager) {
        bleManager = new BleManager();
    }
    return bleManager;
};

// ZPL Test Label (for Zebra printers)
const generateTestZPL = (): string => {
    const date = new Date().toLocaleString('es-MX');
    return '^XA^CF0,40^FO50,30^FDKRKN WMS^FS^CF0,25^FO50,80^FDPrueba de Impresion^FS^FO50,120^GB500,2,2^FS^CF0,20^FO50,140^FDFecha: ' + date + '^FS^FO50,170^FDImpresora: Zebra^FS^FO50,210^GB500,2,2^FS^CF0,25^FO50,240^FD[OK] Conexion exitosa^FS^XZ';
};

// ESC/POS Test Label (for Ribetec and generic thermal printers)
const generateTestESCPOS = (): string => {
    const date = new Date().toLocaleString('es-MX');
    return `
KRKN WMS
------------------------
Prueba de Impresion
Fecha: ${date}
Imp: Ribetec
------------------------
[OK] Conexion exitosa


`;
};

// Logo FYTTSA Gigante para prueba de distorsión (Raw Hex Data)
const logoRawHex = `00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003FFFFC0000000000000000000000000000000000000000007FFFFFE000000000000000000000000000000000000000001FFFFFFF800000000000000000000000000000000000000003FFFFFFFFC00000000000000000000000000000000000000007FFFFFFFFFE0000000000000000000000000000000000000001FFFFFFFFFFF0000000000000000000000000000000000000003FFFFFFFFFFF8000000000000000000000000000000000000007FFFFFFFFFFFFC00000000000000000000000000000000000000FFFFFFFFFFFFFE00000000000000000000000000000000000001FFFFFFFFFFFFFF00000000000000000000000000000000000003FFFFFFFFFFFFFF80000000000000000000000000000000000007FFFFFFFFFFFFFFC000000000000000000000000000000000000FFFFFFFFFFFFFFFFE000000000000000000000000000000000000FFFFFFFFFFFFFFFFE000000000000000000000000000000000001FFFFFFFFFFFFFFFFF000000000000000000000000000000000003FFFFF800000FFFFF8000000000000000000000000000000000003FFFF000000003FFFF000000000000000000000000000000000007FFFC000000003FFFC00000000000000000000000000000000000FFFF80000000000FFFF800000000000000000000000000000000001FFFF00000000001FFFF00000000000000000000000000000000003FFFE000000000003FFFE00000000000000000000000000000000007FFFC000000000003FFFC0000000000000000000000000000000000FFFF80000FFFFFFC001FFFF80000000000000000000000000000000001FFFF0000FFFFFFC0001FFFF00000000000000000000000000000000003FFFE0000FFFFFFC00003FFFE00000000000000000000000000000000007FFFC0000FFFFFFC00003FFFC00000000000000000000000000000000007FFFC0000FFFFFFC00003FFFC0000000000000000000000000000000000FFFF800000000000000FFFF80000000000000000000000000000000001FFFF000000000000001FFFF00000000000000000000000000000000003FFFE0000000000000003FFFE00000000000000000000000000000000007FFFC0000000000000003FFFC00000000000000000000000000000000007FFFC0000FFFFFFFC00003FFFC0000000000000000000000000000000000FFFF80000FFFFFFFC0001FFFF80000000000000000000000000000000001FFFF0000FFFFFFFC0001FFFF00000000000000000000000000000000003FFFE0000FFFFFFFC00003FFFE00000000000000000000000000000000007FFFC0000FFFFFFFC00003FFFC0000000000000000000000000000000000FFFF800000000000000FFFF80000000000000000000000000000000001FFFF000000000000001FFFF00000000000000000000000000000000003FFFE0000000000000003FFFE00000000000000000000000000000000007FFFC0000000000000003FFFC00000000000000000000000000000000007FFFC0000000000000003FFFC0000000000000000000000000000000000FFFF8000000000000000FFFF80000000000000000000000000000000001FFFF000000000000001FFFF00000000000000000000000000000000003FFFE0000000000000003FFFE00000000000000000000000000000000007FFFC0000000000000003FFFC0000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFE00000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFE00000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFE000000000000000000000000000000000007FFFFFFFFFFFFFFFFFFFFFFFC000000000000000000000000000000000003FFFFFFFFFFFFFFFFFFFFFF800000000000000000000000000000000001FFFFFFFFFFFFFFFFFFFFF000000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFE0000000000000000000000000000000000007FFFFFFFFFFFFFFFFFFFFFC00000000000000000000000000000000000003FFFFFFFFFFFFFFFFFFF800000000000000000000000000000000000001FFFFFFFFFFFFFFFFF00000000000000000000000000000000000000007FFFFFFFFFFFFFE000000000000000000000000000000000000000001FFFFFFFFFF80000000000000000000000000000000000000000003FFFFFFFE000000000000000000000000000000000000000000001FFC00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001FFFFFC01FFFFFC00000000000000000000000000000000000001FFFFFC01FFFFFC00000000000000000000000000000000000001FFFFFC01FFFFFC00000000000000000000000000000000000001F80000001F800000000000000000000000000000000000000001F80000001F800000000000000000000000000000000000000001F80000001F800000000000000000000000000000000000000001FFFFFC01FFFFFC00000000000000000000000000000000000001FFFFFC01FFFFFC00000000000000000000000000000000000001FFFFFC01FFFFFC00000000000000000000000000000000000001F80000001F800000000000000000000000000000000000000001F80000001F80000000000000000000000000000000000000001F80000001F800000000000000000000000000000000000000001F80000001F80000000000000000000000000000000000000001F80000001F80000000000000000000000000000000000000001F80000001F800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`;

export interface BluetoothModalRef {
    print: (data: string) => Promise<boolean>;
    isConnected: boolean;
}

const BluetoothModal = forwardRef<BluetoothModalRef, BluetoothModalProps>(({ visible, onClose, onDeviceConnect, onDeviceDisconnect }, ref) => {
    const colors = useThemeColors();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<UnifiedDevice[]>([]);
    const [connectedDevices, setConnectedDevices] = useState<UnifiedDevice[]>([]);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [bleState, setBleState] = useState<State>(State.Unknown);

    useImperativeHandle(ref, () => ({
        print: async (data: string) => {
            if (connectedDevices.length === 0) return false;
            let success = false;
            for (const device of connectedDevices) {
                const res = await printToDevice(device, data);
                if (res) success = true;
            }
            return success;
        },
        isConnected: connectedDevices.length > 0
    }));

    useEffect(() => {
        if (visible) {
            initBluetooth();
        }
        return () => {
            stopScan();
        };
    }, [visible]);

    const requestPermissions = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            try {
                const { PermissionsAndroid } = require('react-native');
                
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                const allGranted = Object.values(granted).every(
                    (status) => status === PermissionsAndroid.RESULTS.GRANTED
                );

                if (!allGranted) {
                    Alert.alert(
                        'Permisos Requeridos',
                        'Se necesitan permisos de Bluetooth y ubicación para buscar impresoras.',
                        [{ text: 'OK' }]
                    );
                }

                return allGranted;
            } catch (error) {
                console.error('Permission error:', error);
                return false;
            }
        }
        return true;
    };

    const initBluetooth = async () => {
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
            return;
        }

        const manager = getBleManager();
        const state = await manager.state();
        setBleState(state);

        if (state !== State.PoweredOn) {
            Alert.alert(
                'Bluetooth Desactivado',
                'Activa el Bluetooth para buscar impresoras.',
                [{ text: 'OK' }]
            );
            return;
        }

        startScan();
    };

    const startScan = async () => {
        setIsScanning(true);
        setDevices([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Scan for both BLE and Classic devices
        await Promise.all([
            scanBleDevices(),
            scanClassicDevices(),
        ]);
    };

    const scanBleDevices = () => {
        return new Promise<void>((resolve) => {
            const manager = getBleManager();
            const foundDeviceIds = new Set<string>();

            manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
                if (error) {
                    console.error('BLE Scan error:', error);
                    return;
                }

                if (device && !foundDeviceIds.has(device.id)) {
                    foundDeviceIds.add(device.id);
                    const displayName = device.name || device.localName || `BLE ${device.id.slice(-8)}`;
                    
                    const unifiedDevice: UnifiedDevice = {
                        id: device.id,
                        name: displayName,
                        rssi: device.rssi,
                        type: 'ble',
                        bleDevice: device,
                    };

                    setDevices((prev) => {
                        const exists = prev.some(d => d.id === device.id);
                        if (exists) return prev;
                        return sortDevices([...prev, unifiedDevice]);
                    });
                }
            });

            // Stop BLE scan after 10 seconds
            setTimeout(() => {
                manager.stopDeviceScan();
                resolve();
            }, 10000);
        });
    };

    const scanClassicDevices = async () => {
        try {
            // Get bonded (paired) Classic Bluetooth devices
            const bondedDevices = await RNBluetoothClassic.getBondedDevices();
            
            const classicDevices: UnifiedDevice[] = bondedDevices.map((device) => ({
                id: device.address,
                name: device.name || `Clásico ${device.address.slice(-8)}`,
                rssi: null,
                type: 'classic' as const,
                classicDevice: device,
            }));

            setDevices((prev) => {
                const merged = [...prev];
                for (const cd of classicDevices) {
                    if (!merged.some(d => d.id === cd.id)) {
                        merged.push(cd);
                    }
                }
                return sortDevices(merged);
            });
        } catch (error) {
            console.error('Classic Bluetooth scan error:', error);
        }

        setIsScanning(false);
    };

    const sortDevices = (deviceList: UnifiedDevice[]): UnifiedDevice[] => {
        return deviceList.sort((a, b) => {
            // Prioritize Zebra printers
            const aIsZebra = a.name.toLowerCase().includes('zebra') || 
                            a.name.toLowerCase().includes('qln') ||
                            a.name.toLowerCase().includes('zq') ||
                            a.name.toLowerCase().includes('evodio') ? 1 : 0;
            const bIsZebra = b.name.toLowerCase().includes('zebra') || 
                            b.name.toLowerCase().includes('qln') ||
                            b.name.toLowerCase().includes('zq') ||
                            b.name.toLowerCase().includes('evodio') ? 1 : 0;
            if (aIsZebra !== bIsZebra) return bIsZebra - aIsZebra;
            
            // Then by signal strength
            return (b.rssi || -100) - (a.rssi || -100);
        });
    };

    const stopScan = () => {
        const manager = getBleManager();
        manager.stopDeviceScan();
        setIsScanning(false);
    };

    const connectDevice = async (device: UnifiedDevice) => {
        if (connectedDevices.some(d => d.id === device.id)) {
            Alert.alert('Info', 'Este dispositivo ya está conectado');
            return;
        }

        setConnecting(device.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (device.type === 'ble' && device.bleDevice) {
                await connectBleDevice(device);
            } else if (device.type === 'classic' && device.classicDevice) {
                await connectClassicDevice(device);
            }
        } catch (error) {
            console.error('Connect error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', `No se pudo conectar: ${(error as Error).message}`);
        } finally {
            setConnecting(null);
        }
    };

    const connectBleDevice = async (device: UnifiedDevice) => {
        const manager = getBleManager();
        manager.stopDeviceScan();

        const connected = await device.bleDevice!.connect({ timeout: 10000 });
        await connected.discoverAllServicesAndCharacteristics();
        
        const connectedUnified: UnifiedDevice = {
            ...device,
            bleDevice: connected,
        };

        setConnectedDevices(prev => [...prev, connectedUnified]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (onDeviceConnect) {
            onDeviceConnect({ name: device.name, id: device.id });
        }

        Alert.alert('Conectado', `Conectado a ${device.name} (BLE)`);
    };

    const connectClassicDevice = async (device: UnifiedDevice) => {
        const connected = await device.classicDevice!.connect();
        
        if (connected) {
            setConnectedDevices(prev => [...prev, device]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            if (onDeviceConnect) {
                onDeviceConnect({ name: device.name, id: device.id });
            }

            Alert.alert('Conectado', `Conectado a ${device.name} (Clásico)`);
        } else {
            throw new Error('No se pudo establecer conexión');
        }
    };

    const disconnectDevice = async (device: UnifiedDevice) => {
        try {
            if (device.type === 'ble' && device.bleDevice) {
                await device.bleDevice.cancelConnection();
            } else if (device.type === 'classic' && device.classicDevice) {
                await device.classicDevice.disconnect();
            }
            
            setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            if (onDeviceDisconnect && connectedDevices.length <= 1) {
                onDeviceDisconnect();
            }
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    };

    const printToDevice = async (device: UnifiedDevice, printData: string): Promise<boolean> => {
        try {
            console.log(`Intentando imprimir en ${device.name} (${device.type}): ${printData.length} caracteres`);
            
            if (device.type === 'ble' && device.bleDevice) {
                return await printToBleDevice(device.bleDevice, printData);
            } else if (device.type === 'classic' && device.classicDevice) {
                return await printToClassicDevice(device.classicDevice, printData);
            }
            
            return false;
        } catch (error: any) {
            console.error(`Print error on ${device.name}:`, error);
            Alert.alert('Fallo de Envío', error?.message || 'Error desconocido');
            return false;
        }
    };

    const printToBleDevice = async (device: Device, printData: string): Promise<boolean> => {
        // Force ZPL and Clean string
        let cleanData = printData.replace(/[\r\n]+/g, '').trim();
        
        // Force ZPL command for Zebra
        const forceZPL = `! U1 setvar "device.languages" "zpl"\r\n`;
        const dataToPrint = forceZPL + cleanData;

        const base64Data = btoa(unescape(encodeURIComponent(dataToPrint)));
        const services = await device.services();
        let writeChar: any = null;

        for (const service of services) {
            if (service.uuid.startsWith('00001800') || 
                service.uuid.startsWith('00001801') ||
                service.uuid.startsWith('0000180a')) continue;

            const chars = await service.characteristics();
            for (const char of chars) {
                if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
                    writeChar = char;
                    break;
                }
            }
            if (writeChar) break;
        }

        if (!writeChar) {
            Alert.alert('Error', 'No se encontró canal de escritura en la impresora');
            return false;
        }

        const chunkSize = 100;
        const dataBytes = b64ToUint8Array(base64Data);
        
        for (let i = 0; i < dataBytes.length; i += chunkSize) {
            const chunk = dataBytes.slice(i, i + chunkSize);
            const chunkBase64 = uint8ArrayToB64(chunk);
            
            if (writeChar.isWritableWithoutResponse) {
                await writeChar.writeWithoutResponse(chunkBase64);
            } else {
                await writeChar.writeWithResponse(chunkBase64);
            }
            
            await new Promise(resolve => setTimeout(resolve, 5));
        }

        return true;
    };

    const printToClassicDevice = async (device: BluetoothDevice, printData: string): Promise<boolean> => {
        try {
            // Check if connected
            const isConnected = await device.isConnected();
            if (!isConnected) {
                await device.connect();
            }

            // 1. Clean ZPL: Remove newlines and extra spaces that can confuse older Zebra printers
            let cleanData = printData.replace(/[\r\n]+/g, '').trim();

            // 2. Force ZPL mode: Some mobile printers stay in CPCL mode. 
            // This command tells it to interpret what follows as ZPL.
            const forceZPL = `! U1 setvar "device.languages" "zpl"\r\n`;
            
            // 3. Send Force ZPL command first if it's a Zebra printer
            if (device.name?.toLowerCase().includes('zebra') || 
                device.name?.toLowerCase().includes('qln') ||
                device.name?.toLowerCase().includes('evodio')) {
                await device.write(forceZPL);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 4. Send data in chunks
            const chunkSize = 256; 
            for (let i = 0; i < cleanData.length; i += chunkSize) {
                const chunk = cleanData.slice(i, i + chunkSize);
                await device.write(chunk);
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            return true;
        } catch (error) {
            console.error('Classic print error:', error);
            throw error;
        }
    };

    // Helper functions for binary data
    const b64ToUint8Array = (b64: string) => {
        const bin = atob(b64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
    };

    const uint8ArrayToB64 = (arr: Uint8Array) => {
        let bin = '';
        const len = arr.byteLength;
        for (let i = 0; i < len; i++) {
            bin += String.fromCharCode(arr[i]);
        }
        return btoa(bin);
    };

    const printTestLabel = async () => {
        if (connectedDevices.length === 0) {
            Alert.alert('Error', 'No hay impresoras conectadas');
            return;
        }

        setIsPrinting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const printData = generateTestZPL();
            await broadcastPrint(printData);
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Error', `Error de impresión: ${(error as Error).message}`);
        } finally {
            setIsPrinting(false);
        }
    };

    const printLogoTest = async () => {
        if (connectedDevices.length === 0) {
            Alert.alert('Info', 'Conecta una impresora para probar');
            return;
        }

        setIsPrinting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            Alert.alert('Enviando...', 'Iniciando transferencia de logo...');
            
            const totalBytes = 6400;
            const bytesPerRow = 40;
            const printZPL = `^XA^PW600^LL816^FO140,150^GFA,${totalBytes},${totalBytes},${bytesPerRow},${logoRawHex}^FS^XZ`;
            
            await broadcastPrint(printZPL);
            Alert.alert('Éxito', 'Logo enviado correctamente.');
        } catch (error: any) {
            console.error('Logo test error:', error);
            Alert.alert('Error', error?.message || 'Fallo al procesar el logo');
        } finally {
            setIsPrinting(false);
        }
    };

    const broadcastPrint = async (data: string) => {
        const results: { name: string; success: boolean }[] = [];

        for (const device of connectedDevices) {
            console.log(`Enviando a ${device.name}...`);
            const success = await printToDevice(device, data);
            results.push({ name: device.name, success });
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        Haptics.notificationAsync(
            failed === 0 
                ? Haptics.NotificationFeedbackType.Success 
                : Haptics.NotificationFeedbackType.Warning
        );

        if (failed > 0) {
            Alert.alert(
                'Resultado',
                `Enviado a ${successful}/${results.length} impresoras.\n\nFallaron: ${results.filter(r => !r.success).map(r => r.name).join(', ')}`
            );
        }
    };

    const getSignalBars = (rssi: number | null): number => {
        if (!rssi) return 1;
        if (rssi > -50) return 4;
        if (rssi > -65) return 3;
        if (rssi > -80) return 2;
        return 1;
    };

    const renderDevice = (item: UnifiedDevice) => {
        const isConnected = connectedDevices.some(d => d.id === item.id);
        const isConnecting = connecting === item.id;
        const signal = getSignalBars(item.rssi ?? null);
        const isClassic = item.type === 'classic';

        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.deviceRow, { backgroundColor: colors.surface }]}
                onPress={() => isConnected ? disconnectDevice(item) : connectDevice(item)}
                disabled={isConnecting}
            >
                <View style={[styles.deviceIcon, { backgroundColor: isConnected ? `${colors.success}15` : `${colors.accent}15` }]}>
                    <Ionicons name="print" size={20} color={isConnected ? colors.success : colors.accent} />
                </View>
                <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.deviceMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: isClassic ? '#f59e0b20' : '#3b82f620' }]}>
                            <Text style={[styles.typeText, { color: isClassic ? '#f59e0b' : '#3b82f6' }]}>
                                {isClassic ? 'Clásico' : 'BLE'}
                            </Text>
                        </View>
                        {!isClassic && (
                            <>
                                <Text style={[styles.deviceRssi, { color: colors.textTertiary }]}>
                                    {item.rssi || '--'} dBm
                                </Text>
                                <View style={styles.signalBars}>
                                    {[1, 2, 3, 4].map((level) => (
                                        <View
                                            key={level}
                                            style={[
                                                styles.signalBar,
                                                { 
                                                    height: 4 + level * 3,
                                                    backgroundColor: level <= signal ? colors.success : colors.border 
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                </View>
                {isConnecting ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                ) : isConnected ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${colors.success}15` }]}>
                        <Text style={[styles.statusText, { color: colors.success }]}>Conectada</Text>
                    </View>
                ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={colors.accent} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Impresora Bluetooth</Text>
                    <TouchableOpacity onPress={startScan} disabled={isScanning}>
                        {isScanning ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                            <Ionicons name="refresh" size={22} color={colors.accent} />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* Connected Devices */}
                    {connectedDevices.length > 0 && (
                        <>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                                CONECTADAS ({connectedDevices.length})
                            </Text>
                            {connectedDevices.map((device) => renderDevice(device))}
                        </>
                    )}

                    {/* Available Devices */}
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        {isScanning ? 'BUSCANDO DISPOSITIVOS...' : 'DISPOSITIVOS DISPONIBLES'}
                    </Text>

                    {devices.filter(d => !connectedDevices.some(c => c.id === d.id)).length > 0 ? (
                        devices
                            .filter(d => !connectedDevices.some(c => c.id === d.id))
                            .map((device) => renderDevice(device))
                    ) : (
                        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                            {isScanning ? (
                                <ActivityIndicator size="large" color={colors.accent} />
                            ) : (
                                <>
                                    <Ionicons name="bluetooth-outline" size={40} color={colors.textTertiary} />
                                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                                        No se encontraron dispositivos
                                    </Text>
                                </>
                            )}
                        </View>
                    )}

                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                        BLE: Busca impresoras nuevas | Clásico: Muestra dispositivos pareados
                    </Text>
                </ScrollView>

                {/* Print Buttons Container */}
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            style={[
                                styles.printBtn,
                                { flex: 1.2, backgroundColor: connectedDevices.length > 0 ? colors.accent : colors.textTertiary }
                            ]}
                            onPress={printLogoTest}
                            disabled={connectedDevices.length === 0 || isPrinting}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="image-outline" size={20} color="#fff" />
                            <Text style={styles.printBtnText}>Probar Logo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.printBtn,
                                { flex: 1, backgroundColor: connectedDevices.length > 0 ? colors.surface : colors.textTertiary, borderWidth: 1, borderColor: colors.border }
                            ]}
                            onPress={printTestLabel}
                            disabled={connectedDevices.length === 0 || isPrinting}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="document-text-outline" size={20} color={colors.text} />
                            <Text style={[styles.printBtnText, { color: colors.text }]}>Prueba Texto</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

export default BluetoothModal;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 16 : 20,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 40 },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    content: { padding: 16, paddingBottom: 120 },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 10,
        marginTop: 16,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    deviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    deviceIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deviceInfo: { flex: 1, gap: 4 },
    deviceName: { fontSize: 16, fontWeight: '600' },
    deviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deviceRssi: { fontSize: 13 },
    signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
    signalBar: { width: 4, borderRadius: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 13, fontWeight: '600' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    typeText: { fontSize: 11, fontWeight: '600' },
    emptyCard: {
        padding: 40,
        borderRadius: 12,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: { fontSize: 15 },
    hint: { fontSize: 13, marginTop: 16, marginHorizontal: 4, textAlign: 'center' },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    printBtn: {
        flexDirection: 'row',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    printBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
