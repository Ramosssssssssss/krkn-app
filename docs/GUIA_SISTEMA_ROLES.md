# Sistema de Roles y Permisos - KRKN App

## Resumen

Sistema jerárquico de 3 niveles para control de acceso a módulos de la aplicación móvil KRKN.

---

## Tipos de Usuario

| Tipo           | Código | Descripción                                                              |
| -------------- | ------ | ------------------------------------------------------------------------ |
| **SUPERADMIN** | `S`    | Creadores de KRKN. Acceso total, crea admins de clientes                 |
| **ADMIN**      | `A`    | Admin del cliente (ej: Goumam). Solo ve módulos asignados, crea usuarios |
| **USUARIO**    | `U`    | Usuario final. Solo ve lo que su admin le asignó                         |

---

## Jerarquía de Permisos

```
SUPERADMIN (KRKN)
    │
    ├── Acceso a TODOS los módulos
    ├── Crea usuarios ADMIN de clientes
    └── Asigna módulos a cada ADMIN
            │
            ▼
      ADMIN (Cliente)
            │
            ├── Solo ve módulos que SUPERADMIN le asignó
            ├── Crea usuarios tipo USUARIO
            └── Solo puede asignar módulos que él tiene
                    │
                    ▼
              USUARIO (Final)
                    │
                    └── Solo ve módulos que ADMIN le asignó
```

---

## Módulos Disponibles

| ID              | Nombre        | Descripción            |
| --------------- | ------------- | ---------------------- |
| `inventarios`   | Inventarios   | Conteos, auditorías    |
| `recibo`        | Recibo        | Recepción de mercancía |
| `acomodo`       | Acomodo       | Ubicación de productos |
| `picking`       | Picking       | Surtido de pedidos     |
| `packing`       | Packing       | Empaque de órdenes     |
| `embarques`     | Embarques     | Envío de mercancía     |
| `etiquetado`    | Etiquetado    | Impresión de etiquetas |
| `catalogos`     | Catálogos     | Gestión de artículos   |
| `configuracion` | Configuración | Ajustes de app         |

---

## Estructura de Base de Datos

### Tabla: USUARIOS (campos adicionales)

```sql
ALTER TABLE USUARIOS ADD TIPO_USUARIO CHAR(1) DEFAULT 'U';
-- 'S' = Superadmin, 'A' = Admin, 'U' = Usuario

ALTER TABLE USUARIOS ADD MODULOS_APP VARCHAR(500);
-- Lista separada por comas: 'inventarios,recibo,picking'

ALTER TABLE USUARIOS ADD CREADO_POR INTEGER;
-- ID del usuario que lo creó (jerarquía)
```

### Tabla: MODULOS_KRKN_APP (catálogo)

```sql
CREATE TABLE MODULOS_KRKN_APP (
    ID INTEGER PRIMARY KEY,
    CODIGO VARCHAR(50) NOT NULL,
    NOMBRE VARCHAR(100) NOT NULL,
    DESCRIPCION VARCHAR(255),
    ICONO VARCHAR(50),
    ORDEN INTEGER DEFAULT 0,
    ACTIVO SMALLINT DEFAULT 1
);

-- Datos iniciales
INSERT INTO MODULOS_KRKN_APP (ID, CODIGO, NOMBRE, ICONO, ORDEN) VALUES
(1, 'inventarios', 'Inventarios', 'clipboard-outline', 1),
(2, 'recibo', 'Recibo', 'download-outline', 2),
(3, 'acomodo', 'Acomodo', 'grid-outline', 3),
(4, 'picking', 'Picking', 'cart-outline', 4),
(5, 'packing', 'Packing', 'cube-outline', 5),
(6, 'embarques', 'Embarques', 'airplane-outline', 6),
(7, 'etiquetado', 'Etiquetado', 'pricetag-outline', 7),
(8, 'catalogos', 'Catálogos', 'book-outline', 8),
(9, 'configuracion', 'Configuración', 'settings-outline', 9);
```

---

## APIs Backend

### GET `/api/mis-modulos.php`

Retorna los módulos del usuario autenticado.

**Response:**

```json
{
  "success": true,
  "tipoUsuario": "A",
  "modulos": ["inventarios", "recibo", "picking"],
  "todosModulos": false,
  "puedeCrearUsuarios": true
}
```

### GET/POST `/api/gestionar-usuarios.php`

CRUD de usuarios con validación de jerarquía.

**GET** - Lista usuarios creados por el usuario actual

