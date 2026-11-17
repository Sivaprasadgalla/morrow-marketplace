import { HomePage } from "@/components/store/home-page";
import { getCatalogProducts } from "@/lib/catalog";

export default async function Page() {
  const products = await getCatalogProducts();
  return <HomePage products={products} />;
}
