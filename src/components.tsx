import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { imagePath, suitInfo } from "./data/cards";
import type { TarotCard } from "./data/types";
export function Emblem({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 5 38 25 58 31 38 37 32 59 26 37 6 31 26 25Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="32" cy="32" r="15" stroke="currentColor" />
      <circle cx="32" cy="32" r="5" stroke="currentColor" />
      <path
        d="m12 12 8 8m24 24 8 8m0-40-8 8M20 44l-8 8"
        stroke="currentColor"
      />
    </svg>
  );
}
export function CardArt({
  card,
  reversed = false,
  className = "",
  hideName = false,
  priority = false,
}: {
  card: TarotCard;
  reversed?: boolean;
  className?: string;
  hideName?: boolean;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [card.id]);
  return (
    <div className={`card-art ${className} ${reversed ? "is-reversed" : ""}`}>
      {!failed ? (
        <img
          src={imagePath(card.id)}
          alt={
            hideName
              ? "待辨认的韦特塔罗牌面"
              : `${card.name} ${card.english}${reversed ? "，逆位" : ""}`
          }
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="art-fallback">
          <span className="art-number">{card.numeral}</span>
          <div className="fallback-orbit">
            <Emblem />
          </div>
          <span className="fallback-suit">{suitInfo[card.suit].english}</span>
          {!hideName && <strong>{card.name}</strong>}
          <small>牌面学习卡 · 原图暂不可用</small>
        </div>
      )}
    </div>
  );
}
export function CardBack() {
  return (
    <div className="card-back">
      <div className="back-frame">
        <span>✧</span>
        <Emblem />
        <span>AS ABOVE · SO BELOW</span>
      </div>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="title-actions">{children}</div>}
    </div>
  );
}
export function SectionTitle({
  title,
  sub,
  to,
  label = "查看全部",
}: {
  title: string;
  sub?: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {to && (
        <Link className="text-link" to={to}>
          {label}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Emblem />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Sparkles size={17} />
      <div>{children}</div>
    </div>
  );
}
export function Confirm({
  open,
  title,
  children,
  onConfirm,
  onClose,
  action = "确认",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  action?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-top">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="关闭弹窗">
          <X size={20} />
        </button>
      </div>
      <div>{children}</div>
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          取消
        </button>
        <button className="button primary" onClick={onConfirm}>
          {action}
        </button>
      </div>
    </dialog>
  );
}
export function Saved({ text = "已保存" }: { text?: string }) {
  return (
    <span className="saved" role="status">
      <Check size={13} />
      {text}
    </span>
  );
}
