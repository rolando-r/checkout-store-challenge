import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks';

export function RequireProduct() {
  const hasProduct = useAppSelector((state) => state.product.selected !== null);
  return hasProduct ? <Outlet /> : <Navigate to="/" replace />;
}