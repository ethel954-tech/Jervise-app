import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Circle, Line, Text as SvgText, G } from "react-native-svg";
import { colors as C } from "../theme";

// Diagram renderer for Phase 3.8
// Renders Mermaid-style diagrams or custom SVG steps

interface DiagramProps {
  type: "flowchart" | "sequence" | "svg" | "mermaid";
  data: any;
  currentStep: number; // Which step is currently being spoken
  highlightedStep: number; // Which step to highlight
}

export default function Diagram({ type, data, highlightedStep }: DiagramProps) {
  switch (type) {
    case "flowchart":
      return <FlowchartDiagram data={data} highlightedStep={highlightedStep} />;
    case "sequence":
      return <SequenceDiagram data={data} highlightedStep={highlightedStep} />;
    case "svg":
      return <SvgDiagram data={data} highlightedStep={highlightedStep} />;
    default:
      return <SimpleDiagram data={data} highlightedStep={highlightedStep} />;
  }
}

function FlowchartDiagram({ data, highlightedStep }: { data: any; highlightedStep: number }) {
  const nodes = data.nodes || [];
  const width = 280;
  const height = Math.max(200, nodes.length * 60 + 40);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {nodes.map((node: any, i: number) => {
          const y = 40 + i * 55;
          const isHighlighted = i === highlightedStep;
          return (
            <G key={node.id || i}>
              <Rect
                x={40}
                y={y - 20}
                width={width - 80}
                height={40}
                rx={8}
                fill={isHighlighted ? C.accent : C.card}
                stroke={isHighlighted ? C.white : C.border}
                strokeWidth={isHighlighted ? 2 : 1}
              />
              <SvgText
                x={width / 2}
                y={y + 5}
                textAnchor="middle"
                fontSize={12}
                fill={isHighlighted ? C.white : C.white}
                fontWeight={isHighlighted ? "600" : "400"}
              >
                {node.label || `Step ${i + 1}`}
              </SvgText>
              {/* Arrow to next node */}
              {i < nodes.length - 1 && (
                <Line
                  x1={width / 2}
                  y1={y + 20}
                  x2={width / 2}
                  y2={y + 35}
                  stroke={C.soft}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function SequenceDiagram({ data, highlightedStep }: { data: any; highlightedStep: number }) {
  const participants = data.participants || [];
  const messages = data.messages || [];
  const width = 280;
  const height = Math.max(200, messages.length * 40 + 80);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Participant columns */}
        {participants.map((p: any, i: number) => {
          const x = 40 + i * ((width - 80) / (participants.length - 1 || 1));
          return (
            <G key={p.id || i}>
              <Circle cx={x} cy={20} r={8} fill={C.accent} />
              <SvgText x={x} y={45} textAnchor="middle" fontSize={10} fill={C.white}>
                {p.name}
              </SvgText>
            </G>
          );
        })}

        {/* Messages */}
        {messages.map((msg: any, i: number) => {
          const isActive = i === highlightedStep;
          const fromIdx = participants.findIndex((p: any) => p.id === msg.from);
          const toIdx = participants.findIndex((p: any) => p.id === msg.to);
          const fromX = 40 + fromIdx * ((width - 80) / (participants.length - 1 || 1));
          const toX = 40 + toIdx * ((width - 80) / (participants.length - 1 || 1));
          const y = 60 + i * 35;

          return (
            <G key={i}>
              <Line
                x1={fromX}
                y1={y}
                x2={toX}
                y2={y}
                stroke={isActive ? C.accent : C.soft}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? undefined : "4 2"}
              />
              <Rect
                x={Math.min(fromX, toX) + 5}
                y={y - 12}
                width={Math.abs(toX - fromX) - 10}
                height={20}
                rx={4}
                fill={isActive ? C.accent : C.card}
                stroke={isActive ? C.white : C.border}
                strokeWidth={1}
              />
              <SvgText
                x={Math.min(fromX, toX) + (Math.abs(toX - fromX) - 10) / 2}
                y={y}
                textAnchor="middle"
                fontSize={10}
                fill={isActive ? C.white : C.white}
              >
                {msg.content?.slice(0, 20)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function SvgDiagram({ data, highlightedStep }: { data: any; highlightedStep: number }) {
  // Render custom SVG provided by the backend
  const svgContent = data.svg || "";

  return (
    <View style={[styles.container, { width: 280, height: 200, backgroundColor: C.card, borderRadius: 12 }]}>
      {/* In production, parse and render the SVG */}
      <Text style={{ color: C.soft, fontSize: 13, textAlign: "center", padding: 20 }}>
        {highlightedStep !== undefined ? `Diagram step ${highlightedStep + 1}` : "Diagram"}
      </Text>
      <Text style={{ color: C.light, fontSize: 12, textAlign: "center" }}>
        {data.description || "SVG diagram would render here"}
      </Text>
    </View>
  );
}

function SimpleDiagram({ data, highlightedStep }: { data: any; highlightedStep: number }) {
  const steps = data.steps || [];
  const width = 280;
  const height = Math.max(150, steps.length * 40 + 40);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 8 }}>
        {steps.map((step: any, i: number) => {
          const isHighlighted = i === highlightedStep;
          return (
            <View
              key={step.id || i}
              style={[
                styles.stepBadge,
                {
                  backgroundColor: isHighlighted ? C.accent : C.track,
                  borderColor: isHighlighted ? C.white : C.border,
                },
              ]}
            >
              <Text style={{ fontSize: 11, color: isHighlighted ? C.white : C.light }}>
                {step.label || `Step ${i + 1}`}
              </Text>
            </View>
          );
        })}
      </View>
      {highlightedStep !== undefined && highlightedStep < steps.length && (
        <Text style={{ color: C.soft, fontSize: 11, textAlign: "center", marginTop: 8 }}>
          {steps[highlightedStep]?.description || ""}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  stepBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
});
