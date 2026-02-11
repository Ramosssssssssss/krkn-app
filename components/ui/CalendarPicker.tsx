import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface CalendarPickerProps {
  onSelectRange: (start: string, end: string) => void;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
}

const DAYS_OF_WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CalendarPicker({ onSelectRange, initialStartDate, initialEndDate }: CalendarPickerProps) {
  const colors = useThemeColors();
  const now = new Date();
  
  const [viewDate, setViewDate] = useState(new Date());
  const [start, setStart] = useState<Date | null>(initialStartDate ? new Date(initialStartDate + 'T00:00:00') : null);
  const [end, setEnd] = useState<Date | null>(initialEndDate ? new Date(initialEndDate + 'T00:00:00') : null);

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();

  const daysInMonth = useMemo(() => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const days = [];
    // Espacios vacíos para el inicio del mes
    for (let i = 0; i < firstDayIndex; i++) {
        days.push(null);
    }
    // Días del mes
    for (let i = 1; i <= totalDays; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  }, [month, year]);

  const handlePress = (date: Date) => {
    if (!start || (start && end)) {
      setStart(date);
      setEnd(null);
    } else {
      if (date < start) {
        setEnd(start);
        setStart(date);
      } else {
        setEnd(date);
      }
    }
  };

  const handleApply = () => {
    if (start && end) {
      const s = start.toISOString().split('T')[0];
      const e = end.toISOString().split('T')[0];
      onSelectRange(s, e);
    } else if (start) {
        // Si solo hay uno, usamos el mismo para ambos
        const s = start.toISOString().split('T')[0];
        onSelectRange(s, s);
    }
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    setStart(today);
    setEnd(today);
    setViewDate(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (start && date.getTime() === start.getTime()) return true;
    if (end && date.getTime() === end.getTime()) return true;
    return false;
  };

  const isInRange = (date: Date) => {
    if (!start || !end) return false;
    return date > start && date < end;
  };

  const changeMonth = (delta: number) => {
    setViewDate(new Date(year, month + delta, 1));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleToday} style={styles.monthYear}>
          <Text style={[styles.monthText, { color: colors.text }]}>{MONTHS[month]}</Text>
          <Text style={[styles.yearText, { color: colors.textTertiary }]}>{year}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* WeekDays */}
      <View style={styles.weekDays}>
        {DAYS_OF_WEEK.map((day, i) => (
          <Text key={i} style={[styles.weekDayText, { color: colors.textTertiary }]}>{day}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {daysInMonth.map((date, i) => {
          if (!date) return <View key={i} style={styles.dayCell} />;
          
          const selected = isSelected(date);
          const inRange = isInRange(date);
          const today = isToday(date);

          return (
            <TouchableOpacity 
              key={i} 
              onPress={() => handlePress(date)}
              style={[
                styles.dayCell,
                selected && styles.selectedDay,
                selected && { backgroundColor: colors.accent },
                inRange && { backgroundColor: colors.accent + '20' }
              ]}
            >
              <Text style={[
                styles.dayText,
                { color: colors.text },
                selected && { color: '#FFF', fontWeight: '800' },
                today && !selected && { color: colors.accent, fontWeight: '800' }
              ]}>
                {date.getDate()}
              </Text>
              {today && !selected && <View style={[styles.todayDot, { backgroundColor: colors.accent }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Range Display */}
      <View style={styles.footer}>
        <View style={[styles.rangeInfo, { backgroundColor: colors.border + '20' }]}>
           <View style={styles.infoCol}>
             <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>DESDE</Text>
             <Text style={[styles.infoValue, { color: start ? colors.text : colors.border }]}>
               {start ? start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-- / -- / --'}
             </Text>
           </View>
           <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
           <View style={styles.infoCol}>
             <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>HASTA</Text>
             <Text style={[styles.infoValue, { color: end ? colors.text : colors.border }]}>
               {end ? end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-- / -- / --'}
             </Text>
           </View>
        </View>

        <TouchableOpacity 
          style={[styles.applyBtn, { backgroundColor: colors.accent }, (!start) && { opacity: 0.5 }]}
          onPress={handleApply}
          disabled={!start}
        >
          <Text style={styles.applyBtnText}>Aplicar Filtro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYear: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '800',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (Dimensions.get('window').width - 80) / 7,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedDay: {
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.2,
    // shadowRadius: 4,
    // elevation: 5,
  },
  rangeDay: {
    borderRadius: 0,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
    gap: 16,
  },
  rangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 16,
  },
  infoCol: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  }
});
