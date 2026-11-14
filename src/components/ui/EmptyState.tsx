import { Text, View } from "react-native";

import { useTheme } from "../../lib/theme";
import { Button } from "./Button";

export type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Empty states describe the next action, never the absence (04 copy rules).
 *
 * Laid out from the leading edge, not centred: a centred heading over centred
 * grey body copy under a full-width button is the most recognisable template
 * block in mobile UI. Left-aligned with a compact button also keeps the add
 * button from sitting on top of the primary action on short screens.
 */
export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text style={[theme.text.title3, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[theme.text.body, { color: theme.colors.textSecondary, maxWidth: 300 }]}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ alignSelf: "flex-start", marginTop: 10 }}>
          <Button label={actionLabel} onPress={onAction} variant="accent" size="sm" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}
