import React from "react";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`rounded-3xl border ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}