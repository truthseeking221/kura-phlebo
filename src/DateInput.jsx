// Date inputs with a "ghost placeholder" that stays visible as the user types.
// Format characters: any letter slot (M, D, Y) consumes one digit.
// Any non-letter is treated as a separator and is auto-inserted.
import { forwardRef } from "react";

export function formatByPattern(digits, pattern) {
  let out = "";
  let di = 0;
  for (let pi = 0; pi < pattern.length; pi++) {
    const pc = pattern[pi];
    if (/[A-Za-z]/.test(pc)) {
      if (di >= digits.length) break;
      out += digits[di++];
    } else {
      if (di >= digits.length) break;
      out += pc;
    }
  }
  return out;
}

export function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

export function maxDigitsOf(pattern) {
  return pattern.replace(/[^A-Za-z]/g, "").length;
}

// Wrap any input to render a "ghost" overlay showing the still-unfilled portion
// of `pattern` after `value`. Children must be a single <input> styled like .input.
export function GhostPlaceholder({ value = "", pattern, children, padLeft = 12, padRight = 12 }) {
  const v = value || "";
  const remainder = v.length < pattern.length ? pattern.slice(v.length) : "";
  return (
    <div className="ghost-input-wrap">
      <div
        className="ghost-input-overlay"
        aria-hidden="true"
        style={{ paddingLeft: padLeft, paddingRight: padRight }}
      >
        <span className="ghost-typed">{v}</span>
        <span className="ghost-remainder">{remainder}</span>
      </div>
      {children}
    </div>
  );
}

// Self-contained reusable date input. Auto-formats digits according to `format`
// (e.g. "MM/YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "DD MM YYYY").
// `value` and `onChange` operate on the formatted display string.
export const DateInput = forwardRef(function DateInput(
  { value = "", onChange, format, className = "input", padLeft, padRight, style, ...rest },
  ref
) {
  const handleChange = (e) => {
    const max = maxDigitsOf(format);
    const digits = digitsOnly(e.target.value).slice(0, max);
    onChange?.(formatByPattern(digits, format));
  };

  return (
    <GhostPlaceholder
      value={value}
      pattern={format}
      padLeft={padLeft ?? (style?.paddingLeft ?? 12)}
      padRight={padRight ?? (style?.paddingRight ?? 12)}
    >
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={className + " ghost-input"}
        value={value}
        onChange={handleChange}
        placeholder=""
        maxLength={format.length}
        style={style}
        {...rest}
      />
    </GhostPlaceholder>
  );
});
