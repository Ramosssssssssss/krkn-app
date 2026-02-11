import ModuleScreen, { ModuleScreenConfig } from "@/components/module-screen";
import { useLanguage } from "@/context/language-context";
import React from "react";

const getProcesosConfig = (t: (key: string) => string): ModuleScreenConfig => ({
  headerIcon: "sync-outline",
  headerTitle: t("processes.title"),
  headerSubtitle: t("processes.subtitle"),
  stats: [
    {
      value: "0",
      label: t("processes.active"),
      sublabel: t("inventory.today"),
    },
    { value: "0", label: t("processes.pending") },
  ],
  sectionLabel: t("processes.section"),
  groups: [
    {
      id: "recibo",
      title: t("processes.receipt"),
      subtitle: t("processes.receiptSubtitle"),
      icon: "download-outline",
      color: "#3B82F6",
      route: "/(main)/procesos/recibo",
    },
    {
      id: "acomodo",
      title: t("processes.arrangement"),
      subtitle: t("processes.arrangementSubtitle"),
      icon: "grid-outline",
      color: "#10B981",
      route: "/(main)/procesos/acomodo",
    },
    {
      id: "picking",
      title: t("processes.picking"),
      subtitle: t("processes.pickingSubtitle"),
      icon: "hand-left-outline",
      color: "#9D4EDD",
      route: "/(main)/procesos/picking",
    },
    {
      id: "packing",
      title: t("processes.packing"),
      subtitle: t("processes.packingSubtitle"),
      icon: "cube-outline",
      color: "#F59E0B",
      route: "/(main)/procesos/packing",
    },
    {
      id: "embarques",
      title: t("processes.shipments"),
      subtitle: t("processes.shipmentsSubtitle"),
      icon: "car-outline",
      color: "#EC4899",
      route: "/(main)/procesos/embarques",
    },
  ],
});

export default function ProcesosIndexScreen() {
  const { t } = useLanguage();
  return <ModuleScreen config={getProcesosConfig(t)} />;
}
