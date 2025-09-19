import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const SPEED_MAP = { slow: 1000, medium: 500, fast: 200 };

export default function CodeVisualizer() {
  // State Hooks
  const [code, setCode] = useState(`for i in range(3):\n    print(i)\nprint("done")`);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState("medium");

  const [execFlex, setExecFlex] = useState(4);
  const [varsFlex, setVarsFlex] = useState(3);
  const [outputFlex, setOutputFlex] = useState(3);

  // Refs
  const intervalRef = useRef(null);
  const draggingRef = useRef(null);
  const startYRef = useRef(0);
  const startFlexRef = useRef(0);

  const stepInterval = SPEED_MAP[speed] || 500;
  const currentVars = steps[currentStep]?.variables || {};

  // Code Execution
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
    if (paused) {
      setPaused(false);
    } else {
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

  // Step Interval Effect
  useEffect(() => {
    if (!running || paused || steps.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev + 1 < steps.length) return prev + 1;

        clearInterval(intervalRef.current);
        setRunning(false);
        return prev;
      });
    }, stepInterval);

    return () => clearInterval(intervalRef.current);
  }, [running, paused, steps, stepInterval]);

  // Drag & Resize Panels
  const startDrag = (panel, e) => {
    e.preventDefault();
    draggingRef.current = panel;
    startYRef.current = e.clientY;
    startFlexRef.current = panel === "exec" ? execFlex : varsFlex;

    const onMouseMove = (eMove) => {
      const container = document.getElementById("rightPanel");
      if (!container) return;
      const containerHeight = container.clientHeight;
      const deltaY = eMove.clientY - startYRef.current;
      const totalFlex = execFlex + varsFlex + outputFlex;
      const deltaFlex = (deltaY / containerHeight) * totalFlex;

      if (draggingRef.current === "exec") setExecFlex(Math.max(1, startFlexRef.current + deltaFlex));
      if (draggingRef.current === "vars") setVarsFlex(Math.max(1, startFlexRef.current + deltaFlex));
    };

    const onMouseUp = () => {
      draggingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Derived Outputs
  const accumulatedOutput = steps
    .slice(0, currentStep + 1)
    .map((s) => s.output)
    .filter(Boolean)
    .join("");

  // Render
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
        <div id="rightPanel" style={styles.rightPanel}>
          {/* Execution Viewer */}
          <div style={{ ...styles.panel, flex: execFlex }}>
            <h3 style={styles.panelTitle}>Execution Viewer</h3>
            <div style={styles.codeLines}>
              {code.split("\n").map((lineText, index) => {
                const isCurrent = steps[currentStep]?.line === index + 1;
                return (
                  <div
                    key={index}
                    style={{
                      backgroundColor: isCurrent ? "rgba(255,0,255,0.3)" : "transparent",
                      padding: "2px",
                      borderRadius: "4px",
                    }}
                  >
                    {lineText}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={styles.dragBar} onMouseDown={(e) => startDrag("exec", e)} />

          {/* Variables Panel */}
          <div style={{ ...styles.panel, flex: varsFlex }}>
            <h3 style={styles.panelTitle}>Variables</h3>
            {Object.entries(currentVars).length === 0
              ? "No variables yet"
              : Object.entries(currentVars).map(([k, v]) => (
                  <div key={k}>
                    <strong>{k}</strong>: {v}
                  </div>
                ))}
          </div>
          <div style={styles.dragBar} onMouseDown={(e) => startDrag("vars", e)} />

          {/* Output Panel */}
          <div style={{ ...styles.panel, flex: outputFlex, color: "#00ff00", whiteSpace: "pre-wrap" }}>
            <h3 style={styles.panelTitle}>Output</h3>
            {accumulatedOutput || "No output yet"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    height: "100vh",
    backgroundColor: "#1e1e1e",
    color: "#f0f0f0",
    display: "flex",
    flexDirection: "column",
  },
  header: { padding: "20px" },
  title: { margin: 0, color: "#ff80ff" },
  main: { flex: 1, display: "flex", gap: "20px", padding: "0 20px 20px 20px" },
  editorContainer: { flex: 1, position: "relative", display: "flex", flexDirection: "column" },
  controls: { position: "absolute", bottom: "10px", left: "10px", display: "flex", gap: "10px" },
  button: {
    padding: "5px 10px",
    backgroundColor: "#3a3d41",
    color: "#f0f0f0",
    border: "1px solid #555",
    borderRadius: "4px",
    cursor: "pointer",
  },
  select: { marginLeft: "10px" },
  rightPanel: { flex: 1, display: "flex", flexDirection: "column", gap: "5px" },
  panel: {
    minHeight: 0,
    borderRadius: "8px",
    backgroundColor: "#2d2d2d",
    padding: "10px",
    fontFamily: "monospace",
    overflowY: "auto",
  },
  panelTitle: { color: "#ff80ff" },
  codeLines: { whiteSpace: "pre-wrap" },
  dragBar: { height: "5px", cursor: "row-resize", backgroundColor: "#555" },
};
