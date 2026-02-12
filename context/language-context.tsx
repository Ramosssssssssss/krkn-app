import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const LANGUAGE_STORAGE_KEY = "@krkn_language";

// Traducciones
const translations: Record<Language, Record<string, string>> = {
  es: {
    // General
    "app.name": "KRKN WMS",
    "general.save": "Guardar",
    "general.cancel": "Cancelar",
    "general.delete": "Eliminar",
    "general.edit": "Editar",
    "general.search": "Buscar",
    "general.loading": "Cargando...",
    "general.error": "Error",
    "general.success": "Éxito",
    "general.confirm": "Confirmar",
    "general.back": "Volver",
    "general.next": "Siguiente",
    "general.done": "Listo",
    "general.close": "Cerrar",
    "general.yes": "Sí",
    "general.no": "No",
    "general.ok": "OK",
    "general.saveChanges": "Guardar cambios",
    "general.saving": "Guardando...",

    // Navigation / Sidebar
    "nav.home": "Inicio",
    "nav.inventory": "Inventarios",
    "nav.catalogs": "Catálogos",
    "nav.control": "Control",

    "nav.planeacion": "Planeación",
    "nav.processes": "Procesos",
    "nav.boards": "Tableros",
    "nav.customs": "Aduana",
    "nav.kpis": "KPIs",
    "nav.reports": "Reportes",
    "nav.bulk": "Masivos",
    "nav.audit": "Auditoría",
    "nav.apps": "Aplicaciones",
    "nav.integrations": "Integración",
    "nav.chats": "Chats",
    "nav.settings": "Configuración",
    "nav.logout": "Cerrar sesión",
    "nav.new_section": "NUEVO 🔥",
    "nav.pos": "Punto de Venta (POS)",

    // Settings
    "settings.title": "Configuración",
    "settings.profile": "Mi Perfil",
    "settings.profileDesc": "Nombre, foto, información personal",
    "settings.account": "Cuenta Empresarial",
    "settings.security": "Seguridad",
    "settings.securityDesc": "Contraseña, autenticación",
    "settings.darkMode": "Modo Oscuro",
    "settings.darkModeDesc": "Cambiar apariencia de la app",
    "settings.appearance": "Apariencia",
    "settings.appearanceDesc": "Tema, colores, fuentes",
    "settings.notifications": "Notificaciones",
    "settings.notificationsDesc": "Alertas, sonidos, badges",
    "settings.language": "Idioma",
    "settings.languageDesc": "Español (México)",
    "settings.languageDescEn": "English (US)",
    "settings.warehouse": "Almacén Predeterminado",
    "settings.printer": "Impresora",
    "settings.printerDesc": "Configurar impresoras de etiquetas",
    "settings.scanner": "Escáner",
    "settings.scannerDesc": "Configurar lectores de códigos",
    "settings.about": "Acerca de",
    "settings.aboutDesc": "Versión, términos, soporte",
    "settings.editProfile": "Editar perfil",

    // Settings sections
    "settings.section.account": "CUENTA",
    "settings.section.preferences": "PREFERENCIAS",
    "settings.section.warehouse": "ALMACÉN",
    "settings.section.info": "INFORMACIÓN",

    // Language screen
    "language.title": "Idioma",
    "language.select": "Selecciona tu idioma",
    "language.selectDesc": "La app se mostrará en el idioma seleccionado",
    "language.note":
      "Algunos elementos pueden permanecer en el idioma original del sistema.",
    "language.saved": "¡Guardado!",
    "language.savedDesc": "El idioma se ha actualizado correctamente.",
    "language.spanish": "Español",
    "language.english": "English",

    // Appearance
    "appearance.title": "Apariencia",
    "appearance.mode": "MODO",
    "appearance.light": "Claro",
    "appearance.dark": "Oscuro",
    "appearance.colorTheme": "TEMA DE COLOR",
    "appearance.preview": "VISTA PREVIA",

    // Auth
    "auth.companyCode": "Código de empresa",
    "auth.enterCode": "Ingresa el código de tu empresa",
    "auth.continue": "Continuar",
    "auth.login": "Iniciar sesión",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.forgotPassword": "¿Olvidaste tu contraseña?",
    "auth.noAccount": "¿No tienes cuenta?",
    "auth.contactUs": "Contáctanos",

    // Inventory Module
    "inventory.title": "Inventarios",
    "inventory.subtitle": "Gestiona el flujo de mercancía",
    "inventory.entries": "Entradas",
    "inventory.entriesSubtitle": "Ingresos de mercancía",
    "inventory.newEntry": "Nueva Entrada",
    "inventory.createEntry": "Crear entrada",
    "inventory.exits": "Salidas",
    "inventory.exitsSubtitle": "Egresos de mercancía",
    "inventory.newExit": "Nueva Salida",
    "inventory.createExit": "Crear salida",
    "inventory.reception": "Recepción",
    "inventory.receptionSubtitle": "Recibir mercancía",
    "inventory.newReception": "Nueva recepción",
    "inventory.receptions": "Recepciones",
    "inventory.transfers": "Traspasos",
    "inventory.adjustments": "Ajustes",
    "inventory.history": "Historial",
    "inventory.scanArticle": "Escanear artículo",
    "inventory.waitingScan": "Esperando escaneo...",
    "inventory.searchArticle": "Buscar artículo...",
    "inventory.articles": "Artículos",
    "inventory.units": "Unidades",
    "inventory.products": "Productos",
    "inventory.categories": "Categorías",
    "inventory.warehouses": "Almacenes",
    "inventory.movements": "Movimientos",
    "inventory.movementsSubtitle": "Historial de movimientos",
    "inventory.today": "hoy",
    "inventory.pending": "Pendientes",
    "inventory.companies": "EMPRESAS",

    // Counting
    "inventory.counting": "CONTEO",
    "inventory.totalCount": "Conteo Cíclico",
    "inventory.totalCountSubtitle": "Inventario completo",
    "inventory.ciderComex": "CIDER - COMEX",
    "inventory.ciderComexSubtitle": "Comercio exterior",
    "inventory.physicalCount": "Conteo Físico",
    "inventory.physicalCountSubtitle": "Verificación manual",
    "inventory.locationCount": "Conteo por Ubicación",
    "inventory.locationCountSubtitle": "Por almacén/rack",
    "inventory.start": "Iniciar",

    // Validations
    "inventory.validations": "VALIDACIONES",
    "inventory.applyInventory": "Aplicar Inventario",
    "inventory.applyInventorySubtitle": "Confirmar cambios",
    "inventory.inventoryMap": "Mapa de Inventario",
    "inventory.inventoryMapSubtitle": "Vista general",
    "inventory.go": "Ir",

    // Home screen
    "home.activeSession": "SESIÓN ACTIVA",
    "home.database": "Base de datos",
    "home.server": "Servidor",
    "home.company": "Empresa",
    "home.user": "Usuario",
    "home.instance": "Instancia",
    "home.date": "Fecha",
    "home.time": "Hora",
    "home.role": "Rol",
    "home.administrator": "Administrador",
    "home.configuration": "CONFIGURACIÓN",
    "home.quickActions": "ACCIONES RÁPIDAS",
    "home.receiveProduct": "Recibir producto",
    "home.registerEntry": "Registrar entrada",
    "home.registerExit": "Registrar salida",
    "home.inventoryCount": "Conteo inventario",
    "home.changeDatabase": "Cambiar Base de Datos",
    "home.selectDatabase": "Seleccionar base de datos",
    "home.production": "Producción",
    "home.development": "Desarrollo",
    "home.testing": "Pruebas",

    // Catalogs
    "catalogs.title": "Catálogos",
    "catalogs.subtitle": "Consulta información del sistema",
    "catalogs.section": "CATÁLOGOS",
    "catalogs.warehouses": "Almacenes",
    "catalogs.warehousesActive": "activos",
    "catalogs.articles": "Artículos",
    "catalogs.articlesRegistered": "registrados",
    "catalogs.search": "Buscar",
    "catalogs.searchWarehouses": "Buscar almacenes",
    "catalogs.searchArticles": "Buscar artículos",
    "catalogs.complements": "COMPLEMENTOS",
    "catalogs.prices": "Precios",
    "catalogs.pricesSubtitle": "Gestión de precios",
    "catalogs.lines": "Líneas",
    "catalogs.linesSubtitle": "Líneas de productos",
    "catalogs.lineGroups": "Grupo de Líneas",
    "catalogs.lineGroupsSubtitle": "Agrupación de líneas",
    "catalogs.brands": "Marcas",
    "catalogs.brandsSubtitle": "Catálogo de marcas",
    "catalogs.classifiers": "Clasificadores",
    "catalogs.classifiersSubtitle": "Clasificadores de productos",

    // Processes
    "processes.title": "Procesos",
    "processes.subtitle": "Operaciones de almacén",
    "processes.section": "PROCESOS",
    "processes.active": "Activos",
    "processes.pending": "Pendientes",
    "processes.receipt": "RECIBO",
    "processes.receiptTitle": "Recibo",
    "processes.receiptSubtitle": "Recepción de mercancía",
    "processes.arrangement": "ACOMODO",
    "processes.arrangementTitle": "Acomodo",
    "processes.arrangementSubtitle": "Ubicación de productos",
    "processes.packing": "PACKING",
    "processes.packingTitle": "Packing",
    "processes.packingSubtitle": "Empaque de pedidos",
    "processes.picking": "PICKING",
    "processes.pickingTitle": "Picking",
    "processes.pickingSubtitle": "Surtido de pedidos",
    "processes.shipments": "EMBARQUES",
    "processes.shipmentsTitle": "Embarques",
    "processes.shipmentsSubtitle": "Salida de mercancía",

    // Alerts
    "alert.logoutTitle": "¿Cerrar sesión?",
    "alert.logoutMessage": "¿Estás seguro que deseas cerrar sesión?",
    "alert.deleteTitle": "¿Eliminar?",
    "alert.deleteMessage": "¿Estás seguro que deseas eliminar este elemento?",
  },
  en: {
    // General
    "app.name": "KRKN WMS",
    "general.save": "Save",
    "general.cancel": "Cancel",
    "general.delete": "Delete",
    "general.edit": "Edit",
    "general.search": "Search",
    "general.loading": "Loading...",
    "general.error": "Error",
    "general.success": "Success",
    "general.confirm": "Confirm",
    "general.back": "Back",
    "general.next": "Next",
    "general.done": "Done",
    "general.close": "Close",
    "general.yes": "Yes",
    "general.no": "No",
    "general.ok": "OK",
    "general.saveChanges": "Save changes",
    "general.saving": "Saving...",

    // Navigation / Sidebar
    "nav.home": "Home",
    "nav.inventory": "Inventory",
    "nav.catalogs": "Catalogs",
    "nav.processes": "Processes",
    "nav.boards": "Boards",
    "nav.customs": "Customs",
    "nav.kpis": "KPIs",
    "nav.reports": "Reports",
    "nav.bulk": "Bulk Operations",
    "nav.audit": "Audit",
    "nav.apps": "Applications",
    "nav.integrations": "Integrations",
    "nav.chats": "Chats",
    "nav.settings": "Settings",
    "nav.logout": "Log out",
    "nav.new_section": "NEW 🔥",
    "nav.pos": "Point of Sale (POS)",

    // Settings
    "settings.title": "Settings",
    "settings.profile": "My Profile",
    "settings.profileDesc": "Name, photo, personal info",
    "settings.account": "Business Account",
    "settings.security": "Security",
    "settings.securityDesc": "Password, authentication",
    "settings.darkMode": "Dark Mode",
    "settings.darkModeDesc": "Change app appearance",
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Theme, colors, fonts",
    "settings.notifications": "Notifications",
    "settings.notificationsDesc": "Alerts, sounds, badges",
    "settings.language": "Language",
    "settings.languageDesc": "Español (México)",
    "settings.languageDescEn": "English (US)",
    "settings.warehouse": "Default Warehouse",
    "settings.printer": "Printer",
    "settings.printerDesc": "Configure label printers",
    "settings.scanner": "Scanner",
    "settings.scannerDesc": "Configure barcode readers",
    "settings.about": "About",
    "settings.aboutDesc": "Version, terms, support",
    "settings.editProfile": "Edit profile",

    // Settings sections
    "settings.section.account": "ACCOUNT",
    "settings.section.preferences": "PREFERENCES",
    "settings.section.warehouse": "WAREHOUSE",
    "settings.section.info": "INFORMATION",

    // Language screen
    "language.title": "Language",
    "language.select": "Select your language",
    "language.selectDesc": "The app will be displayed in the selected language",
    "language.note":
      "Some elements may remain in the original system language.",
    "language.saved": "Saved!",
    "language.savedDesc": "Language has been updated successfully.",
    "language.spanish": "Español",
    "language.english": "English",

    // Appearance
    "appearance.title": "Appearance",
    "appearance.mode": "MODE",
    "appearance.light": "Light",
    "appearance.dark": "Dark",
    "appearance.colorTheme": "COLOR THEME",
    "appearance.preview": "PREVIEW",

    // Auth
    "auth.companyCode": "Company code",
    "auth.enterCode": "Enter your company code",
    "auth.continue": "Continue",
    "auth.login": "Log in",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password?",
    "auth.noAccount": "Don't have an account?",
    "auth.contactUs": "Contact us",

    // Inventory Module
    "inventory.title": "Inventory",
    "inventory.subtitle": "Manage merchandise flow",
    "inventory.entries": "Entries",
    "inventory.entriesSubtitle": "Merchandise income",
    "inventory.newEntry": "New Entry",
    "inventory.createEntry": "Create entry",
    "inventory.exits": "Exits",
    "inventory.exitsSubtitle": "Merchandise output",
    "inventory.newExit": "New Exit",
    "inventory.createExit": "Create exit",
    "inventory.reception": "Reception",
    "inventory.receptionSubtitle": "Receive merchandise",
    "inventory.newReception": "New reception",
    "inventory.receptions": "Receptions",
    "inventory.transfers": "Transfers",
    "inventory.adjustments": "Adjustments",
    "inventory.history": "History",
    "inventory.scanArticle": "Scan article",
    "inventory.waitingScan": "Waiting for scan...",
    "inventory.searchArticle": "Search article...",
    "inventory.articles": "Articles",
    "inventory.units": "Units",
    "inventory.products": "Products",
    "inventory.categories": "Categories",
    "inventory.warehouses": "Warehouses",
    "inventory.movements": "Movements",
    "inventory.movementsSubtitle": "Movement history",
    "inventory.today": "today",
    "inventory.pending": "Pending",
    "inventory.companies": "COMPANIES",

    // Counting
    "inventory.counting": "COUNTING",
    "inventory.totalCount": "Total Count",
    "inventory.totalCountSubtitle": "Full inventory",
    "inventory.ciderComex": "CIDER - COMEX",
    "inventory.ciderComexSubtitle": "Foreign trade",
    "inventory.physicalCount": "Physical Count",
    "inventory.physicalCountSubtitle": "Manual verification",
    "inventory.locationCount": "Location Count",
    "inventory.locationCountSubtitle": "By warehouse/rack",
    "inventory.start": "Start",

    // Validations
    "inventory.validations": "VALIDATIONS",
    "inventory.applyInventory": "Apply Inventory",
    "inventory.applyInventorySubtitle": "Confirm changes",
    "inventory.inventoryMap": "Inventory Map",
    "inventory.inventoryMapSubtitle": "General view",
    "inventory.go": "Go",

    // Home screen
    "home.activeSession": "ACTIVE SESSION",
    "home.database": "Database",
    "home.server": "Server",
    "home.company": "Company",
    "home.user": "User",
    "home.instance": "Instance",
    "home.date": "Date",
    "home.time": "Time",
    "home.role": "Role",
    "home.administrator": "Administrator",
    "home.configuration": "CONFIGURATION",
    "home.quickActions": "QUICK ACTIONS",
    "home.receiveProduct": "Receive product",
    "home.registerEntry": "Register entry",
    "home.registerExit": "Register exit",
    "home.inventoryCount": "Inventory count",
    "home.changeDatabase": "Change Database",
    "home.selectDatabase": "Select database",
    "home.production": "Production",
    "home.development": "Development",
    "home.testing": "Testing",

    // Catalogs
    "catalogs.title": "Catalogs",
    "catalogs.subtitle": "Browse system information",
    "catalogs.section": "CATALOGS",
    "catalogs.warehouses": "Warehouses",
    "catalogs.warehousesActive": "active",
    "catalogs.articles": "Articles",
    "catalogs.articlesRegistered": "registered",
    "catalogs.search": "Search",
    "catalogs.searchWarehouses": "Search warehouses",
    "catalogs.searchArticles": "Search articles",
    "catalogs.complements": "COMPLEMENTS",
    "catalogs.prices": "Prices",
    "catalogs.pricesSubtitle": "Price management",
    "catalogs.lines": "Lines",
    "catalogs.linesSubtitle": "Product lines",
    "catalogs.lineGroups": "Line Groups",
    "catalogs.lineGroupsSubtitle": "Line groupings",
    "catalogs.brands": "Brands",
    "catalogs.brandsSubtitle": "Brand catalog",
    "catalogs.classifiers": "Classifiers",
    "catalogs.classifiersSubtitle": "Product classifiers",

    // Processes
    "processes.title": "Processes",
    "processes.subtitle": "Warehouse operations",
    "processes.section": "PROCESSES",
    "processes.active": "Active",
    "processes.pending": "Pending",
    "processes.receipt": "RECEIPT",
    "processes.receiptTitle": "Receipt",
    "processes.receiptSubtitle": "Merchandise reception",
    "processes.arrangement": "ARRANGEMENT",
    "processes.arrangementTitle": "Arrangement",
    "processes.arrangementSubtitle": "Product placement",
    "processes.packing": "PACKING",
    "processes.packingTitle": "Packing",
    "processes.packingSubtitle": "Order packaging",
    "processes.picking": "PICKING",
    "processes.pickingTitle": "Picking",
    "processes.pickingSubtitle": "Order fulfillment",
    "processes.shipments": "SHIPMENTS",
    "processes.shipmentsTitle": "Shipments",
    "processes.shipmentsSubtitle": "Outgoing merchandise",

    // Alerts
    "alert.logoutTitle": "Log out?",
    "alert.logoutMessage": "Are you sure you want to log out?",
    "alert.deleteTitle": "Delete?",
    "alert.deleteMessage": "Are you sure you want to delete this item?",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && (saved === "es" || saved === "en")) {
        setLanguageState(saved);
      }
    } catch (error) {
      console.log("Error loading language:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.log("Error saving language:", error);
    }
  };

  const t = useCallback(
    (key: string): string => {
      return translations[language][key] || key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Hook para obtener solo la función de traducción (más conveniente)
export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}
