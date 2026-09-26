import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks';

export function RequireDeliveryDetails() {
  const hasDeliveryDetails = useAppSelector((state) => state.checkout.deliveryAddress !== null);
  return hasDeliveryDetails ? <Outlet /> : <Navigate to="/" replace />;
}