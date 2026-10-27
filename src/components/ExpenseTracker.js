"use client";
import { memo, useEffect, useRef } from "react";
import "./ExpenseTracker.css";

// The flip & BRRRR expense ledger. It renders its own markup into the
// containers below (see src/lib/expense-tracker/app.js) and keeps its data
// in this browser's localStorage. React only owns the empty shells, so this
// component never re-renders their contents.
function ExpenseTracker() {
  var rootRef = useRef(null);

  useEffect(function () {
    var alive = true;
    var tracker = null;
    import("@/lib/expense-tracker/app").then(function (mod) {
      if (!alive) return;
      tracker = mod;
      mod.mount(rootRef.current);
    });
    return function () {
      alive = false;
      if (tracker) tracker.unmount();
    };
  }, []);

  return (
    <div ref={rootRef} className="xt">
      <div className="app">
        <aside className="sidebar" id="xt-sidebar" />
        <div className="scrim" data-action="close-nav" />
        <div className="main">
          <div className="topbar" id="xt-topbar" />
          <div id="xt-view" />
        </div>
      </div>
      <div id="xt-modal-root" />
      <div id="xt-toasts" />
      <div id="xt-tip" className="tip" role="tooltip" />
    </div>
  );
}

export default memo(ExpenseTracker);
