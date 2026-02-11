# Resumen de cambios — 11 de Febrero 2026

## Sistema de Notificaciones Push (FCM)

- Configuración de Firebase Cloud Messaging para la app móvil
- Registro de token FCM del dispositivo al hacer login
- Endpoint backend para enviar notificaciones push
- Recepción y manejo de notificaciones en foreground/background

## Pantalla "Mis Inventarios" — Rediseño Apple

- Rediseño completo de la pantalla con estilo Apple/iPhone
- Tarjetas con información de inventarios asignados
- Diseño premium con cards agrupadas y detalles visuales

## Calendario / KPIs — Correcciones

- Múltiples fixes en componentes de calendario y KPIs del home

## Modularización de `crear-conteo.tsx`

- Archivo reducido de ~1670 líneas a ~509 líneas
- Lógica extraída en hooks y componentes reutilizables

## Sistema de Auto-guardado / Borradores (Conteo Cíclico)

- Hook genérico de borradores para guardar progreso automáticamente
- Aplicado en crear-conteo y escalado a 4 pantallas más

## Mejoras del Sidebar / Drawer Menu

- Saludo dinámico según hora del día en el header
- Fix del USERNAME en el drawer
- Reducción de ancho del drawer (280→240)
- Animación staggered FadeIn en items del menú
- Mejora visual del item activo (barra de acento izquierda + icono tintado + icono filled)
- Footer con labels
- Limpieza del squircle del header

## Animación de Toggle de Tema

- Evolución: flash simple → cortina día/noche → circular reveal optimizado
- Circular reveal final con círculo de tamaño fijo, solo animando `scale` (GPU optimizado)

## Screensaver

- Creación de screensaver con 21 tips categorizados (6 categorías)
- Crossfade cada 6 segundos con barra de progreso
- Animación de icono flotante, grid de fondo, área de logo
- Timeout de inactividad cambiado de 10s a 45s

## Pantalla de Login

- Marca de inicial a nombre completo de empresa
- Top bar con formato dominio
- Removidas mayúsculas forzadas del campo de contraseña

## Splash Screen Animado

- Splash premium negro con anillos concéntricos
- Logo con efecto shine sweep
- Letras KRKN con animación staggered
- Animación de salida tipo iris-close
- Logo agrandado (68→120px)

## Sistema de Skeleton Loaders

- Creación de `components/Skeleton.tsx` con primitivas (`Bone`, `Circle`, `ShimmerOverlay`) y presets reutilizables
- Aplicado en pantallas de **Picking** (traspasos, ventanilla, pedidos)
- Aplicado en **Packing** (lista y detalle de orden)
- Aplicado en **Inventarios** (asignados, crear conteo, modal COMEX)
- Aplicado en **Catálogos** (artículos — búsqueda y lista)
- Aplicado en **Home** (stats, chip de BD, tarjeta de sesión)
- Aplicado en **Almacenes** (skeleton de tarjetas grandes con barra de progreso)
- Aplicado en modales de catálogo (GanchoModal, QuickStockModal, QuickLocationModal)

## Rediseño Apple de Modales de Catálogo

- **GanchoModal** — Tarjetas agrupadas iOS, pill de artículo, columnas de niveles MIN/P.R./MÁX con colores
- **QuickStockModal** — Tarjeta resumen de stock total, lista agrupada con indicadores de punto de color
- **QuickLocationModal** — Filas de ubicación editables, icono púrpura, modo edición inline, animación Lottie de éxito

## Corrección de Bugs

- **Artículos búsqueda** — Fix de race condition en `finally` block, fix de `handleFilterClick` duplicando fetch
- **Avatar no se actualizaba en toda la app** — Fix en `updateUser()` del auth-context usando functional updater para evitar stale closure
