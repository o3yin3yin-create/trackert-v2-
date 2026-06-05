"use client";
import React from 'react';

export default class FriendsBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FriendsPanel Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-6 text-white text-left">
          <div className="bg-red-500/20 p-6 rounded-xl border border-red-500">
            <h2 className="text-xl font-bold mb-4">Error Rendering Friends Panel</h2>
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {this.state.error && this.state.error.toString()}
            </pre>
            <button 
              onClick={this.props.onClose}
              className="mt-6 bg-white text-black px-4 py-2 rounded-lg font-bold"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
