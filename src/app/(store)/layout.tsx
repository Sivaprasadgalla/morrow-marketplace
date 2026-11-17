import { CartDrawer } from "@/components/cart/cart-drawer";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollProgress />
      <StoreHeader />
      <main>{children}</main>
      <StoreFooter />
      <CartDrawer />
    </>
  );
}
