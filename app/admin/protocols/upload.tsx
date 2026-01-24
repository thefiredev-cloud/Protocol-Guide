/**
 * Protocol Upload Screen
 * Upload and process new protocol PDFs
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform } from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { uriToBase64 } from "@/lib/blob-utils";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

export default function UploadProtocolScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [file, setFile] = useState<{ name: string; uri: string; size: number } | null>(null);
  const [protocolNumber, setProtocolNumber] = useState("");
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const uploadMutation = trpc.agencyAdmin.uploadProtocol.useMutation({
    onSuccess: () => {
      utils.agencyAdmin.listProtocols.invalidate();
      router.back();
    },
    onError: (err) => {
      setError(err.message);
      setIsUploading(false);
    },
  });

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets[0];
      setFile({
        name: picked.name,
        uri: picked.uri,
        size: picked.size || 0,
      });

      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = picked.name.replace(/\.pdf$/i, "");
        setTitle(nameWithoutExt);
      }

      setError(null);
    } catch {
      setError("Failed to pick file");
    }
  };

  const handleUpload = async () => {
    if (!file || !agencyId || !protocolNumber || !title) {
      setError("Please fill all required fields");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Read file as base64 (cross-platform)
      const base64 = await uriToBase64(file.uri);

      await uploadMutation.mutateAsync({
        agencyId,
        fileName: file.name,
        fileBase64: base64,
        mimeType: "application/pdf",
        protocolNumber,
        title,
        version,
        effectiveDate: effectiveDate || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Upload Protocol</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* File Picker */}
      <TouchableOpacity
        style={[
          styles.filePicker,
          {
            backgroundColor: colors.card,
            borderColor: file ? colors.primary : colors.border,
          },
        ]}
        onPress={handlePickFile}
      >
        {file ? (
          <View style={styles.fileInfo}>
            <IconSymbol name="doc.fill" size={32} color={colors.primary} />
            <View style={styles.fileDetails}>
              <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={[styles.fileSize, { color: colors.muted }]}>
                {formatFileSize(file.size)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setFile(null)}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.filePickerContent}>
            <IconSymbol name="arrow.up.doc" size={40} color={colors.muted} />
            <Text style={[styles.filePickerText, { color: colors.foreground }]}>
              Tap to select PDF file
            </Text>
            <Text style={[styles.filePickerHint, { color: colors.muted }]}>
              Max file size: 50MB
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Form Fields */}
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Protocol Number <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g., 1.2.3 or ALS-001"
            placeholderTextColor={colors.muted}
            value={protocolNumber}
            onChangeText={setProtocolNumber}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Title <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Protocol title"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Version</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="1.0"
              placeholderTextColor={colors.muted}
              value={version}
              onChangeText={setVersion}
            />
          </View>

          <View style={[styles.field, { flex: 2 }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Effective Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              value={effectiveDate}
              onChangeText={setEffectiveDate}
            />
          </View>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.error + "15" }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Upload Info */}
      <View style={[styles.infoBox, { backgroundColor: colors.primary + "10" }]}>
        <IconSymbol name="info.circle.fill" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.foreground }]}>
          After upload, the protocol will be automatically processed to extract text and generate
          searchable chunks. This may take a few minutes.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: file && protocolNumber && title ? colors.primary : colors.muted,
            opacity: isUploading ? 0.7 : 1,
          },
        ]}
        onPress={handleUpload}
        disabled={isUploading || !file || !protocolNumber || !title}
      >
        <Text style={styles.submitButtonText}>
          {isUploading ? "Uploading..." : "Upload Protocol"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  filePicker: {
    marginHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  filePickerContent: {
    padding: 40,
    alignItems: "center",
  },
  filePickerText: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 12,
  },
  filePickerHint: {
    fontSize: 13,
    marginTop: 4,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  form: {
    padding: 24,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  infoBox: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
