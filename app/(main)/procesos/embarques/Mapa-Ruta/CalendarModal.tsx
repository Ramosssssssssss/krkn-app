import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { DAYS_HEADER, isSameDay, MONTHS_ES } from './types';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  styles: any;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  calendarViewDate: Date;
  onViewDateChange: (date: Date) => void;
}

export const CalendarModal = ({
  visible,
  onClose,
  colors,
  styles,
  selectedDate,
  onSelectDate,
  calendarViewDate,
  onViewDateChange,
}: CalendarModalProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <BlurView
          intensity={Platform.OS === 'ios' ? 90 : 100}
          tint={colors.isDark ? 'dark' : 'light'}
          style={[styles.calendarSheet, { backgroundColor: colors.surface + "F2" }]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Seleccionar Fecha</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 17 }}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calendarContainer}>
            {/* Header Navegación Mes */}
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={() => onViewDateChange(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onViewDateChange(new Date());
                  onSelectDate(new Date());
                }}
              >
                <Text style={[styles.calMonthLabel, { color: colors.text }]}>
                  {MONTHS_ES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onViewDateChange(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Días de la semana */}
            <View style={styles.calWeekRow}>
              {DAYS_HEADER.map((d, i) => (
                <View key={i} style={styles.calWeekCell}>
                  <Text style={[styles.calWeekText, { color: i === 0 ? "#EF4444" : colors.textTertiary }]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Grid de días */}
            <View style={styles.calGrid}>
              {(() => {
                const calMonth = calendarViewDate.getMonth();
                const calYear = calendarViewDate.getFullYear();
                const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const days = [];
                
                for (let i = 0; i < firstDay; i++) {
                  days.push(<View key={`empty-${i}`} style={styles.calDayCell} />);
                }
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                for (let i = 1; i <= totalDays; i++) {
                  const date = new Date(calYear, calMonth, i);
                  const isToday = isSameDay(date, new Date());
                  const isChosen = isSameDay(date, selectedDate);
                  const isPast = date < today;
                  
                  days.push(
                    <TouchableOpacity
                      key={`day-${i}`}
                      style={styles.calDayCell}
                      onPress={() => onSelectDate(date)}
                      activeOpacity={0.6}
                      disabled={isPast}
                    >
                      <View style={[
                        styles.calDayInner, 
                        isChosen && { backgroundColor: colors.accent, borderRadius: 20 },
                        isPast && { opacity: 0.4 }
                      ]}>
                        <Text style={[
                          styles.calDayText,
                          { color: isPast ? colors.textTertiary : colors.text },
                          isToday && !isChosen && { color: colors.accent, fontWeight: "800" },
                          isChosen && { color: "#FFF", fontWeight: "700" }
                        ]}>
                          {i}
                        </Text>
                      </View>
                      {isToday && !isChosen && <View style={[styles.calTodayDot, { backgroundColor: colors.accent }]} />}
                    </TouchableOpacity>
                  );
                }
                return days;
              })()}
            </View>

            {/* Fecha Seleccionada */}
            <View style={[styles.calSelectedRow, { borderTopColor: colors.border }]}>
              <Ionicons name="calendar" size={18} color={colors.accent} />
              <Text style={[styles.calSelectedText, { color: colors.text }]}>
                {selectedDate.toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
          <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
        </BlurView>
      </View>
    </Modal>
  );
};
