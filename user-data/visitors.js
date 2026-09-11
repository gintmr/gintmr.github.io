// Public configuration only. Database credentials and hashing secrets belong
// in Supabase Edge Function secrets, never in this file or generated HTML.
export const visitorConfig = {
  enabled: true,
  endpoint: 'https://gjofwuihpzjfqeaysuuy.supabase.co/functions/v1/visitor-analytics',
  allowedOrigins: ['https://gintmr.github.io'],
};
