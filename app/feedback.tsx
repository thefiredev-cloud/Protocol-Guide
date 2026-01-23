import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Modal } from "@/components/ui/Modal";
import { useColors } from "@/hooks/use-colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import * as Haptics from "@/lib/haptics";

type FeedbackCategory = "error" | "suggestion" | "general";

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}

const CATEGORIES: { id: FeedbackCategory; label: string; icon: string; description: string }[] = [
  { 
    id: "error", 
    label: "Report Error", 
    icon: "⚠️",
    description: "Report incorrect or outdated protocol information"
  },
  { 
    id: "suggestion", 
    label: "Suggestion", 
    icon: "💡",
    description: "Suggest new features or improvements"
  },
  { 
    id: "general", 
    label: "General Feedback", 
    icon: "💬",
    description: "Share general comments or questions"
  },
];

export default function FeedbackScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ protocolRef?: string; category?: string }>();
  
  const [category, setCategory] = useState<FeedbackCategory>(
    (params.category as FeedbackCategory) || "general"
  );
  const [protocolRef, setProtocolRef] = useState(params.protocolRef || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    title: "",
    message: "",
    onDismiss: () => setModalState((prev) => ({ ...prev, visible: false })),
  });

  const submitFeedback = trpc.feedback.submit.useMutation();

  const showModal = (title: string, message: string, onDismiss?: () => void) => {
    setModalState({
      visible: true,
      title,
      message,
      onDismiss: () => {
        setModalState((prev) => ({ ...prev, visible: false }));
        onDismiss?.();
      },
    });
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      showModal("Missing Subject", "Please enter a subject for your feedback.");
      return;
    }
    if (!message.trim()) {
      showModal("Missing Message", "Please enter your feedback message.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFeedback.mutateAsync({
        category,
        subject: subject.trim(),
        message: message.trim(),
        protocolRef: protocolRef.trim() || undefined,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showModal(
          "Thank You!",
          "Your feedback has been submitted. We appreciate you helping us improve Protocol Guide.",
          () => router.back()
        );
      } else {
        showModal("Error", result.error || "Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      showModal("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View 
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 8 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground ml-2">Send Feedback</Text>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 px-4 py-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category Selection */}
          <Text className="text-base font-semibold text-foreground mb-3">
            What type of feedback?
          </Text>
          <View className="mb-6">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setCategory(cat.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <View 
                  className="flex-row items-center p-4 rounded-xl mb-2"
                  style={{ 
                    backgroundColor: category === cat.id ? colors.primary + "15" : colors.surface,
                    borderWidth: category === cat.id ? 2 : 1,
                    borderColor: category === cat.id ? colors.primary : colors.border,
                  }}
                >
                  <Text className="text-2xl mr-3">{cat.icon}</Text>
                  <View className="flex-1">
                    <Text 
                      className="text-base font-semibold"
                      style={{ color: category === cat.id ? colors.primary : colors.foreground }}
                    >
                      {cat.label}
                    </Text>
                    <Text className="text-sm text-muted">{cat.description}</Text>
                  </View>
                  {category === cat.id && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Protocol Reference (for error reports) */}
          {category === "error" && (
            <View className="mb-4">
              <Text className="text-base font-semibold text-foreground mb-2">
                Protocol Reference (optional)
              </Text>
              <TextInput
                value={protocolRef}
                onChangeText={setProtocolRef}
                placeholder="e.g., Cardiac Arrest - VF/pVT"
                placeholderTextColor={colors.muted}
                className="p-4 rounded-xl text-base"
                style={{ 
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.foreground,
                }}
              />
              <Text className="text-xs text-muted mt-1">
                Specify which protocol contains the error
              </Text>
            </View>
          )}

          {/* Subject */}
          <View className="mb-4">
            <Text className="text-base font-semibold text-foreground mb-2">
              Subject *
            </Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary of your feedback"
              placeholderTextColor={colors.muted}
              className="p-4 rounded-xl text-base"
              style={{ 
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.foreground,
              }}
              maxLength={255}
            />
          </View>

          {/* Message */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-foreground mb-2">
              Message *
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={
                category === "error" 
                  ? "Describe the error in detail. Include what the protocol currently says and what it should say."
                  : category === "suggestion"
                  ? "Describe your suggestion in detail. What problem would it solve?"
                  : "Share your feedback, questions, or comments."
              }
              placeholderTextColor={colors.muted}
              className="p-4 rounded-xl text-base"
              style={{ 
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.foreground,
                minHeight: 150,
                textAlignVertical: "top",
              }}
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              { 
                opacity: pressed || isSubmitting ? 0.8 : 1,
                backgroundColor: colors.primary,
              }
            ]}
            className="py-4 rounded-full items-center mb-8"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Submit Feedback
              </Text>
            )}
          </Pressable>

          {/* Info Note */}
          <View 
            className="p-4 rounded-xl mb-8"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm text-muted leading-5">
              Your feedback helps us improve Protocol Guide for all EMS professionals. 
              We review all submissions and may contact you for clarification if needed. 
              For urgent protocol errors, please also notify your medical director.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Feedback Modal */}
      <Modal
        visible={modalState.visible}
        onDismiss={modalState.onDismiss}
        title={modalState.title}
        message={modalState.message}
        variant="alert"
        testID="feedback-modal"
      />
    </ScreenContainer>
  );
}
