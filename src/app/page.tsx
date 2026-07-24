import { getAllCategories } from "@/lib/categories-store";
import { getAllGifts } from "@/lib/gifts-store";
import { toPublicGifts } from "@/lib/gift-utils";
import { GiftListPage } from "@/components/GiftListPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  let gifts: Awaited<ReturnType<typeof getAllGifts>> = [];
  let categories: Awaited<ReturnType<typeof getAllCategories>> = [];

  try {
    [gifts, categories] = await Promise.all([getAllGifts(), getAllCategories()]);
  } catch (error) {
    console.error("Error cargando la página principal:", error);
  }

  return (
    <GiftListPage
      initialGifts={toPublicGifts(gifts)}
      initialCategories={categories}
    />
  );
}
