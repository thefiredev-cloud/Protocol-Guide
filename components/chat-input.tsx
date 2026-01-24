import { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "./ui/icon-symbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";

type ChatInputProps = {
  onSend: (message: string) => void;
  onVoicePress?: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  onVoicePress,
  disabled = false,
  isRecording = false,
  isProcessing = false,
  placeholder = "Ask about a protocol...",
}: ChatInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSend(trimmedMessage);
      setMessage("");
      Keyboard.dismiss();
    }
  };

  const handleClear = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMessage("");
    inputRef.current?.focus();
  };

  const handleVoicePress = () => {
    if (onVoicePress && !disabled) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onVoicePress();
    }
  };

  const canSend = message.trim().length > 0 && !disabled && !isProcessing;
  const showClear = message.length > 0 && !isProcessing;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View
        className="px-4 pt-3 pb-2 border-t"
        style={{
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        <View className="flex-row items-end gap-2">
          {/* Voice Button */}
          {onVoicePress && (
            <TouchableOpacity
              onPress={handleVoicePress}
              disabled={disabled || isProcessing}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{
                backgroundColor: isRecording ? colors.primary : colors.surface,
                opacity: disabled || isProcessing ? 0.5 : 1,
              }}
              activeOpacity={0.7}
              accessibilityLabel={isRecording ? "Stop voice recording" : "Start voice search"}
              accessibilityRole="button"
              accessibilityHint={isRecording ? "Stops voice recording" : "Opens voice search for hands-free protocol search"}
              accessibilityState={{ disabled: disabled || isProcessing }}
            >
              <IconSymbol
                name="mic.fill"
                size={22}
                color={isRecording ? "#FFFFFF" : colors.muted}
              />
            </TouchableOpacity>
          )}

          {/* Text Input with Clear Button */}
          <View
            className="flex-1 flex-row items-center rounded-3xl px-4 min-h-[48px]"
            style={{ backgroundColor: colors.surface }}
          >
            <TextInput
              ref={inputRef}
              value={message}
              onChangeText={setMessage}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={500}
              editable={!disabled && !isProcessing}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleSend}
              className="flex-1 text-base py-3 max-h-24"
              style={{ color: colors.foreground }}
              testID="search-input"
              accessibilityLabel="Protocol search input"
            />
            
            {/* Clear Button */}
            {showClear && (
              <TouchableOpacity
                onPress={handleClear}
                style={{
                  marginLeft: 8,
                  minWidth: 44,
                  minHeight: 44,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
                accessibilityLabel="Clear search input"
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={14} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Send Button or Loading */}
          {isProcessing ? (
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{
                backgroundColor: canSend ? colors.primary : colors.surface,
                opacity: canSend ? 1 : 0.5,
              }}
              activeOpacity={0.7}
              accessibilityLabel="Send protocol search"
              accessibilityRole="button"
              accessibilityHint={canSend ? "Submits your protocol search query" : "Enter a search query first"}
              accessibilityState={{ disabled: !canSend }}
            >
              <IconSymbol
                name="arrow.up.circle.fill"
                size={24}
                color={canSend ? "#FFFFFF" : colors.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
