import { Audio } from "expo-av";

// Mapeo de sonidos locales
const SOUND_FILES = {
  scan: require("../assets/sounds/check.wav"), // Éxito en escaneo (+1)
  add: require("../assets/sounds/done.mp3"), // Acción completada/Finalizado
  error: require("../assets/sounds/bush.mp3"), // Error / No encontrado / Límite
  warning: require("../assets/sounds/ERROR.wav"), // Advertencia
};

export type SoundType = keyof typeof SOUND_FILES;

/**
 * Hook reutilizable para reproducir sonidos de sistema
 */
export function useSystemSounds() {
  const playSound = async (type: SoundType) => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[type], {
        shouldPlay: true,
      });

      // Limpiar recurso al terminar
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  };

  return { playSound };
}
