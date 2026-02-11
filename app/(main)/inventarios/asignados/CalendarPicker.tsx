import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { s } from "./styles";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DAYS_HEADER = ["D", "L", "M", "M", "J", "V", "S"];

const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

interface CalendarPickerProps {
  colors: any;
  selectedDate: Date;
  calendarViewDate: Date;
  onSelectDay: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
}

export function CalendarPicker({
  colors,
  selectedDate,
  calendarViewDate,
  onSelectDay,
  onChangeMonth,
}: CalendarPickerProps) {
  const calMonth = calendarViewDate.getMonth();
  const calYear = calendarViewDate.getFullYear();

  const calendarDays = useMemo(() => {
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++)
      days.push(new Date(calYear, calMonth, i));
    return days;
  }, [calMonth, calYear]);

  return (
    <View style={[s.iosCalendarCard, { backgroundColor: colors.surface }]}>
      {/* Month nav */}
      <View style={s.calHeader}>
        <TouchableOpacity
          onPress={() => onChangeMonth(new Date(calYear, calMonth - 1, 1))}
          style={s.calNavBtn}
        >
          <Ionicons name="chevron-back" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            onChangeMonth(new Date());
            onSelectDay(new Date());
          }}
        >
          <Text style={[s.calMonthLabel, { color: colors.text }]}>
            {MONTHS_ES[calMonth]} {calYear}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onChangeMonth(new Date(calYear, calMonth + 1, 1))}
          style={s.calNavBtn}
        >
          <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Weekday header */}
      <View style={s.calWeekRow}>
        {DAYS_HEADER.map((d, i) => (
          <View key={i} style={s.calWeekCell}>
            <Text
              style={[
                s.calWeekText,
                { color: i === 0 ? "#EF4444" : colors.textTertiary },
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={s.calGrid}>
        {calendarDays.map((date, i) => {
          if (!date) return <View key={i} style={s.calDayCell} />;
          const isToday = isSameDay(date, new Date());
          const isChosen = isSameDay(date, selectedDate);
          return (
            <TouchableOpacity
              key={i}
              style={s.calDayCell}
              onPress={() => onSelectDay(date)}
              activeOpacity={0.6}
            >
              <View style={[s.calDayInner, isChosen && s.calDaySelected]}>
                <Text
                  style={[
                    s.calDayText,
                    { color: colors.text },
                    isToday &&
                      !isChosen && {
                        color: "#3B82F6",
                        fontWeight: "800",
                      },
                    isChosen && { color: "#FFF", fontWeight: "700" },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              {isToday && !isChosen && <View style={s.calTodayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected display */}
      <View style={[s.calSelectedRow, { borderTopColor: colors.border }]}>
        <Ionicons name="calendar" size={16} color="#3B82F6" />
        <Text style={[s.calSelectedText, { color: colors.text }]}>
          {selectedDate.toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>
    </View>
  );
}