```json
{
  "success": true,
  "usuarios": [
    {
      "ID": 5,
      "NOMBRE": "Juan Pérez",
      "EMAIL": "juan@empresa.com",
      "TIPO_USUARIO": "U",
      "MODULOS_APP": "inventarios,picking"
    }
  ]
}
```

**POST** - Crear usuario

```json
{
  "action": "create",
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com",
  "password": "123456",
  "tipoUsuario": "U",
  "modulos": ["inventarios", "picking"]
}
```

**PUT** - Actualizar usuario

```json
{
  "action": "update",
  "userId": 5,
  "modulos": ["inventarios", "picking", "recibo"]
}
```

---

## Implementación Frontend

### PermissionsContext

```typescript
// context/permissions-context.tsx

interface PermissionsContextType {
  tipoUsuario: "S" | "A" | "U" | null;
  modulos: string[];
  loading: boolean;
  hasModuleAccess: (moduleId: string) => boolean;
  isSuperadmin: () => boolean;
  isAdmin: () => boolean;
  puedeCrearUsuarios: () => boolean;
  refreshPermissions: () => Promise<void>;
}
```

### Uso en componentes

```tsx
import { usePermissions } from "@/context/permissions-context";

function MiComponente() {
  const { hasModuleAccess, isAdmin } = usePermissions();

  // Verificar acceso a módulo
  if (!hasModuleAccess("inventarios")) {
    return <Text>Sin acceso</Text>;
  }

  // Mostrar opciones de admin
  {
    isAdmin() && <AdminOptions />;
  }
}
```

### Filtrar menú por permisos

```tsx
// En _layout.tsx del main
const { hasModuleAccess } = usePermissions();

const filteredMenuItems = menuItems.filter((item) => {
  if (!item.moduleId) return true; // Items sin módulo siempre visibles
  return hasModuleAccess(item.moduleId);
});
```

---

## Flujo de Configuración

### 1. SUPERADMIN crea Admin de cliente

1. Login como SUPERADMIN
2. Ir a Configuración → Gestión de Usuarios
3. Crear nuevo usuario tipo "Admin"
4. Seleccionar módulos que tendrá acceso
5. El cliente recibe credenciales

### 2. ADMIN crea usuarios de su empresa

1. Login como ADMIN del cliente
2. Ir a Configuración → Gestión de Usuarios
3. Solo puede crear usuarios tipo "Usuario"
4. Solo puede asignar módulos que él tiene
5. Los empleados reciben credenciales

### 3. Usuario final usa la app

1. Login con credenciales
2. Solo ve los módulos asignados
3. No puede crear usuarios
4. No ve opción de gestión

---

## Reglas de Negocio

1. **Herencia de permisos**: Un usuario solo puede asignar módulos que él posee
2. **Jerarquía estricta**: SUPERADMIN → ADMIN → USUARIO (no se puede saltar)
3. **Aislamiento**: Cada admin solo ve usuarios que él creó
4. **Sin escalamiento**: Un usuario no puede darse más permisos
5. **Configuración siempre visible**: El módulo de configuración es accesible para todos (con opciones limitadas según rol)

---

## Ejemplos de Uso

### Caso: Goumam (Cliente)

```
SUPERADMIN (KRKN)
    │
    └── Crea: admin@goumam.com (ADMIN)
              Módulos: inventarios, recibo, picking, packing
                │
                ├── Crea: almacen1@goumam.com (USUARIO)
                │         Módulos: recibo, acomodo
                │
                └── Crea: supervisor@goumam.com (USUARIO)
                          Módulos: inventarios, picking, packing
```

### Caso: Otro Cliente

```
SUPERADMIN (KRKN)
    │
    └── Crea: admin@otrocliente.com (ADMIN)
              Módulos: inventarios, etiquetado
                │
                └── Crea: operador@otrocliente.com (USUARIO)
                          Módulos: etiquetado
```

---

## Checklist de Implementación

- [ ] Ejecutar SQL para modificar tabla USUARIOS
- [ ] Crear tabla MODULOS_KRKN_APP
- [ ] Crear API mis-modulos.php
- [ ] Crear API gestionar-usuarios.php
- [ ] Crear PermissionsContext
- [ ] Integrar PermissionsProvider en \_layout.tsx
- [ ] Filtrar menú según permisos
- [ ] Crear pantalla de gestión de usuarios
- [ ] Probar flujo completo

---

## Notas de Seguridad

- Las APIs validan el JWT del usuario
- Se verifica jerarquía en backend (no solo frontend)
- Los módulos se almacenan como texto pero se validan contra catálogo
- Logs de auditoría recomendados para cambios de permisos
