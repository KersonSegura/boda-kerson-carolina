import { getAllCategories } from "@/lib/categories-store";
import { getAllGifts } from "@/lib/gifts-store";
import { toPublicGifts } from "@/lib/gift-utils";
import { GiftListPage } from "@/components/GiftListPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [gifts, categories] = await Promise.all([
    getAllGifts(),
    getAllCategories(),
  ]);

  return (
    <GiftListPage
      initialGifts={toPublicGifts(gifts)}
      initialCategories={categories}
    />
  );
}
