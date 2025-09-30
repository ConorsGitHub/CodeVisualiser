import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const SPEED_MAP = { slow: 1000, medium: 500, fast: 200 };

export default function CodeVisualizer() {
  const [code, setCode] = useState(`for i in range(3):\n    print(i)\nprint("done")`);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState("medium");

  // Scroll-to-current toggle
  const [followCurrent, setFollowCurrent] = useState(true);

  // Adjusted flex: more space to execution viewer
  const execFlex = 5;
  const varsFlex = 2;
  const outputFlex = 3;

  const intervalRef = useRef(null);
  const currentVars = steps[currentStep]?.variables || {};

  // Refs for execution lines
  const lineRefs = useRef([]);

  // Scroll execution box to current line if toggle is on
  useEffect(() => {
    if (!followCurrent) return;
    const lineEl = lineRefs.current[currentStep];
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep, followCurrent]);

  const accumulatedOutput = steps
    .slice(0, currentStep + 1)
    .map((s) => s.output)
    .filter(Boolean)
    .join("");

  const runCode = async () => {
    setRunning(true);
    setPaused(false);
    setCurrentStep(0);
    setSteps([]);

    try {
      const res = await fetch("https://codevisualiser.onrender.com/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setSteps(data.steps || []);
    } catch (err) {
      console.error("Error executing code:", err);
      setRunning(false);
    }
  };

  const togglePause = () => {
    if (paused) setPaused(false);
    else {
      clearInterval(intervalRef.current);
      setPaused(true);
    }
  };

  const cancelExecution = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setCurrentStep(0);
    setSteps([]);
  };

  // Step interval effect
  useEffect(() => {
    if (!running || paused || steps.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev + 1 < steps.length) return prev + 1;
        clearInterval(intervalRef.current);
        setRunning(false);
        return prev;
      });
    }, SPEED_MAP[speed] || 500);

    return () => clearInterval(intervalRef.current);
  }, [running, paused, steps, speed]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Code Visualiser</h1>
      </div>

      <div style={styles.main}>
        {/* Editor Panel */}
        <div style={styles.editorContainer}>
          <Editor
            height="100%"
            language="python"
            value={code}
            onChange={setCode}
            theme="vs-dark"
          />
          <div style={styles.controls}>
            <button onClick={runCode} disabled={running} style={styles.button}>
              {running ? "Running..." : "Run"}
            </button>
            <button onClick={togglePause} disabled={!running} style={styles.button}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={cancelExecution} style={styles.button}>
              Cancel
            </button>
            <select value={speed} onChange={(e) => setSpeed(e.target.value)} style={styles.select}>
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          {/* Execution Viewer */}
          <div style={{ ...styles.panel, flex: execFlex }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={styles.panelTitle}>Execution Viewer</h3>
              <label style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={followCurrent}
                  onChange={(e) => setFollowCurrent(e.target.checked)}
                  style={{ marginRight: 4 }}
                />
                Follow Line
              </label>
            </div>
            <div style={styles.panelScroll}>
              {code.split("\n").map((lineText, index) => {
                const isCurrent = steps[currentStep]?.line === index + 1;
                return (
                  <pre
                    key={index}
                    ref={(el) => (lineRefs.current[index] = el)}
                    style={{
                      margin: 0,
                      whiteSpace: "pre",
                      backgroundColor: isCurrent ? "rgba(255,0,255,0.3)" : "transparent",
                      borderRadius: "4px",
                      padding: "2px 4px",
                    }}
                  >
                    {lineText || "\u00A0"}
                  </pre>
                );
              })}
            </div>

            {/* Step Slider */}
            {steps.length > 0 && (
              <div style={styles.sliderContainer}>
                <input
                  type="range"
                  min={0}
                  max={steps.length - 1}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  style={styles.slider}
                />
                <div style={styles.sliderLabel}>
                  Step {currentStep} / {steps.length - 1}
                </div>
              </div>
            )}
          </div>

          {/* Variables Panel */}
          <div style={{ ...styles.panel, flex: varsFlex }}>
            <h3 style={styles.panelTitle}>Variables</h3>
            <div style={styles.panelScroll}>
              {Object.entries(currentVars).length === 0
                ? "No variables yet"
                : Object.entries(currentVars).map(([k, v]) => (
                    <div key={k}>
                      <strong>{k}</strong>: {v}
                    </div>
                  ))}
            </div>
          </div>

          {/* Output Panel */}
          <div style={{ ...styles.panel, flex: outputFlex, color: "#00ff00" }}>
            <h3 style={styles.panelTitle}>Output</h3>
            <div style={styles.panelScroll}>
              {accumulatedOutput
                ? accumulatedOutput.split("\n").map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))
                : "No output yet"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: { height: "100vh", backgroundColor: "#1e1e1e", color: "#f0f0f0", display: "flex", flexDirection: "column" },
  header: { padding: "20px" },
  title: { margin: 0, color: "#ff80ff" },
  main: { flex: 1, display: "flex", gap: "20px", padding: "0 20px 20px 20px", minHeight: 0 },
  editorContainer: { flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 },
  controls: { position: "absolute", bottom: "10px", left: "10px", display: "flex", gap: "10px" },
  button: { padding: "5px 10px", backgroundColor: "#3a3d41", color: "#f0f0f0", border: "1px solid #555", borderRadius: "4px", cursor: "pointer" },
  select: { marginLeft: "10px" },
  rightPanel: { flex: 1, display: "flex", flexDirection: "column", gap: "5px", minHeight: 0 },
  panel: { borderRadius: "8px", backgroundColor: "#2d2d2d", padding: "10px", fontFamily: "monospace", display: "flex", flexDirection: "column", overflow: "hidden" },
  panelScroll: { flex: 1, minHeight: 0, overflowY: "auto" },
  panelTitle: { color: "#ff80ff", marginBottom: "6px" },
  sliderContainer: { marginTop: "10px", display: "flex", flexDirection: "column", alignItems: "stretch" },
  slider: { width: "100%" },
  sliderLabel: { fontSize: "12px", textAlign: "center", marginTop: "4px" },
};
