import React from "react";
import { logRuntimeIssue } from "../utils/reliability";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log utile in dev
    console.error("ErrorBoundary caught:", error, info);
    logRuntimeIssue(error, "error_boundary");
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "Arial" }}>
          <h2>Ops, si è verificato un problema.</h2>
          <p>
            Puoi ricaricare la pagina. Se l’errore persiste, controlla la console.
          </p>
          <button onClick={this.handleReload}>Ricarica</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
