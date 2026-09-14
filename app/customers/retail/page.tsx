import { redirect } from 'next/navigation';

export default function RetailCustomersPage() {
  redirect('/customers?type=Retail');
}
