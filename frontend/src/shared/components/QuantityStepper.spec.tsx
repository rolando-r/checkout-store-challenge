import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('renders the current value', () => {
    render(<QuantityStepper value={2} max={5} onChange={jest.fn()} />);
    expect(screen.getByTestId('quantity-value')).toHaveTextContent('2');
  });

  it('calls onChange with value + 1 when increment is clicked', async () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={2} max={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with value - 1 when decrement is clicked', async () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={2} max={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('disables decrement at the minimum', () => {
    render(<QuantityStepper value={1} min={1} max={5} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
  });

  it('disables increment at the maximum', () => {
    render(<QuantityStepper value={5} max={5} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
  });

  it('disables both buttons when disabled prop is true', () => {
    render(<QuantityStepper value={2} max={5} onChange={jest.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
  });
});
