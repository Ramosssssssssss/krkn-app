/**
 * GlobalFontScaler — Aplica el uiScale del contexto de tema
 * a TODOS los componentes Text del app.
 *
 * Se monta una vez en el root layout y escala todas las fuentes
 * automáticamente sin necesidad de modificar cada pantalla.
 *
 * NOTA: Solo se patchea Text, NO TextInput.
 * TextInput pierde foco si se monkey-patchea su render.
 */
import { useTheme } from "@/context/theme-context";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";

const DEFAULT_FONT_SIZE = 14;

export default function GlobalFontScaler() {
  const { uiScale } = useTheme();

  useEffect(() => {
    // --- Text solamente ---
    if (!(Text as any).__origRender) {
      (Text as any).__origRender = (Text as any).render;
    }
    const origText = (Text as any).__origRender;

    if (origText) {
      (Text as any).render = function (props: any, ref: any) {
        if (uiScale === 1.0) {
          return origText.call(this, props, ref);
        }

        const flat = StyleSheet.flatten(props.style) || {};
        const baseFontSize = flat.fontSize ?? DEFAULT_FONT_SIZE;
        const scaledFontSize = Math.round(baseFontSize * uiScale);

        return origText.call(
          this,
          {
            ...props,
            style: [props.style, { fontSize: scaledFontSize }],
          },
          ref,
        );
      };
    }
  }, [uiScale]);

  return null;
}
