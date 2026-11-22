import { useState, type PropsWithChildren } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput,
  useColorScheme, View, type TextInputProps, type GestureResponderEvent,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { palette } from './theme/colors';
import { type } from './theme/typography';
import { space, size, radius } from './theme/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useOwl() {
  const dark = useColorScheme() === 'dark';
  return { ...palette[dark ? 'dark' : 'light'], dark };
}

export function Screen({ children, form }: PropsWithChildren<{form?: boolean}>) {
  const c = useOwl();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: c.bg }}
    keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never"
    contentContainerStyle={[styles.screen, { paddingTop: 24 + insets.top, paddingBottom: 52 + insets.bottom,
      paddingLeft: size.screenPadding + insets.left, paddingRight: size.screenPadding + insets.right }]}><View style={[styles.column, form && { maxWidth: 480 }]}>{children}</View></ScrollView>;
}

export function Card({ children }: PropsWithChildren) {
  const c = useOwl();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  const c = useOwl();
  return <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Body({ children }: PropsWithChildren) {
  const c = useOwl();
  return <Text style={[styles.body, { color: c.textSecondary }]}>{children}</Text>;
}

type ButtonProps = { label: string; nativeID?: string; onPress: (event: GestureResponderEvent) => void; secondary?: boolean; quiet?: boolean; disabled?: boolean };

export function Button({ label, nativeID, onPress, secondary, quiet, disabled }: ButtonProps) {
  const c = useOwl();
  const [focused, setFocused] = useState(false);
  return <Pressable nativeID={nativeID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, {
      backgroundColor: quiet ? (pressed ? c.accentSoft : 'transparent') : disabled || secondary ? c.surface : c.accent,
      borderColor: focused ? (secondary || quiet || disabled ? c.accent : c.onAccent) : secondary && !quiet ? c.border : 'transparent',
      opacity: pressed ? 0.8 : 1,
    }]}>
    <Text style={[styles.buttonText, { color: disabled ? c.textSecondary : quiet ? c.accent : secondary ? c.text : c.onAccent }]}>{label}</Text>
  </Pressable>;
}

type FieldProps = Pick<TextInputProps, 'value' | 'onChangeText' | 'secureTextEntry' | 'keyboardType' | 'multiline' | 'autoComplete'> & { label: string; error?: string };

export function Field({ label, error, keyboardType, secureTextEntry, multiline, ...input }: FieldProps) {
  const c = useOwl();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const rawInput = secureTextEntry || keyboardType === 'email-address' || keyboardType === 'url';
  return <View style={styles.field}>
    <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    <View>
      <TextInput {...input} accessibilityLabel={label} keyboardType={keyboardType} secureTextEntry={secureTextEntry && !passwordVisible}
        autoCapitalize={rawInput ? 'none' : 'sentences'} autoCorrect={rawInput ? false : undefined}
        multiline={multiline} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        selectionColor={c.accent} placeholderTextColor={c.textSecondary}
        style={[styles.input, multiline && styles.multiline, secureTextEntry && { paddingRight: 50 }, { color: c.text, backgroundColor: c.surfaceRaised,
          borderColor: error ? c.danger : focused ? c.accent : c.controlBorder }]} />
      {secureTextEntry && <Pressable accessibilityRole="button"
        accessibilityLabel={passwordVisible ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
        onPress={() => setPasswordVisible(visible => !visible)}
        style={styles.passwordToggle}>
        <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textSecondary}/>
      </Pressable>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={[type.callout, {color:c.danger}]}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  passwordToggle: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  screen: { flexGrow: 1, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: space.md },
  card: { borderWidth: size.hairline, borderRadius: radius.card, padding: space.lg, gap: space.md },
  title: type.title,
  body: type.body,
  button: { alignItems: 'center', justifyContent: 'center', minHeight: size.control,
    paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radius.control, borderWidth: 2 },
  buttonText: { ...type.headline, textAlign: 'center' },
  field: { gap: space.sm },
  label: type.label,
  input: { ...type.body, minHeight: size.control, borderWidth: 1.5, borderRadius: radius.control,
    paddingHorizontal: space.lg, paddingVertical: space.md },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
