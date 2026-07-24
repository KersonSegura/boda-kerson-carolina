import { getAllCategories } from "@/lib/categories-store";
import { getAllGifts } from "@/lib/gifts-store";
import { toPublicGifts } from "@/lib/gift-utils";
import { GiftListPage } from "@/components/GiftListPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  let gifts: Awaited<ReturnType<typeof getAllGifts>> = [];
  let categories: Awaited<ReturnType<typeof getAllCategories>> = [];

  const [giftsResult, categoriesResult] = await Promise.allSettled([
    getAllGifts(),
    getAllCategories(),
  ]);

  if (giftsResult.status === "fulfilled") {
    gifts = giftsResult.value;
  } else {
    console.error("Error cargando regalos:", giftsResult.reason);
  }

  if (categoriesResult.status === "fulfilled") {
    categories = categoriesResult.value;
  } else {
    console.error("Error cargando categorías:", categoriesResult.reason);
  }

  return (
    <GiftListPage
      initialGifts={toPublicGifts(gifts)}
      initialCategories={categories}
    />
  );
}
