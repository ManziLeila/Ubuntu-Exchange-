'use client';

import { useRef, useEffect } from 'react';

export default function OtpInput({
  length = 6,
  value = '',
  onChange,
  autoFocus = false,
}) {
  const inputsRef = useRef([]);

  // Autofocus first box on mount
  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  // Build an array from the current string value
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  function updateValue(index, digit) {
    const arr = Array.from({ length }, (_, i) => value[i] || '');
    arr[index] = digit;
    onChange(arr.join(''));
  }

  function handleChange(e, index) {
    const raw = e.target.value;
    // Take only the last character entered (in case browser fills more)
    const char = raw.replace(/\D/g, '').slice(-1);
    if (!char) return;
    updateValue(index, char);
    // Advance focus
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current box
        updateValue(index, '');
      } else if (index > 0) {
        // Move back and clear
        inputsRef.current[index - 1]?.focus();
        updateValue(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted.padEnd(length, '').slice(0, length).replace(/ /g, ''));
    // Actually build exact string
    const newVal = pasted.slice(0, length);
    onChange(newVal);
    // Focus the box after the last pasted digit
    const nextIndex = Math.min(newVal.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
  }

  return (
    <div className="flex gap-2" aria-label="OTP input">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1}`}
          className={[
            'w-11 h-12 text-center text-lg font-semibold rounded-lg border-2 bg-white text-gray-900 caret-transparent',
            'transition-all duration-150 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
            digit
              ? 'border-blue-400'
              : 'border-gray-300',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
