import { redirect } from 'next/navigation';

export default function WholesaleCustomersPage() {
  redirect('/customers?type=Wholesale');
}
