import { PermissionsAndroid, Platform } from 'react-native';

// Types
export interface PrinterDevice {
    id: string;
    name: string;
    rssi: number;
    isConnectable: boolean;
    device: any;
}

// Check if BLE is available (not in Expo Go)
let BleManager: any = null;
let bleManager: any = null;
let isBleAvailable = false;

try {
    const blePlx = require('react-native-ble-plx');
    BleManager = blePlx.BleManager;
    isBleAvailable = true;
} catch (error) {
    console.warn('react-native-ble-plx not available (probably running in Expo Go)');
}

export const isBleSupported = (): boolean => isBleAvailable;

export const getBleManager = (): any => {
    if (!isBleAvailable) {
        throw new Error('Bluetooth no disponible. Ejecuta: npx expo run:android');
    }
    if (!bleManager) {
        bleManager = new BleManager();
    }
    return bleManager;
};

export const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);

            const allGranted = Object.values(granted).every(
                (status) => status === PermissionsAndroid.RESULTS.GRANTED
            );

            return allGranted;
        } catch (error) {
            console.error('Error requesting Bluetooth permissions:', error);
            return false;
        }
    }
    return true;
};

export const checkBluetoothState = async (): Promise<string> => {
    if (!isBleAvailable) return 'Unsupported';
    const manager = getBleManager();
    return manager.state();
};

export const waitForBluetoothPowerOn = (): Promise<void> => {
    if (!isBleAvailable) {
        return Promise.reject(new Error('Bluetooth no disponible. Necesitas un development build.'));
    }

    const manager = getBleManager();
    return new Promise((resolve, reject) => {
        const subscription = manager.onStateChange((state: string) => {
            if (state === 'PoweredOn') {
                subscription.remove();
                resolve();
            } else if (state === 'Unsupported') {
                subscription.remove();
                reject(new Error('Bluetooth no soportado en este dispositivo'));
            }
        }, true);
    });
};

export const scanForPrinters = (
    onDeviceFound: (device: PrinterDevice) => void,
    onError: (error: Error) => void
): (() => void) => {
    if (!isBleAvailable) {
        onError(new Error('Bluetooth no disponible en Expo Go'));
        return () => { };
    }

    const manager = getBleManager();
    const foundDevices = new Set<string>();

    manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error: any, device: any) => {
            if (error) {
                onError(error);
                return;
            }

            if (device && device.name && !foundDevices.has(device.id)) {
                foundDevices.add(device.id);

                onDeviceFound({
                    id: device.id,
                    name: device.name || 'Dispositivo Desconocido',
                    rssi: device.rssi || -100,
                    isConnectable: device.isConnectable ?? true,
                    device: device,
                });
            }
        }
    );

    return () => {
        manager.stopDeviceScan();
    };
};

export const stopScan = (): void => {
    if (!isBleAvailable || !bleManager) return;
    bleManager.stopDeviceScan();
};

export const connectToDevice = async (device: any): Promise<any> => {
    if (!isBleAvailable) {
        throw new Error('Bluetooth no disponible');
    }

    try {
        const connectedDevice = await device.connect({ timeout: 10000 });
        await connectedDevice.discoverAllServicesAndCharacteristics();
        return connectedDevice;
    } catch (error) {
        throw new Error(`Error al conectar: ${(error as Error).message}`);
    }
};

export const disconnectDevice = async (device: any): Promise<void> => {
    try {
        await device.cancelConnection();
    } catch (error) {
        console.error('Error disconnecting:', error);
    }
};

export const isDeviceConnected = async (deviceId: string): Promise<boolean> => {
    if (!isBleAvailable || !bleManager) return false;
    try {
        return await bleManager.isDeviceConnected(deviceId);
    } catch {
        return false;
    }
};

// ESC/POS Commands for Ribetec RT-320PB
export const ESC_POS_COMMANDS = {
    INIT: '\x1B\x40',
    CENTER: '\x1B\x61\x01',
    LEFT: '\x1B\x61\x00',
    BOLD_ON: '\x1B\x45\x01',
    BOLD_OFF: '\x1B\x45\x00',
    DOUBLE_HEIGHT: '\x1B\x21\x10',
    NORMAL: '\x1B\x21\x00',
    CUT_PAPER: '\x1D\x56\x41',
    FEED_LINE: '\n',
    FEED_LINES: (n: number) => `\x1B\x64${String.fromCharCode(n)}`,
};

export const printTestPage = async (device: any): Promise<void> => {
    const services = await device.services();

    for (const service of services) {
        const characteristics = await service.characteristics();

        for (const char of characteristics) {
            if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
                const testData =
                    ESC_POS_COMMANDS.INIT +
                    ESC_POS_COMMANDS.CENTER +
                    ESC_POS_COMMANDS.BOLD_ON +
                    ESC_POS_COMMANDS.DOUBLE_HEIGHT +
                    'KRKN WMS' +
                    ESC_POS_COMMANDS.FEED_LINE +
                    ESC_POS_COMMANDS.NORMAL +
                    ESC_POS_COMMANDS.BOLD_OFF +
                    ESC_POS_COMMANDS.FEED_LINE +
                    'Prueba de Impresion' +
                    ESC_POS_COMMANDS.FEED_LINE +
                    '------------------------' +
                    ESC_POS_COMMANDS.FEED_LINE +
                    ESC_POS_COMMANDS.LEFT +
                    `Fecha: ${new Date().toLocaleString('es-MX')}` +
                    ESC_POS_COMMANDS.FEED_LINE +
                    'Impresora conectada OK' +
                    ESC_POS_COMMANDS.FEED_LINES(4) +
                    ESC_POS_COMMANDS.CUT_PAPER;

                const base64Data = btoa(testData);

                try {
                    await char.writeWithResponse(base64Data);
                    return;
                } catch {
                    try {
                        await char.writeWithoutResponse(base64Data);
                        return;
                    } catch (e) {
                        console.error('Failed to write:', e);
                    }
                }
            }
        }
    }

    throw new Error('No se encontró característica de escritura');
};

export const getSignalStrength = (rssi: number): 1 | 2 | 3 | 4 => {
    if (rssi > -50) return 4;
    if (rssi > -65) return 3;
    if (rssi > -80) return 2;
    return 1;
};

export const destroyBleManager = (): void => {
    if (bleManager) {
        bleManager.destroy();
        bleManager = null;
    }
};
