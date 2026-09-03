import { redirect } from 'next/navigation';

/** /merchant folded into the studio Demand tab (SITEMAP.md). Keep the path
 * so shared links still resolve. */
export default function MerchantPage() {
  redirect('/studio?tab=demand');
}
