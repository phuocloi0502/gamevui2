// @refresh reload
import type { ChangeEvent } from 'react';

export function NumberField({ label, value, step = 0.1, onChange }: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : ''} onChange={event => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(next);
      }} />
    </label>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value as T)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function CheckboxField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} /> {label}
    </label>
  );
}

export function TintField({ value, onChange }: { value: number | undefined; onChange: (value: number | undefined) => void }) {
  const enabled = value !== undefined;
  const color = `#${(value ?? 0xffffff).toString(16).padStart(6, '0').slice(-6)}`;
  const onToggle = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked ? Number.parseInt(color.slice(1), 16) : undefined);
  };
  return (
    <label className="tint-field">
      <input type="checkbox" checked={enabled} onChange={onToggle} /> Màu phủ
      <input type="color" value={color} disabled={!enabled} onChange={event => onChange(Number.parseInt(event.target.value.slice(1), 16))} />
    </label>
  );
}
