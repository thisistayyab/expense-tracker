import { Text, View } from "react-native";

import { useTheme } from "../../lib/theme";
import { Button } from "./Button";

export type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Empty states describe the next action, never the absence (04 copy rules). */
export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 24 }}>
      <Text style={[theme.text.title2, { color: theme.colors.textPrimary, textAlign: "center" }]}>
        {title}
      </Text>
      <Text
        style={[
          theme.text.body,
          { color: theme.colors.textSecondary, textAlign: "center", maxWidth: 280 },
        ]}
      >
        {body}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ alignSelf: "stretch", paddingTop: 8 }}>
          <Button label={actionLabel} onPress={onAction} variant="accent" size="sm" />
        </View>
      ) : null}
    </View>
  );
}
