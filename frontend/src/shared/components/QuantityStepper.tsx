import styles from './QuantityStepper.module.css';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export function QuantityStepper({ value, min = 1, max, onChange, disabled = false, label = 'Quantity' }: QuantityStepperProps) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value - 1)}
        disabled={!canDecrement}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={styles.value} data-testid="quantity-value">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value + 1)}
        disabled={!canIncrement}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
