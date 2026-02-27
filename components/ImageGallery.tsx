import { API_URL } from "@/config/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    DimensionValue,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageGalleryProps {
  databaseId: number;
  articuloId: number;
  clave: string;
  nombre: string;
  unidadVenta: string;
  isDark?: boolean;
  width?: number; // Defaults to container width
  height?: DimensionValue; // Defaults to 100%
  borderRadius?: number;
  contentFit?: "cover" | "contain";
}

export default function ImageGallery({
  databaseId,
  articuloId,
  clave,
  nombre,
  unidadVenta,
  isDark = false,
  width,
  height = "100%",
  borderRadius = 0,
  contentFit = "contain",
}: ImageGalleryProps) {
  const [totalImages, setTotalImages] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const imageScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Si no hay articuloId válido, no buscamos
    if (!articuloId) return;
    
    fetch(
      `${API_URL}/api/imagenes-articulo-count.php?databaseId=${databaseId}&articuloId=${articuloId}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.total > 0) {
          setTotalImages(data.total);
        }
      })
      .catch(console.warn);
  }, [articuloId, databaseId]);

  return (
    <View style={[styles.container, { height, borderRadius, overflow: "hidden", backgroundColor: isDark ? "#000" : "#fff" }]}>
      {!imageLoaded && !imageError && (
        <View style={styles.placeholder}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      )}
      {imageError ? (
        <View
          style={[
            styles.placeholder,
            { backgroundColor: isDark ? "#000" : "#fff" },
          ]}
        >
          <Ionicons name="cube" size={80} color={isDark ? "#374151" : "#9CA3AF"} />
          <Text style={[styles.noImageText, { color: isDark ? "#374151" : "#9CA3AF" }]}>
            Sin imagen
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (!imageError) setModalVisible(true);
          }}
          style={StyleSheet.absoluteFillObject}
        >
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={totalImages > 1}
            onMomentumScrollEnd={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const cardWidth = width || e.nativeEvent.layoutMeasurement.width;
              if (cardWidth > 0) {
                const index = Math.round(offset / cardWidth);
                setCurrentImageIndex(index);
              }
            }}
            style={{ flex: 1 }}
          >
            {Array.from({ length: totalImages }).map((_, idx) => (
              <View key={idx} style={{ width: width || SCREEN_WIDTH, height: "100%" }}>
                <Image
                  source={{
                    uri: `${API_URL}/api/imagen-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}&pos=${idx}`,
                  }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit={contentFit}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      )}

      {/* Pagination Dots */}
      {totalImages > 1 && (
        <View pointerEvents="none" style={styles.paginationDots}>
          {Array.from({ length: totalImages }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentImageIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Full Screen Zoom Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "dark"}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 50 : 20 }}>
            <View style={{ alignItems: "flex-end", padding: 16 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons
                  name="close-circle"
                  size={36}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={Array.from({ length: totalImages })}
              horizontal
              pagingEnabled
              initialScrollIndex={currentImageIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              keyExtractor={(_, i) => i.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ index }) => (
                <ScrollView
                  style={{ width: SCREEN_WIDTH }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  maximumZoomScale={4}
                  minimumZoomScale={1}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  <Image
                    source={{
                      uri: `${API_URL}/api/imagen-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}&pos=${index}`,
                    }}
                    style={{
                      width: SCREEN_WIDTH,
                      height: SCREEN_HEIGHT * 0.7,
                    }}
                    contentFit="contain"
                  />
                </ScrollView>
              )}
              onMomentumScrollEnd={(e) => {
                const offset = e.nativeEvent.contentOffset.x;
                const index = Math.round(offset / SCREEN_WIDTH);
                setCurrentImageIndex(index);
                // Sync external card scroll visually
                imageScrollRef.current?.scrollTo({
                  x: index * (width || SCREEN_WIDTH),
                  animated: false,
                });
              }}
            />

            {/* Modal Bottom Info */}
            <View style={styles.modalBottomInfo} pointerEvents="none">
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.modalInfoContainer}>
                <Text style={styles.modalInfoTitle} numberOfLines={2}>
                  {nombre}
                </Text>
                <View style={styles.modalInfoMeta}>
                  <Text style={styles.modalInfoClave}>{clave}</Text>
                  <View style={styles.modalInfoDot} />
                  <Text style={styles.modalInfoUnidad}>{unidadVenta}</Text>
                </View>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  paginationDots: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 16,
  },
  modalBottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  modalInfoContainer: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalInfoTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  modalInfoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalInfoClave: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  modalInfoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  modalInfoUnidad: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
});
