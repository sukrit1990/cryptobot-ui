// Quick script to fix existing subscription payment method
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixSubscriptionPaymentMethod() {
  try {
    // Get the subscription ID from your user record
    const subscriptionId = 'sub_1RoSuGAU0aPHWB2SYSUGYqw8'; // Replace with actual subscription ID
    
    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('Current subscription default payment method:', subscription.default_payment_method);
    
    // Get the customer
    const customer = await stripe.customers.retrieve(subscription.customer);
    console.log('Customer default payment method:', customer.invoice_settings?.default_payment_method);
    
    // If customer has a default payment method but subscription doesn't, update subscription
    if (customer.invoice_settings?.default_payment_method && !subscription.default_payment_method) {
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        default_payment_method: customer.invoice_settings.default_payment_method
      });
      console.log('Updated subscription default payment method:', updatedSubscription.default_payment_method);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run if you need to fix existing subscription
// fixSubscriptionPaymentMethod();

console.log('Script ready. Uncomment the last line to run.');