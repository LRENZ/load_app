import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S } from './theme.ts';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color = C.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/** A calculation problem that is not tied to one field; stays until the form is edited. */
export function FormMessage({ text, testID = 'form-error' }: { text: string | null; testID?: string }) {
  if (!text) return null;
  return (
    <View style={styles.formMsg} accessibilityLiveRegion="polite">
      <Icon name="alert-circle-outline" size={18} color={C.danger} />
      <Text testID={testID} style={styles.formMsgText}>
        {text}
      </Text>
    </View>
  );
}

/** Secondary-page header with back control. */
export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        testID="header-back"
        hitSlop={12}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.backBtn}
      >
        <Icon name="chevron-left" size={28} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.backBtn} />
    </View>
  );
}

export function Screen({
  children,
  header,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ padding: S.gutter, paddingBottom: insets.bottom + 32 }, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, padding: S.gutter }, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function InfoRow({ label, value, strong, testID }: { label: string; value: string; strong?: boolean; testID?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text testID={testID} style={[styles.infoValue, strong && styles.infoStrong]}>
        {value}
      </Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, testID, disabled, busy }: { title: string; onPress: () => void; testID?: string; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, (pressed || busy) && { backgroundColor: C.primaryDark }, disabled && { opacity: 0.5 }]}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}
    </Pressable>
  );
}

export function SoftButton({ title, onPress, testID }: { title: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.soft, pressed && { opacity: 0.7 }]}>
      <Text style={styles.softText}>{title}</Text>
    </Pressable>
  );
}

export function TextButton({ title, onPress, testID, color = C.sub }: { title: string; onPress: () => void; testID?: string; color?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.textBtn}>
      <Text style={[styles.textBtnText, { color }]}>{title}</Text>
    </Pressable>
  );
}

/** Labelled input row with a round icon and optional prefix / suffix controls. */
export function Field({
  label,
  icon,
  error,
  prefix,
  suffix,
  inputProps,
  testID,
  errorText,
  inputRef,
}: {
  label: string;
  icon: IconName;
  error?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  inputProps?: TextInputProps;
  testID?: string;
  /** Shown under the input while `error` is set (stays until the field is edited). */
  errorText?: string | null;
  /** For keyboard "Next" chaining between fields. */
  inputRef?: Ref<React.ComponentRef<typeof TextInput>>;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <View style={styles.fieldIcon}>
          <Icon name={icon} size={18} color={C.primary} />
        </View>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        {prefix}
        {inputProps && (
          <TextInput
            ref={inputRef}
            testID={testID}
            placeholderTextColor={C.faint}
            style={styles.input}
            accessibilityLabel={label}
            {...inputProps}
          />
        )}
        {suffix}
      </View>
      {error && errorText ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle-outline" size={16} color={C.danger} />
          <Text testID={testID ? `${testID}-error` : undefined} style={styles.errorText}>
            {errorText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Centered modal dialog over a dimmed backdrop. Android Back = onClose. */
export function Dialog({ visible, onClose, children, testID }: { visible: boolean; onClose: () => void; children: ReactNode; testID?: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View testID={testID} style={styles.dialog}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// ---------------- snackbar ----------------
type Snack = { id: number; text: string; action?: { label: string; onPress: () => void } } | null;
let snack: Snack = null;
const snackSubs = new Set<() => void>();
let snackSeq = 0;
export const snackbar = {
  show(text: string, action?: { label: string; onPress: () => void }) {
    snack = { id: ++snackSeq, text, action };
    snackSubs.forEach((f) => f());
  },
  hide() {
    snack = null;
    snackSubs.forEach((f) => f());
  },
  current: () => snack,
};

export function SnackbarHost() {
  const s = useSyncExternalStore(
    (f) => {
      snackSubs.add(f);
      return () => snackSubs.delete(f);
    },
    () => snack,
    () => snack,
  );
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!s) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const id = s.id;
    const timer = setTimeout(() => {
      if (snack?.id === id) snackbar.hide();
    }, 3500);
    return () => clearTimeout(timer);
  }, [s, opacity]);
  if (!s) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.snackWrap, { bottom: insets.bottom + 72, opacity }]}>
      <View testID="snackbar" style={styles.snack} accessibilityLiveRegion="polite">
        <Text style={styles.snackText}>{s.text}</Text>
        {s.action && (
          <Pressable
            onPress={() => {
              s.action?.onPress();
              snackbar.hide();
            }}
            hitSlop={8}
          >
            <Text style={styles.snackAction}>{s.action.label}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export function useOnce() {
  const used = useRef(false);
  return (fn: () => void) => {
    if (used.current) return;
    used.current = true;
    fn();
  };
}

export function useForceUpdate() {
  const [, set] = useState(0);
  return () => set((n) => n + 1);
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8, backgroundColor: C.bg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.text },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16, marginBottom: S.gap, shadowColor: '#1B2B4B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  infoLabel: { color: C.sub, fontSize: 14, flexShrink: 1 },
  infoValue: { color: C.text, fontSize: 15, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  infoStrong: { color: C.primary, fontSize: 18, fontWeight: '800' },
  primary: { backgroundColor: C.primary, borderRadius: R.pill, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  soft: { backgroundColor: C.primarySoft, borderRadius: R.pill, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  softText: { color: C.primary, fontSize: 16, fontWeight: '700' },
  textBtn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  textBtnText: { fontSize: 15, fontWeight: '600' },
  field: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fieldIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: C.text, flexShrink: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: R.input, minHeight: 50, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'transparent' },
  inputError: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 4 },
  formMsg: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 12 },
  formMsgText: { color: C.danger, fontSize: 14, lineHeight: 20, flex: 1, fontWeight: '600' },
  errorText: { color: C.danger, fontSize: 13.5, lineHeight: 18, flex: 1 },
  input: { flex: 1, fontSize: 17, color: C.text, paddingVertical: 10, minWidth: 40 },
  backdrop: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: C.card, borderRadius: 22, padding: 20, width: '100%', maxWidth: 420 },
  snackWrap: { position: 'absolute', left: S.gutter, right: S.gutter },
  snack: { backgroundColor: C.snackbar, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  snackText: { color: '#fff', fontSize: 14, flex: 1 },
  snackAction: { color: '#8FB2FF', fontWeight: '700', fontSize: 14 },
});
