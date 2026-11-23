import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useOwl } from './ui';
import { radius, size, space } from './theme/layout';
import { type } from './theme/typography';

const icons = {
  Presensi: 'location-outline', Riwayat: 'time-outline',
} as const;

type Section = keyof typeof icons;

export function SectionMenu({items, value, select}: {
  items: Section[]; value: string; select: (item: Section) => void;
}) {
  const c = useOwl();
  return <View accessibilityRole="tablist" accessibilityLabel="Menu pribadi" style={{flexDirection:'row', gap:space.xs, padding:space.xs, borderRadius:radius.control, backgroundColor:c.surface}}>
    {items.map(item => {
      const selected = item === value;
      const color = selected ? c.accent : c.textSecondary;
      return <Pressable key={item} accessibilityRole="tab" aria-selected={selected} accessibilityLabel={item} accessibilityState={{selected}}
        onPress={() => select(item)} style={({pressed}) => ({
          flex:1, minWidth:0, justifyContent:'center', minHeight: size.touch, flexDirection: 'row', alignItems: 'center', gap: space.xs,
          paddingHorizontal: space.xs, paddingVertical: space.sm, borderRadius: radius.control,
          backgroundColor: pressed || selected ? c.accentSoft : 'transparent',
          borderWidth: size.hairline, borderColor: selected ? c.accent : 'transparent',
        })}>
        <Ionicons accessible={false} name={icons[item]} size={size.iconSmall} color={color}/>
        <Text style={[type.label, {color,flexShrink:1}]}>{item}</Text>
      </Pressable>;
    })}
  </View>;
}
