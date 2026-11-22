import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useOwl } from './ui';
import { radius, size, space } from './theme/layout';
import { type } from './theme/typography';

const icons = {
  Warga: 'people-outline', Presensi: 'calendar-outline', 'Pengaturan RT': 'settings-outline',
  Absen: 'location-outline', Riwayat: 'time-outline', 'Data saya': 'person-outline', Privasi: 'lock-closed-outline',
} as const;

type Section = keyof typeof icons;

export function SectionMenu({items, value, select}: {
  items: Section[]; value: string; select: (item: Section) => void;
}) {
  const c = useOwl();
  return <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: space.xs}}>
    {items.map(item => {
      const selected = item === value;
      const color = selected ? c.accent : c.textSecondary;
      return <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} accessibilityState={{selected}}
        onPress={() => select(item)} style={({pressed}) => ({
          minHeight: size.touch, flexDirection: 'row', alignItems: 'center', gap: space.xs,
          paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.control,
          backgroundColor: pressed || selected ? c.accentSoft : 'transparent',
          borderWidth: size.hairline, borderColor: selected ? c.accent : 'transparent',
        })}>
        <Ionicons accessible={false} name={icons[item]} size={size.iconSmall} color={color}/>
        <Text style={[type.label, {color}]}>{item}</Text>
      </Pressable>;
    })}
  </View>;
}
