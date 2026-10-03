"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function FlowDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby="flow-title" className="flow-dialog" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="flow-title">{title}</h2>
    {children}
    <button type="button" className="shop-secondary mt-4" onClick={onClose}>Close / decline</button>
  </dialog>;
}
