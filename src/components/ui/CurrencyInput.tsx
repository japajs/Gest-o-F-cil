import { forwardRef } from 'react';

interface Props {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  name?: string;
  hasError?: boolean;
  disabled?: boolean;
}

// Input monetário: aceita somente dígitos, vírgula e ponto.
// Compatível com react-hook-form via forwardRef.
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(
  ({ hasError, onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      e.target.value = e.target.value.replace(/[^\d,\.]/g, '');
      onChange?.(e);
    }
    return (
      <input
        {...props}
        ref={ref}
        onChange={handleChange}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        className={`input ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

// Converte string do input ("1.234,56" ou "1234.56") para number
export function parseCurrency(value: string): number {
  // Se tem vírgula como separador decimal: "1.234,56" → 1234.56
  if (value.includes(',')) {
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(value);
}

// Regras de validação reutilizáveis para react-hook-form
export const amountValidation = {
  required: 'Campo obrigatório',
  validate: (v: string) => {
    const n = parseCurrency(v);
    if (isNaN(n))       return 'Valor inválido';
    if (n <= 0)         return 'Valor deve ser maior que zero';
    if (n > 9_999_999_999.99) return 'Valor excede o limite de R$ 9.999.999.999,99';
    return true;
  },
};
