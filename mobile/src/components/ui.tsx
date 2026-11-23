import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Fonts, MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';

// Blocos de interface compartilhados pelas telas (direção B quente).

type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption' | 'mono';

export function AppText({
  variant = 'body',
  muted,
  style,
  ...props
}: TextProps & { variant?: TextVariant; muted?: boolean }) {
  const theme = useTheme();
  return (
    <Text
      {...props}
      style={[textStyles[variant], { color: muted ? theme.textSecondary : theme.text }, style]}
    />
  );
}

const textStyles = StyleSheet.create({
  display: { fontFamily: Fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: Fonts.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  subtitle: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: Fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  caption: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
});

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  contentStyle,
  scrollProps,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
  /** Fica fixo embaixo, fora da rolagem (ex.: botão principal do passo). */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} {...scrollProps}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: PressableProps['onPress'];
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const background =
    variant === 'primary' ? theme.primary : variant === 'secondary' ? theme.surface : 'transparent';
  const color = variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'secondary' ? theme.border : 'transparent',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Icon name={icon} size={20} color={color} /> : null}
          <Text style={[styles.buttonText, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={{ fontFamily: Fonts.medium }}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={theme.textMuted}
        {...props}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" style={{ color: theme.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/** Linha tocável de lista: ícone opcional, título, apoio e seta. */
export function OptionRow({
  title,
  subtitle,
  icon,
  iconColor,
  selected,
  onPress,
  chevron = Boolean(onPress),
  right,
}: {
  title: string;
  subtitle?: string | null;
  icon?: IconName;
  iconColor?: string;
  selected?: boolean;
  onPress?: () => void;
  chevron?: boolean;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {icon ? (
        <View style={[styles.optionIcon, { backgroundColor: theme.surfaceAlt }]}>
          <Icon name={icon} size={22} color={iconColor ?? theme.text} />
        </View>
      ) : null}
      <View style={styles.optionText}>
        <AppText style={{ fontFamily: Fonts.medium }}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name={selected ? 'check' : 'next'} size={20} color={selected ? theme.primary : theme.textMuted} /> : null}
    </Pressable>
  );
}

export function Chip({ title, selected, onPress }: { title: string; selected?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.surface,
          borderColor: selected ? theme.text : theme.border,
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? theme.background : theme.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Notice({
  text,
  tone = 'info',
  icon,
}: {
  text: string;
  tone?: 'info' | 'error' | 'success';
  icon?: IconName;
}) {
  const theme = useTheme();
  const color = tone === 'error' ? theme.danger : tone === 'success' ? theme.success : theme.textSecondary;
  const background = tone === 'error' ? theme.dangerSoft : tone === 'success' ? theme.successSoft : theme.surfaceAlt;
  return (
    <View style={[styles.notice, { backgroundColor: background }]}>
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <AppText variant="caption" style={{ color, flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

/** Indicador de passos do onboarding. */
export function Steps({ total, current }: { total: number; current: number }) {
  const theme = useTheme();
  return (
    <View style={styles.steps} accessibilityLabel={`${current}/${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.step, { backgroundColor: i < current ? theme.primary : theme.border }]}
        />
      ))}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" muted style={styles.sectionLabel}>
      {children}
    </AppText>
  );
}

export function Loading({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} />
      {label ? <AppText muted>{label}</AppText> : null}
    </View>
  );
}

export function Gap({ size = Spacing.lg }: { size?: number }) {
  return <View style={{ height: size }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  buttonText: { fontFamily: Fonts.semibold, fontSize: 16 },
  field: { gap: Spacing.xs },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  option: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionIcon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  chipText: { fontFamily: Fonts.medium, fontSize: 14 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  steps: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  sectionLabel: { marginTop: Spacing.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
});
