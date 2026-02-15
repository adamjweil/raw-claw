import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, monoFont } from '../theme';
import { ToolCall } from '../types';
import { Badge } from './Badge';

interface ToolCallCardProps {
  toolCalls: ToolCall[];
}

interface SingleToolProps {
  tool: ToolCall;
}

const SingleTool: React.FC<SingleToolProps> = ({ tool }) => {
  const { colors, spacing, radius } = useTheme();
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  return (
    <View style={[styles.toolItem, { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.sm, padding: spacing.sm }]}>
      <View style={styles.toolHeader}>
        <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
        <View style={styles.toolMeta}>
          {tool.duration != null && (
            <Text style={[styles.duration, { color: colors.textMuted }]}>
              {(tool.duration / 1000).toFixed(1)}s
            </Text>
          )}
          <Badge status={tool.status} />
        </View>
      </View>

      {/* Collapsible input */}
      <Pressable
        onPress={() => setShowInput(!showInput)}
        style={[styles.toggleRow, { marginTop: spacing.xs }]}
      >
        <Ionicons
          name={showInput ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={colors.textMuted}
        />
        <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>Input</Text>
      </Pressable>
      {showInput && (
        <Text
          style={[
            styles.codeBlock,
            {
              color: colors.textSecondary,
              fontFamily: monoFont,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: radius.sm,
              padding: spacing.sm,
            },
          ]}
        >
          {JSON.stringify(tool.input, null, 2)}
        </Text>
      )}

      {/* Collapsible output */}
      {tool.output != null && (
        <>
          <Pressable
            onPress={() => setShowOutput(!showOutput)}
            style={[styles.toggleRow, { marginTop: spacing.xs }]}
          >
            <Ionicons
              name={showOutput ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={colors.textMuted}
            />
            <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>Output</Text>
          </Pressable>
          {showOutput && (
            <Text
              style={[
                styles.codeBlock,
                {
                  color: colors.textSecondary,
                  fontFamily: monoFont,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                },
              ]}
              numberOfLines={20}
            >
              {tool.output}
            </Text>
          )}
        </>
      )}
    </View>
  );
};

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCalls }) => {
  const { colors, spacing, radius } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.container, { marginTop: spacing.sm }]}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[
          styles.summaryRow,
          {
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: radius.sm,
            padding: spacing.sm,
          },
        ]}
      >
        <View style={styles.summaryLeft}>
          <Text style={{ fontSize: 14 }}>🔧</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            Used {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={[styles.toolsList, { gap: spacing.sm, marginTop: spacing.sm }]}>
          {toolCalls.map((tool) => (
            <SingleTool key={tool.id} tool={tool} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 13, fontWeight: '500' },
  toolsList: {},
  toolItem: {},
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolName: { fontSize: 13, fontWeight: '600' },
  toolMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  duration: { fontSize: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: 12, fontWeight: '500' },
  codeBlock: { fontSize: 11, marginTop: 4, lineHeight: 16 },
});

