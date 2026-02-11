import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

// Estilos de botón disponibles
export type ButtonStyleId = "classic" | "minimal" | "ring" | "dot";

export interface ButtonStyle {
  id: ButtonStyleId;
  name: string;
  description: string;
}

export const BUTTON_STYLES: ButtonStyle[] = [
  { id: "classic", name: "Clásico", description: "Doble círculo" },
  { id: "minimal", name: "Minimal", description: "Círculo sólido" },
  { id: "ring", name: "Anillo", description: "Borde delgado" },
  { id: "dot", name: "Punto", description: "Pequeño y discreto" },
];

// Definición de las acciones disponibles
export interface AssistiveAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  route?: string;
  isDefault?: boolean;
}

export const AVAILABLE_ACTIONS: AssistiveAction[] = [
  {
    id: "camera",
    icon: "camera",
    label: "Cámara",
    color: "#06B6D4",
    isDefault: true,
  },
  {
    id: "refresh",
    icon: "refresh",
    label: "Refrescar",
    color: "#06D6A0",
    isDefault: true,
  },
  {
    id: "home",
    icon: "home",
    label: "Inicio",
    color: "#00B4D8",
    route: "/(main)",
    isDefault: true,
  },
  {
    id: "search",
    icon: "search",
    label: "Buscar",
    color: "#F77F00",
    route: "/(main)/catalogos/articulos",
    isDefault: true,
  },
  {
    id: "settings",
    icon: "settings",
    label: "Ajustes",
    color: "#6B7280",
    route: "/(main)/configuracion",
    isDefault: false,
  },
  {
    id: "inventory",
    icon: "cube",
    label: "Inventarios",
    color: "#3B82F6",
    route: "/(main)/inventarios",
    isDefault: false,
  },
  {
    id: "reports",
    icon: "stats-chart",
    label: "Reportes",
    color: "#10B981",
    route: "/(main)/reportes",
    isDefault: false,
  },
  {
    id: "aduana",
    icon: "swap-horizontal",
    label: "Aduana",
    color: "#8B5CF6",
    route: "/(main)/aduana",
    isDefault: false,
  },
];

interface AssistiveContextType {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  enabledActions: string[];
  setEnabledActions: (actions: string[]) => void;
  toggleAction: (actionId: string) => void;
  getEnabledActionsList: () => AssistiveAction[];
  buttonStyle: ButtonStyleId;
  setButtonStyle: (style: ButtonStyleId) => void;
  loadSettings: () => Promise<void>;
  // Trigger para activar cámara en pantallas que lo soporten
  // Retorna true si hay listeners activos, false si no hay ninguno
  triggerCamera: () => boolean;
  onCameraTrigger: (callback: () => void) => () => void;
}

const AssistiveContext = createContext<AssistiveContextType | undefined>(
  undefined,
);

const STORAGE_KEYS = {
  ENABLED: "@assistive_enabled",
  ACTIONS: "@assistive_actions",
  BUTTON_STYLE: "@assistive_button_style",
};

export function AssistiveProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [enabledActions, setEnabledActionsState] = useState<string[]>(
    AVAILABLE_ACTIONS.filter((a) => a.isDefault).map((a) => a.id),
  );
  const [buttonStyle, setButtonStyleState] = useState<ButtonStyleId>("classic");

  // Listeners para trigger de cámara
  const cameraListeners = React.useRef<Set<() => void>>(new Set());

  const triggerCamera = (): boolean => {
    if (cameraListeners.current.size === 0) {
      return false; // No hay listeners, mostrar modal global
    }
    cameraListeners.current.forEach((callback) => callback());
    return true; // Había listeners, se ejecutaron
  };

  const onCameraTrigger = (callback: () => void) => {
    cameraListeners.current.add(callback);
    // Retorna función para desuscribirse
    return () => {
      cameraListeners.current.delete(callback);
    };
  };

  const setEnabled = async (enabled: boolean) => {
    setIsEnabled(enabled);
    await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(enabled));
  };

  const setEnabledActions = async (actions: string[]) => {
    setEnabledActionsState(actions);
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions));
  };

  const setButtonStyle = async (style: ButtonStyleId) => {
    setButtonStyleState(style);
    await AsyncStorage.setItem(STORAGE_KEYS.BUTTON_STYLE, style);
  };

  const toggleAction = async (actionId: string) => {
    const newActions = enabledActions.includes(actionId)
      ? enabledActions.filter((id) => id !== actionId)
      : [...enabledActions, actionId];
    await setEnabledActions(newActions);
  };

  const getEnabledActionsList = (): AssistiveAction[] => {
    return AVAILABLE_ACTIONS.filter((action) =>
      enabledActions.includes(action.id),
    );
  };

  const loadSettings = async () => {
    try {
      const [enabledStr, actionsStr, styleStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.BUTTON_STYLE),
      ]);

      if (enabledStr !== null) setIsEnabled(JSON.parse(enabledStr));
      if (actionsStr !== null) setEnabledActionsState(JSON.parse(actionsStr));
      if (styleStr !== null) setButtonStyleState(styleStr as ButtonStyleId);
    } catch (error) {
      console.error("Error loading assistive settings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <AssistiveContext.Provider
      value={{
        isEnabled,
        setEnabled,
        enabledActions,
        setEnabledActions,
        toggleAction,
        getEnabledActionsList,
        buttonStyle,
        setButtonStyle,
        loadSettings,
        triggerCamera,
        onCameraTrigger,
      }}
    >
      {children}
    </AssistiveContext.Provider>
  );
}

export function useAssistive() {
  const context = useContext(AssistiveContext);
  if (!context) {
    throw new Error("useAssistive must be used within an AssistiveProvider");
  }
  return context;
}
