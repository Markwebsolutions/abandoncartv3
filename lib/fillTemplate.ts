// Helper to substitute template variables in a template string
export function fillTemplate(text: string, cart: any) {
  const productNames = cart.items?.map((i: any) => i.name).join(", ") || '';
  const amount = typeof cart.cartValue === 'number' ? `₹${cart.cartValue.toLocaleString()}` : '';
  const variables: Record<string, string> = {
    name: cart.customer?.name || '',
    product: productNames,
    company: cart.company || 'Your Store',
    amount,
    order_id: cart.order_id || cart.orderId || '',
    tracking_url: cart.tracking_url || cart.trackingUrl || '',
    checkout_url: cart.checkout_url || cart.checkoutUrl || '',
  };
  return text.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
}
