import React, { useEffect, useMemo, useRef, useState } from "react";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  minWidth = 120,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = useMemo(
    () => options.find((item) => item.value === value) || options[0] || null,
    [options, value]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (nextValue) => {
    if (disabled) return;
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          padding: "8px 32px 8px 12px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 13,
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {selected?.label || "请选择"}
      </button>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          color: "var(--muted)",
          pointerEvents: "none",
          transition: "transform 0.15s ease",
        }}
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "var(--surface)",
            boxShadow: "0 10px 28px rgba(15, 20, 30, 0.2)",
            overflow: "hidden",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {options.map((item) => {
            const active = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleSelect(item.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "none",
                  background: active ? "rgba(109,94,251,0.1)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text)",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
