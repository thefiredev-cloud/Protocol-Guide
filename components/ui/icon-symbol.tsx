// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: Record<string, MaterialIconName> = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "doc.on.doc": "content-copy",
  "checkmark": "check",
  "person.fill": "person",
  "mic.fill": "mic",
  "stop.fill": "stop",
  "doc.text.fill": "description",
  "heart.fill": "favorite",
  "brain.head.profile": "psychology",
  "pills.fill": "medication",
  "figure.child": "child-care",
  "bandage.fill": "healing",
  "lungs.fill": "air",
  "ellipsis.vertical": "more-vert",
  "location.fill": "location-on",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "magnifyingglass": "search",
  "arrow.up.circle.fill": "arrow-upward",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "arrow.down.circle.fill": "cloud-download",
  "wifi.slash": "wifi-off",
  "clock.fill": "schedule",
  "calendar": "event",
  "map.fill": "map",
  "flag.fill": "flag",
  "square.and.arrow.up": "share",
  "scalemass.fill": "monitor-weight",
  "arrow.left.arrow.right": "swap-horiz",
  "cross.vial.fill": "science",
};

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
