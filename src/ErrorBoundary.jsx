import React from "react";

/**
 * App-wide safety net. A render error in any component would otherwise blank the
 * whole page (for BOTH phones). This catches it and shows a soft recovery screen
 * instead — the shared data is safe in Supabase, so a reload almost always fixes
 * it. Error boundaries must be class components.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] caught:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error?.message || String(this.state.error);
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#FDF8F4", fontFamily: "ui-rounded, 'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center", background: "#fff", border: "1.5px solid #EAE7E1", borderRadius: 28, padding: "32px 26px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>🫧</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 20, fontWeight: 800, color: "#57534E" }}>Something hiccuped</h1>
          <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5, color: "#A8A29E" }}>
            The page tripped over itself — but nothing's lost. All your plans are saved in the cloud. A quick reload usually sorts it out. 💛
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ appearance: "none", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#f472b6,#a78bfa)", color: "#fff", fontWeight: 800, fontSize: 15, padding: "12px 28px", borderRadius: 16 }}
          >
            Reload
          </button>
          <details style={{ marginTop: 22, textAlign: "left" }}>
            <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#C4BFB8", listStyle: "none" }}>Technical details</summary>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, color: "#A8A29E", background: "#FAF7F4", border: "1px solid #EEE9E3", borderRadius: 12, padding: 12, maxHeight: 160, overflow: "auto" }}>{msg}</pre>
          </details>
        </div>
      </div>
    );
  }
}
