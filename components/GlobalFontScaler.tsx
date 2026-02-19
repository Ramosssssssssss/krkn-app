import { useTheme } from "@/context/theme-context";
import { useEffect } from "react";
import { StyleSheet } from "react-native";

const DEFAULT_FONT_SIZE = 14;

// Almacén global para el factor de escala que los parches pueden consultar
let globalUiScale = 1.0;

// ========================================================================
// PARCHE ULTRA-ROBUSTO: StyleSheet.flatten
// ========================================================================
// Casi todos los componentes (Text, TextInput, etc.) usan flatten para 
// procesar sus estilos antes de renderizar. Al interceptarlo aquí, escalamos
// todas las fuentes de la app sin importar qué componente se use.
const originalFlatten = StyleSheet.flatten;
(StyleSheet as any).flatten = function (style: any) {
  const flat = originalFlatten.call(this, style) as any;
  
  if (flat && typeof flat.fontSize === "number" && globalUiScale !== 1.0) {
    // Clonar para no mutar el objeto original de la hoja de estilos
    const scaled = { ...flat };
    
    // Escalar tamaño de fuente
    scaled.fontSize = Math.round(flat.fontSize * globalUiScale);
    
    // Escalar lineHeight si existe para mantener proporciones
    if (typeof flat.lineHeight === "number") {
      scaled.lineHeight = Math.round(flat.lineHeight * globalUiScale);
    }
    
    return scaled;
  }
  
  return flat;
};

// ========================================================================
// COMPONENTE CONTROLLER
// ========================================================================
export default function GlobalFontScaler() {
  const { uiScale } = useTheme();

  // Sincronizar el valor dinámico con el parche global
  useEffect(() => {
    globalUiScale = uiScale;
  }, [uiScale]);

  return null;
}
