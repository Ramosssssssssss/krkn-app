import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ImageSourcePropType,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ProfileField {
  key: string;
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  editable?: boolean;
}

// Avatares disponibles
const AVATARS: { id: string; source: ImageSourcePropType }[] = [
  { id: "a1", source: require("@/assets/images/a1.png") },
  { id: "a2", source: require("@/assets/images/a2.png") },
  { id: "a3", source: require("@/assets/images/a3.png") },
  { id: "a4", source: require("@/assets/images/a4.png") },
  { id: "a5", source: require("@/assets/images/a5.png") },
  { id: "a6", source: require("@/assets/images/a6.png") },
];

export default function PerfilScreen() {
  const colors = useThemeColors();
  const { user, companyCode, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [fields, setFields] = useState<ProfileField[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState({
    title: "",
    subtitle: "",
  });

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  // Forgot password — supervisor override
  const [forgotMode, setForgotMode] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState("");

  // Auto-cerrar modal de éxito después de 1.5 segundos
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Inicializar avatar desde AVATAR_URL del usuario
  useEffect(() => {
    if (user?.AVATAR_URL) {
      if (user.AVATAR_URL.startsWith("avatar:")) {
        // Es un avatar predefinido (ej: "avatar:a1")
        const avatarId = user.AVATAR_URL.replace("avatar:", "");
        setSelectedAvatar(avatarId);
      } else if (
        user.AVATAR_URL.startsWith("http") ||
        user.AVATAR_URL.startsWith("file:")
      ) {
        // Es una imagen personalizada
        setCustomImage(user.AVATAR_URL);
      }
    }
  }, [user?.AVATAR_URL]);

  // Sincronizar campos cuando el user esté disponible
  useEffect(() => {
    if (user) {
      setFields([
        {
          key: "nombre",
          label: "Nombre",
          value: user.NOMBRE || "",
          placeholder: "Tu nombre",
          editable: true,
        },
        {
          key: "apellidoPaterno",
          label: "Apellido Paterno",
          value: user.APELLIDO_PATERNO || "",
          placeholder: "Apellido paterno",
          editable: true,
        },
        {
          key: "apellidoMaterno",
          label: "Apellido Materno",
          value: user.APELLIDO_MATERNO || "",
          placeholder: "Apellido materno",
          editable: true,
        },
        {
          key: "email",
          label: "Correo",
          value: user.EMAIL || "",
          placeholder: "tu@email.com",
          keyboardType: "email-address",
          editable: true,
        },
        {
          key: "telefono",
          label: "Teléfono",
          value: user.TELEFONO || "",
          placeholder: "+52 123 456 7890",
          keyboardType: "phone-pad",
          editable: true,
        },
        {
          key: "codigo",
          label: "Código",
          value: user.CODIGO || "",
          placeholder: "Código de usuario",
          editable: false,
        },
        {
          key: "username",
          label: "Usuario",
          value: user.USERNAME || "",
          placeholder: "usuario",
          editable: false,
        },
      ]);
    }
  }, [user]);

  const updateField = (key: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  };

  const getInitials = () => {
    const nombre = user?.NOMBRE || "U";
    const apellido = user?.APELLIDO_PATERNO || "";
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const fullName = user
    ? `${user.NOMBRE} ${user.APELLIDO_PATERNO}`.trim()
    : "Usuario";

  // Tomar foto con cámara
  const takePhoto = async () => {
    setShowPhotoOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Se necesita permiso para acceder a la cámara");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCustomImage(result.assets[0].uri);
      setSelectedAvatar(null);
    }
  };

  // Seleccionar de galería
  const pickFromGallery = async () => {
    setShowPhotoOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Se necesita permiso para acceder a la galería");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCustomImage(result.assets[0].uri);
      setSelectedAvatar(null);
    }
  };

  // Abrir selector de avatares
  const openAvatarPicker = () => {
    setShowPhotoOptions(false);
    setShowAvatarPicker(true);
  };

  // Guardar foto de perfil (avatar)
  const saveAvatar = async (avatarUrl: string) => {
    if (!user || !companyCode) return false;

    try {
      const response = await fetch(
        "https://app.krkn.mx/api/actualizar-foto-perfil.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyCode,
            usuarioId: user.USUARIO_ID,
            avatarUrl,
          }),
        },
      );

      const data = await response.json();
      if (data.ok) {
        await updateUser({ AVATAR_URL: data.avatarUrl });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al guardar avatar:", error);
      return false;
    }
  };

  // Guardar datos del perfil (nombre, apellidos, email, teléfono)
  const saveProfileData = async () => {
    if (!user || !companyCode) return false;

    const nombre = fields.find((f) => f.key === "nombre")?.value || "";
    const apellidoPaterno =
      fields.find((f) => f.key === "apellidoPaterno")?.value || "";
    const apellidoMaterno =
      fields.find((f) => f.key === "apellidoMaterno")?.value || "";
    const email = fields.find((f) => f.key === "email")?.value || "";
    const telefono = fields.find((f) => f.key === "telefono")?.value || "";

    try {
      const response = await fetch(
        "https://app.krkn.mx/api/actualizar-perfil.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyCode,
            usuarioId: user.USUARIO_ID,
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            email,
            telefono,
          }),
        },
      );

      const data = await response.json();
      if (data.ok) {
        await updateUser({
          NOMBRE: data.user.NOMBRE,
          APELLIDO_PATERNO: data.user.APELLIDO_PATERNO,
          APELLIDO_MATERNO: data.user.APELLIDO_MATERNO,
          EMAIL: data.user.EMAIL,
          TELEFONO: data.user.TELEFONO,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      return false;
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    setPasswordError("");

    // Modo supervisor (olvidé mi contraseña)
    if (forgotMode) {
      if (!supervisorPin.trim()) {
        setPasswordError("Ingresa el PIN del supervisor");
        return;
      }
      if (newPassword.length < 4) {
        setPasswordError(
          "La nueva contraseña debe tener al menos 4 caracteres",
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("Las contraseñas no coinciden");
        return;
      }

      setIsSavingPassword(true);
      try {
        const response = await fetch(
          "https://app.krkn.mx/api/cambiar-password.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyCode,
              usuarioId: user?.USUARIO_ID,
              supervisorPin: supervisorPin,
              newPassword: newPassword,
            }),
          },
        );
        const data = await response.json();
        if (data.ok) {
          setShowPasswordModal(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSupervisorPin("");
          setForgotMode(false);
          setSuccessMessage({
            title: "¡Contraseña Actualizada!",
            subtitle:
              "Tu contraseña ha sido cambiada por autorización de supervisor.",
          });
          setShowSuccessModal(true);
        } else {
          setPasswordError(data.message || "Error al cambiar la contraseña");
        }
      } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        setPasswordError("Error de conexión. Intenta de nuevo.");
      } finally {
        setIsSavingPassword(false);
      }
      return;
    }

    // Modo normal (con contraseña actual)
    if (!currentPassword.trim()) {
      setPasswordError("Ingresa tu contraseña actual");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("La nueva contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("La nueva contraseña debe ser diferente");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch(
        "https://app.krkn.mx/api/cambiar-password.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyCode,
            usuarioId: user?.USUARIO_ID,
            currentPassword: currentPassword,
            newPassword: newPassword,
          }),
        },
      );
      const data = await response.json();
      if (data.ok) {
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage({
          title: "¡Contraseña Actualizada!",
          subtitle: "Tu contraseña ha sido cambiada correctamente.",
        });
        setShowSuccessModal(true);
      } else {
        setPasswordError(data.message || "Error al cambiar la contraseña");
      }
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      setPasswordError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Guardar todo (perfil + avatar si cambió)
  const saveProfile = async () => {
    if (!user || !companyCode) return;

    setIsSaving(true);
    try {
      let success = true;
      let avatarChanged = false;

      // Determinar si el avatar cambió
      let newAvatarUrl = "";
      if (selectedAvatar) {
        newAvatarUrl = `avatar:${selectedAvatar}`;
        avatarChanged = user.AVATAR_URL !== newAvatarUrl;
      } else if (customImage) {
        newAvatarUrl = customImage;
        avatarChanged = user.AVATAR_URL !== newAvatarUrl;
      }

      // Guardar avatar si cambió
      if (avatarChanged && newAvatarUrl) {
        const avatarSuccess = await saveAvatar(newAvatarUrl);
        if (!avatarSuccess) success = false;
      }

      // Guardar datos del perfil
      const profileSuccess = await saveProfileData();
      if (!profileSuccess) success = false;

      if (success) {
        setSuccessMessage({
          title: "¡Perfil Guardado!",
          subtitle: "Tus cambios han sido guardados correctamente.",
        });
        setShowSuccessModal(true);
        setIsEditing(false);
      } else {
        setSuccessMessage({
          title: "Error",
          subtitle: "No se pudieron guardar todos los cambios.",
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      setSuccessMessage({
        title: "Error",
        subtitle: "Hubo un problema al guardar los cambios.",
      });
      setShowSuccessModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header con botón atrás */}
      <View
        style={[
          styles.navHeader,
          { borderBottomColor: colors.border, paddingTop: insets.top + 8 },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isEditing) {
              // Cancelar edición - restaurar valores originales
              if (user) {
                setFields([
                  {
                    key: "nombre",
                    label: "Nombre",
                    value: user.NOMBRE || "",
                    placeholder: "Tu nombre",
                    editable: true,
                  },
                  {
                    key: "apellidoPaterno",
                    label: "Apellido Paterno",
                    value: user.APELLIDO_PATERNO || "",
                    placeholder: "Apellido paterno",
                    editable: true,
                  },
                  {
                    key: "apellidoMaterno",
                    label: "Apellido Materno",
                    value: user.APELLIDO_MATERNO || "",
                    placeholder: "Apellido materno",
                    editable: true,
                  },
                  {
                    key: "email",
                    label: "Correo",
                    value: user.EMAIL || "",
                    placeholder: "tu@email.com",
                    keyboardType: "email-address",
                    editable: true,
                  },
                  {
                    key: "telefono",
                    label: "Teléfono",
                    value: user.TELEFONO || "",
                    placeholder: "+52 123 456 7890",
                    keyboardType: "phone-pad",
                    editable: true,
                  },
                  {
                    key: "codigo",
                    label: "Código",
                    value: user.CODIGO || "",
                    placeholder: "Código de usuario",
                    editable: false,
                  },
                  {
                    key: "username",
                    label: "Usuario",
                    value: user.USERNAME || "",
                    placeholder: "usuario",
                    editable: false,
                  },
                ]);
              }
              setIsEditing(false);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent }]}>
            {isEditing ? "Cancelar" : "Atrás"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          {isEditing ? "Editar Perfil" : "Mi Perfil"}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
          activeOpacity={0.7}
        >
          <Text style={[styles.editButtonText, { color: colors.accent }]}>
            {isEditing ? "" : "Editar"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header con Avatar - Estilo Apple */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (isEditing) {
                  setShowPhotoOptions(true);
                } else {
                  setShowImagePreview(true);
                }
              }}
            >
              <LinearGradient
                colors={[colors.accent, `${colors.accent}80`]}
                style={styles.avatarGradient}
              >
                {customImage ? (
                  <Image
                    source={{ uri: customImage }}
                    style={styles.avatarImage}
                  />
                ) : selectedAvatar ? (
                  <Image
                    source={
                      AVATARS.find((a) => a.id === selectedAvatar)?.source
                    }
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{getInitials()}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                style={[
                  styles.editAvatarButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setShowPhotoOptions(true)}
              >
                <Ionicons name="camera" size={16} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>
            {fullName}
          </Text>
          <Text style={[styles.userRole, { color: colors.textSecondary }]}>
            {user?.EMAIL || "Sin correo"}
          </Text>
        </View>

        {/* Campos agrupados - Estilo Apple Settings */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            INFORMACIÓN PERSONAL
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {fields.slice(0, 3).map((field, index) => (
              <View key={field.key}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {field.label}
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        color:
                          isEditing && field.editable
                            ? colors.text
                            : colors.textSecondary,
                      },
                    ]}
                    value={field.value}
                    onChangeText={(text) => updateField(field.key, text)}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textTertiary}
                    editable={isEditing && field.editable}
                    textAlign="right"
                  />
                </View>
                {index < 2 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CONTACTO
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {fields.slice(3, 5).map((field, index) => (
              <View key={field.key}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {field.label}
                  </Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      {
                        color:
                          isEditing && field.editable
                            ? colors.text
                            : colors.textSecondary,
                      },
                    ]}
                    value={field.value}
                    onChangeText={(text) => updateField(field.key, text)}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType={field.keyboardType || "default"}
                    editable={isEditing && field.editable}
                    textAlign="right"
                  />
                </View>
                {index < 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CUENTA
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {fields.slice(5).map((field, index, arr) => (
              <View key={field.key}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {field.label}
                  </Text>
                  <View style={styles.fieldValueContainer}>
                    <Text
                      style={[
                        styles.fieldValue,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {field.value}
                    </Text>
                    {!field.editable && (
                      <Ionicons
                        name="lock-closed"
                        size={14}
                        color={colors.textTertiary}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </View>
                {index < arr.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Botón guardar - solo visible en modo edición */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.accent },
              isSaving && styles.saveButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={saveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Botón cambiar contraseña */}
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError("");
            setShowCurrentPw(false);
            setShowNewPw(false);
            setForgotMode(false);
            setSupervisorPin("");
            setShowPasswordModal(true);
          }}
        >
          <Ionicons name="key-outline" size={18} color={colors.accent} />
          <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
            Cambiar Contraseña
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de vista previa de imagen */}
      <Modal
        visible={showImagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <TouchableOpacity
          style={styles.imagePreviewOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePreview(false)}
        >
          <View style={styles.imagePreviewContainer}>
            {customImage ? (
              <Image
                source={{ uri: customImage }}
                style={styles.imagePreviewFull}
                resizeMode="contain"
              />
            ) : selectedAvatar ? (
              <Image
                source={AVATARS.find((a) => a.id === selectedAvatar)?.source}
                style={styles.imagePreviewFull}
                resizeMode="contain"
              />
            ) : (
              <LinearGradient
                colors={[colors.accent, `${colors.accent}80`]}
                style={styles.imagePreviewPlaceholder}
              >
                <Text style={styles.imagePreviewInitials}>{getInitials()}</Text>
              </LinearGradient>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.imagePreviewClose,
              { backgroundColor: colors.surface },
            ]}
            onPress={() => setShowImagePreview(false)}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de éxito estilo iPhone */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View
            style={[
              styles.successModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Icono de éxito o error */}
            <View
              style={[
                styles.successIconContainer,
                {
                  backgroundColor:
                    successMessage.title === "Error"
                      ? "#FF3B30"
                      : colors.accent,
                },
              ]}
            >
              <Ionicons
                name={successMessage.title === "Error" ? "close" : "checkmark"}
                size={40}
                color="#FFF"
              />
            </View>

            {/* Título */}
            <Text style={[styles.successTitle, { color: colors.text }]}>
              {successMessage.title}
            </Text>

            {/* Subtítulo */}
            <Text
              style={[styles.successSubtitle, { color: colors.textSecondary }]}
            >
              {successMessage.subtitle}
            </Text>

            {/* Botón */}
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de opciones de foto */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity
          style={styles.avatarModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View
            style={[
              styles.photoOptionsContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.avatarModalTitle, { color: colors.text }]}>
              Cambiar foto de perfil
            </Text>

            <TouchableOpacity
              style={[
                styles.photoOptionItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={24} color={colors.accent} />
              <Text style={[styles.photoOptionText, { color: colors.text }]}>
                Tomar foto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.photoOptionItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={24} color={colors.accent} />
              <Text style={[styles.photoOptionText, { color: colors.text }]}>
                Elegir de galería
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoOptionItem}
              onPress={openAvatarPicker}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={24} color={colors.accent} />
              <Text style={[styles.photoOptionText, { color: colors.text }]}>
                Usar avatar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.avatarModalCancel,
                { borderTopColor: colors.border },
              ]}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text
                style={[
                  styles.avatarModalCancelText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de cambio de contraseña */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.pwOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.pwScrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.pwCard, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View
                style={[styles.pwHeader, { borderBottomColor: colors.border }]}
              >
                <View
                  style={[
                    styles.pwIconCircle,
                    {
                      backgroundColor: forgotMode
                        ? "#FF9F0A15"
                        : `${colors.accent}15`,
                    },
                  ]}
                >
                  <Ionicons
                    name={forgotMode ? "shield-checkmark" : "key"}
                    size={24}
                    color={forgotMode ? "#FF9F0A" : colors.accent}
                  />
                </View>
                <Text style={[styles.pwTitle, { color: colors.text }]}>
                  {forgotMode
                    ? "Autorización de Supervisor"
                    : "Cambiar Contraseña"}
                </Text>
                <Text
                  style={[styles.pwSubtitle, { color: colors.textSecondary }]}
                >
                  {forgotMode
                    ? "Un supervisor debe ingresar su PIN para autorizar el cambio"
                    : "Ingresa tu contraseña actual y la nueva"}
                </Text>
              </View>

              {/* Fields */}
              <View style={styles.pwFields}>
                {/* Current password OR Supervisor PIN */}
                {forgotMode ? (
                  <View>
                    <Text style={[styles.pwFieldLabel, { color: "#FF9F0A" }]}>
                      PIN de Supervisor
                    </Text>
                    <View
                      style={[
                        styles.pwInputRow,
                        {
                          backgroundColor: colors.background,
                          borderColor:
                            passwordError && !supervisorPin
                              ? "#FF3B30"
                              : "#FF9F0A40",
                        },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color="#FF9F0A"
                      />
                      <TextInput
                        style={[styles.pwInput, { color: colors.text }]}
                        value={supervisorPin}
                        onChangeText={(t) => {
                          setSupervisorPin(t);
                          setPasswordError("");
                        }}
                        placeholder="Ingresa el PIN"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry
                        autoCapitalize="none"
                        keyboardType="number-pad"
                        maxLength={8}
                      />
                      {supervisorPin.length >= 4 && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#34C759"
                        />
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setForgotMode(false);
                        setSupervisorPin("");
                        setPasswordError("");
                      }}
                      activeOpacity={0.6}
                      style={{ marginTop: 8 }}
                    >
                      <Text
                        style={{
                          color: colors.accent,
                          fontSize: 13,
                          fontWeight: "500",
                        }}
                      >
                        ← Usar mi contraseña actual
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text
                      style={[
                        styles.pwFieldLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Contraseña actual
                    </Text>
                    <View
                      style={[
                        styles.pwInputRow,
                        {
                          backgroundColor: colors.background,
                          borderColor:
                            passwordError && !currentPassword
                              ? "#FF3B30"
                              : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={colors.textTertiary}
                      />
                      <TextInput
                        style={[styles.pwInput, { color: colors.text }]}
                        value={currentPassword}
                        onChangeText={(t) => {
                          setCurrentPassword(t);
                          setPasswordError("");
                        }}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!showCurrentPw}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPw(!showCurrentPw)}
                        activeOpacity={0.6}
                      >
                        <Ionicons
                          name={
                            showCurrentPw ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setForgotMode(true);
                        setCurrentPassword("");
                        setPasswordError("");
                      }}
                      activeOpacity={0.6}
                      style={{ marginTop: 8 }}
                    >
                      <Text
                        style={{
                          color: "#FF9F0A",
                          fontSize: 13,
                          fontWeight: "500",
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* New password */}
                <View>
                  <Text
                    style={[
                      styles.pwFieldLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Nueva contraseña
                  </Text>
                  <View
                    style={[
                      styles.pwInputRow,
                      {
                        backgroundColor: colors.background,
                        borderColor:
                          passwordError &&
                          newPassword.length > 0 &&
                          newPassword.length < 4
                            ? "#FF3B30"
                            : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                    <TextInput
                      style={[styles.pwInput, { color: colors.text }]}
                      value={newPassword}
                      onChangeText={(t) => {
                        setNewPassword(t);
                        setPasswordError("");
                      }}
                      placeholder="Mínimo 4 caracteres"
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPw(!showNewPw)}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={showNewPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm password */}
                <View>
                  <Text
                    style={[
                      styles.pwFieldLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Confirmar contraseña
                  </Text>
                  <View
                    style={[
                      styles.pwInputRow,
                      {
                        backgroundColor: colors.background,
                        borderColor:
                          passwordError &&
                          confirmPassword &&
                          confirmPassword !== newPassword
                            ? "#FF3B30"
                            : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={
                        confirmPassword && confirmPassword === newPassword
                          ? "#34C759"
                          : colors.textTertiary
                      }
                    />
                    <TextInput
                      style={[styles.pwInput, { color: colors.text }]}
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        setPasswordError("");
                      }}
                      placeholder="Repite la nueva contraseña"
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                    />
                    {confirmPassword.length > 0 &&
                      confirmPassword === newPassword && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#34C759"
                        />
                      )}
                  </View>
                </View>

                {/* Error */}
                {passwordError !== "" && (
                  <View style={styles.pwErrorRow}>
                    <Ionicons name="alert-circle" size={15} color="#FF3B30" />
                    <Text style={styles.pwErrorTxt}>{passwordError}</Text>
                  </View>
                )}
              </View>

              {/* Buttons */}
              <View
                style={[styles.pwBtnRow, { borderTopColor: colors.border }]}
              >
                <TouchableOpacity
                  style={[styles.pwBtn, { backgroundColor: colors.background }]}
                  activeOpacity={0.7}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text
                    style={[styles.pwBtnLabel, { color: colors.textSecondary }]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pwBtn,
                    {
                      backgroundColor: colors.accent,
                      opacity: isSavingPassword ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={handleChangePassword}
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.pwBtnLabel,
                        { color: "#fff", fontWeight: "700" },
                      ]}
                    >
                      Guardar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de selección de avatar */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.avatarPickerContainer}>
          <View
            style={[
              styles.avatarPickerContent,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Header del picker */}
            <View
              style={[
                styles.avatarPickerHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <Text
                  style={[
                    styles.avatarPickerCancel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.avatarPickerTitle, { color: colors.text }]}>
                Avatares
              </Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Grid de avatares mejorado */}
            <ScrollView
              contentContainerStyle={styles.avatarPickerGrid}
              showsVerticalScrollIndicator={false}
            >
              {AVATARS.map((avatar, index) => {
                const isNew = index >= 4; // a5 y a6 son nuevos
                const isSelected = selectedAvatar === avatar.id && !customImage;

                return (
                  <TouchableOpacity
                    key={avatar.id}
                    style={[
                      styles.avatarPickerItem,
                      isSelected && {
                        borderColor: colors.accent,
                        borderWidth: 3,
                      },
                    ]}
                    onPress={() => {
                      setSelectedAvatar(avatar.id);
                      setCustomImage(null);
                      setShowAvatarPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={avatar.source}
                      style={styles.avatarPickerImage}
                    />
                    {isNew && (
                      <View
                        style={[
                          styles.newBadge,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text style={styles.newBadgeText}>NUEVO</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View
                        style={[
                          styles.selectedCheck,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 70,
  },
  backText: {
    fontSize: 17,
    fontWeight: "400",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  editButton: {
    minWidth: 70,
    alignItems: "flex-end",
    paddingRight: 8,
  },
  editButtonText: {
    fontSize: 17,
    fontWeight: "400",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 50,
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 30,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 106,
    height: 106,
    borderRadius: 53,
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 15,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "400",
    flexShrink: 0,
    minWidth: 100,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    padding: 0,
    minWidth: 0,
  },
  fieldValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldValue: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginLeft: 16,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  // Estilos del modal de vista previa de imagen
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: "80%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  imagePreviewPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewInitials: {
    fontSize: 72,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  imagePreviewClose: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  // Estilos del modal de éxito
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  successModalContent: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  avatarModalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    overflow: "hidden",
  },
  photoOptionsContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    overflow: "hidden",
  },
  photoOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 16,
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  avatarModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 20,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptionImage: {
    width: "100%",
    height: "100%",
  },
  avatarModalCancel: {
    paddingVertical: 16,
    borderTopWidth: 1,
    alignItems: "center",
  },
  avatarModalCancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Estilos de cambio de contraseña
  pwOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pwScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pwCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  pwHeader: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  pwIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pwTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  pwSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  pwFields: {
    padding: 20,
    gap: 16,
  },
  pwFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 2,
  },
  pwInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  pwInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    padding: 0,
  },
  pwErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pwErrorTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
    flex: 1,
  },
  pwBtnRow: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
  },
  pwBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pwBtnLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Estilos del nuevo picker de avatares
  avatarPickerContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  avatarPickerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  avatarPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatarPickerCancel: {
    fontSize: 16,
    fontWeight: "400",
    width: 60,
  },
  avatarPickerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  avatarPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  avatarPickerItem: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "visible",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  avatarPickerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
  },
  newBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  selectedCheck: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
