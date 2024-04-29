const stripe = require("stripe");
const { createClient: createSupabaseClient } = require("@supabase/supabase-js");

const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY);

