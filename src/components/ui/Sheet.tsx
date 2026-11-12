import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../lib/theme";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Native modal presentation; the scrim colour is the only chrome we own. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: theme.colors.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: theme.colors.surfaceSunken }]} />
          </View>
          {title ? (
            <Text
              style={[
                theme.text.title2,
                { color: theme.colors.textPrimary, paddingHorizontal: 20, paddingBottom: 12 },
              ]}
            >
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    maxHeight: "86%",
    paddingTop: 8,
  },
  grabberRow: {
    alignItems: "center",
    paddingBottom: 10,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
});
