import { Route, Routes } from 'react-router-dom';
import { RequireProduct } from './guards/RequireProduct';
import { RequireDeliveryDetails } from './guards/RequireDeliveryDetails';
import { RequireTransaction } from './guards/RequireTransaction';
import { ProductPage } from '../pages/ProductPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { SummaryPage } from '../pages/SummaryPage';
import { ResultPage } from '../pages/ResultPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ProductPage />} />
      <Route element={<RequireProduct />}>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route element={<RequireDeliveryDetails />}>
          <Route path="/summary" element={<SummaryPage />} />
          <Route element={<RequireTransaction />}>
            <Route path="/result" element={<ResultPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}