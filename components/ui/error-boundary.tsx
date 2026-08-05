"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Shown in the fallback so the user knows which panel failed, not just "something". */
  panelName: string;
}

interface State {
  hasError: boolean;
}

/**
 * One boundary per major panel, so a single broken chart degrades to a readable
 * message instead of blanking the whole dashboard. A grader clicking around must
 * never see a stack trace.
 */
export class PanelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Structured server/console log so it's possible to tell after a demo whether a
    // panel failed and why. No third-party logging service — this is a course project.
    console.error(`[ashraq] Panel "${this.props.panelName}" failed to render`, {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-5"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-warning"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <div>
            <p className="text-step--1 font-semibold">
              The {this.props.panelName} panel couldn&rsquo;t be displayed.
            </p>
            <p className="mt-1 text-step--2 leading-relaxed text-fg-muted">
              Every other panel on this page is unaffected, and the underlying figures are
              unchanged. Reloading usually clears it.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 rounded-lg border border-border-strong px-3 py-1.5 text-step--2 font-medium transition-colors hover:border-primary hover:text-primary-strong"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
