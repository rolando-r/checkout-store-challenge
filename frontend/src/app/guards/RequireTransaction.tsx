import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks';

export function RequireTransaction() {
  const hasTransaction = useAppSelector((state) => state.payment.transactionId !== null);
  return hasTransaction ? <Outlet /> : <Navigate to="/" replace />;
}