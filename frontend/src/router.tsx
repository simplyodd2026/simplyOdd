import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { useSession } from '@/stores/session'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
import RouteError from '@/pages/RouteError'

const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const SearchPage = lazy(() => import('@/pages/SearchPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const CustomPage = lazy(() => import('@/pages/CustomPage'))
const HelpPage = lazy(() => import('@/pages/HelpPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const AccountLayout = lazy(() => import('@/pages/account/AccountLayout'))
const ProfilePage = lazy(() => import('@/pages/account/ProfilePage'))
const OrdersPage = lazy(() => import('@/pages/account/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/pages/account/OrderDetailPage'))
const AddressesPage = lazy(() => import('@/pages/account/AddressesPage'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminProducts = lazy(() => import('@/pages/admin/ProductsPage'))
const AdminProductEdit = lazy(() => import('@/pages/admin/ProductEditPage'))
const AdminCategories = lazy(() => import('@/pages/admin/CategoriesPage'))
const AdminOrders = lazy(() => import('@/pages/admin/OrdersPage'))
const AdminOrderDetail = lazy(() => import('@/pages/admin/OrderDetailPage'))
const AdminCustomers = lazy(() => import('@/pages/admin/CustomersPage'))
const AdminCustomerDetail = lazy(() => import('@/pages/admin/CustomerDetailPage'))
const AdminCoupons = lazy(() => import('@/pages/admin/CouponsPage'))
const AdminReviews = lazy(() => import('@/pages/admin/ReviewsPage'))
const AdminNewsletter = lazy(() => import('@/pages/admin/NewsletterPage'))
const AdminCustomRequests = lazy(() => import('@/pages/admin/CustomRequestsPage'))

const s = (el: ReactNode) => <Suspense fallback={<PageSpinner />}>{el}</Suspense>

function RequireAuth({ admin }: { admin?: boolean }) {
  const { user, profile, ready } = useSession()
  const location = useLocation()
  if (!ready) return <PageSpinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (admin && !profile?.is_admin) return <NotFoundPage />
  return <Outlet />
}

function ToLogin() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/login', search }} replace />
}

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/shop', element: s(<CatalogPage preset="all" />) },
      { path: '/new', element: s(<CatalogPage preset="new" />) },
      { path: '/bestsellers', element: s(<CatalogPage preset="bestseller" />) },
      { path: '/collections', element: s(<CollectionsPage />) },
      { path: '/collections/:slug', element: s(<CatalogPage preset="category" />) },
      { path: '/product/:slug', element: s(<ProductPage />) },
      { path: '/search', element: s(<SearchPage />) },
      { path: '/cart', element: s(<CartPage />) },
      { path: '/wishlist', element: s(<WishlistPage />) },
      { path: '/about', element: s(<AboutPage />) },
      { path: '/customise', element: s(<CustomPage />) },
      // The page used to be called Commissions and lived at /custom; old links still land on it.
      { path: '/custom', element: <Navigate to="/customise" replace /> },
      { path: '/help/:topic', element: s(<HelpPage />) },
      { path: '/login', element: s(<LoginPage />) },
      // Google sign-in creates accounts, so the old email pages all lead to /login.
      ...['/signup', '/forgot-password', '/verify-email', '/auth/action'].map((path) => ({ path, element: <ToLogin /> })),
      {
        element: <RequireAuth />,
        children: [
          { path: '/checkout', element: s(<CheckoutPage />) },
          { path: '/order/:id', element: s(<OrderConfirmationPage />) },
          {
            path: '/account',
            element: s(<AccountLayout />),
            children: [
              { index: true, element: s(<ProfilePage />) },
              { path: 'orders', element: s(<OrdersPage />) },
              { path: 'orders/:id', element: s(<OrderDetailPage />) },
              { path: 'addresses', element: s(<AddressesPage />) },
              { path: 'wishlist', element: <Navigate to="/wishlist" replace /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireAuth admin />,
    errorElement: <RouteError />,
    children: [
      {
        path: '/admin',
        element: s(<AdminLayout />),
        children: [
          { index: true, element: s(<AdminDashboard />) },
          { path: 'products', element: s(<AdminProducts />) },
          { path: 'products/new', element: s(<AdminProductEdit />) },
          { path: 'products/:id', element: s(<AdminProductEdit />) },
          { path: 'categories', element: s(<AdminCategories />) },
          { path: 'orders', element: s(<AdminOrders />) },
          { path: 'orders/:id', element: s(<AdminOrderDetail />) },
          { path: 'customers', element: s(<AdminCustomers />) },
          { path: 'customers/:uid', element: s(<AdminCustomerDetail />) },
          { path: 'coupons', element: s(<AdminCoupons />) },
          { path: 'reviews', element: s(<AdminReviews />) },
          { path: 'newsletter', element: s(<AdminNewsletter />) },
          { path: 'custom-requests', element: s(<AdminCustomRequests />) },
        ],
      },
    ],
  },
])
