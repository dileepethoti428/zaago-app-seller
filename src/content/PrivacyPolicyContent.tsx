import React from 'react';

const LAST_UPDATED = "December 27, 2024";
const POLICY_VERSION = "1.0";

export const PrivacyPolicyContent = () => {
  return (
    <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
      <p className="text-sm text-muted-foreground mb-6">
        Last Updated: {LAST_UPDATED} | Version: {POLICY_VERSION}
      </p>

      {/* 1. Introduction & Scope */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Introduction & Scope</h2>
        <p className="text-muted-foreground mb-4">
          Welcome to the Zaago Seller Platform ("Platform", "we", "us", or "our"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Seller Application ("Seller App") to list and sell products through our marketplace.
        </p>
        <p className="text-muted-foreground mb-4">
          This Privacy Policy applies specifically to sellers ("Seller", "you", or "your") who register on and use the Zaago Seller App. By accessing or using the Seller App, you agree to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access the Seller App.
        </p>
        <p className="text-muted-foreground">
          This policy is governed by and complies with the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 of India.
        </p>
      </section>

      {/* 2. Definitions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Definitions</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>"Seller"</strong> means any individual or business entity that registers on the Zaago Seller App to list, sell, and fulfill orders for products.</li>
          <li><strong>"Platform"</strong> means the Zaago ecosystem including the Seller App, Customer App, Delivery Partner App, and Admin Dashboard.</li>
          <li><strong>"Customer"</strong> means any end-user who purchases products from Sellers through the Zaago Customer App.</li>
          <li><strong>"Admin"</strong> means the Zaago platform administrators who manage and oversee platform operations.</li>
          <li><strong>"Delivery Partner"</strong> means individuals or entities who fulfill delivery services for orders placed on the Platform.</li>
          <li><strong>"Personal Data"</strong> means any information that identifies or can be used to identify you directly or indirectly.</li>
          <li><strong>"Sensitive Personal Data"</strong> includes financial information, payment details, and other data protected under applicable law.</li>
        </ul>
      </section>

      {/* 3. Information We Collect */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Information We Collect</h2>
        
        <h3 className="text-lg font-medium mb-3">3.1 Seller Personal Details</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
          <li>Full name and contact information</li>
          <li>Phone number (for verification and communication)</li>
          <li>Email address</li>
          <li>Profile photograph (if provided)</li>
          <li>Government-issued identification details for KYC verification</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.2 Business Details</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
          <li>Business/Store name and legal entity type</li>
          <li>Business address and operational location</li>
          <li>GSTIN (Goods and Services Tax Identification Number), if applicable</li>
          <li>FSSAI License number (for food-related products)</li>
          <li>Business registration documents</li>
          <li>Trade license and other regulatory permits</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.3 Bank and Payout Details</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
          <li>Bank account number and IFSC code</li>
          <li>Account holder name</li>
          <li>UPI ID (if provided)</li>
          <li>Payment settlement preferences</li>
          <li>Transaction history and payout records</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.4 Product Data</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
          <li>Product names, descriptions, and specifications</li>
          <li>Product images and media files uploaded by you</li>
          <li>Category and subcategory classifications</li>
          <li>SKU and inventory identifiers</li>
          <li>Product variants and attributes</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.5 Order, Pricing, and Inventory Data</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
          <li>Pricing information including MRP, selling price, and discounts</li>
          <li>Stock levels and inventory updates</li>
          <li>Order history, acceptance, and fulfillment records</li>
          <li>Cancellation and refund data</li>
          <li>Sales analytics and performance metrics</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.6 Location Data</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
          <li>Store/business location coordinates (latitude and longitude)</li>
          <li>Service area and delivery radius preferences</li>
          <li>Address verification data</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.7 Device, Log, IP, and Analytics Data</h3>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Device type, model, and operating system</li>
          <li>IP address and geolocation data</li>
          <li>App usage patterns and session data</li>
          <li>Browser type and version (for web access)</li>
          <li>Crash reports and error logs</li>
          <li>Push notification tokens and preferences</li>
        </ul>
      </section>

      {/* 4. Purpose of Data Usage */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Purpose of Data Usage</h2>
        
        <h3 className="text-lg font-medium mb-3">4.1 Order Processing</h3>
        <p className="text-muted-foreground mb-4">
          We use your data to facilitate order management, including receiving new orders, updating order status, coordinating with delivery partners, and ensuring timely fulfillment of customer orders.
        </p>

        <h3 className="text-lg font-medium mb-3">4.2 Payments & Settlements</h3>
        <p className="text-muted-foreground mb-4">
          Your bank details and transaction data are used to process payments, calculate commissions, generate invoices, and settle payouts to your registered bank account as per the agreed payment cycle.
        </p>

        <h3 className="text-lg font-medium mb-3">4.3 Notifications</h3>
        <p className="text-muted-foreground mb-4">
          We use your contact information to send order alerts, payment confirmations, platform updates, promotional communications (with your consent), and important service announcements via push notifications, SMS, email, or in-app messages.
        </p>

        <h3 className="text-lg font-medium mb-3">4.4 Fraud Prevention</h3>
        <p className="text-muted-foreground mb-4">
          We analyze transaction patterns, order behavior, and account activities to detect, prevent, and investigate fraudulent activities, fake orders, price manipulation, policy violations, and other security threats.
        </p>

        <h3 className="text-lg font-medium mb-3">4.5 Legal Compliance</h3>
        <p className="text-muted-foreground">
          We may use and retain your data to comply with applicable laws, regulations, legal processes, government requests, tax obligations, and to establish, exercise, or defend legal claims.
        </p>
      </section>

      {/* 5. Data Sharing */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Data Sharing</h2>
        
        <h3 className="text-lg font-medium mb-3">5.1 With Customers</h3>
        <p className="text-muted-foreground mb-4">
          We share limited seller information with customers including your store name, business address (general area, not exact address), product details, ratings, and contact details only when necessary for order-related communication.
        </p>

        <h3 className="text-lg font-medium mb-3">5.2 With Delivery Partners</h3>
        <p className="text-muted-foreground mb-4">
          To facilitate order pickup and delivery, we share your store address, order details, and contact information with assigned delivery partners.
        </p>

        <h3 className="text-lg font-medium mb-3">5.3 With Admin and Internal Teams</h3>
        <p className="text-muted-foreground mb-4">
          Our internal teams access your data for seller verification, dispute resolution, customer support, performance monitoring, and platform improvement purposes.
        </p>

        <h3 className="text-lg font-medium mb-3">5.4 With Third-Party Service Providers</h3>
        <p className="text-muted-foreground mb-4">
          We may share data with trusted third-party providers for:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li><strong>Payment Processing:</strong> Payment gateways (e.g., Razorpay) to process transactions</li>
          <li><strong>Push Notifications:</strong> Services like OneSignal for order and promotional alerts</li>
          <li><strong>Analytics:</strong> Tools to analyze app performance and user behavior</li>
          <li><strong>Cloud Infrastructure:</strong> Hosting and database services (e.g., Supabase)</li>
          <li><strong>Communication:</strong> SMS and email service providers for transactional messages</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          All third-party providers are contractually bound to maintain data confidentiality and use data only for specified purposes.
        </p>
      </section>

      {/* 6. Data Storage & Security */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. Data Storage & Security Measures</h2>
        <p className="text-muted-foreground mb-4">
          We implement industry-standard security measures to protect your data:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Encryption:</strong> Data is encrypted in transit using TLS/SSL and at rest using AES-256 encryption</li>
          <li><strong>Access Controls:</strong> Role-based access ensuring only authorized personnel can access sensitive data</li>
          <li><strong>Secure Infrastructure:</strong> Data stored on secure cloud servers with regular security audits</li>
          <li><strong>Authentication:</strong> Multi-factor authentication and secure session management</li>
          <li><strong>Monitoring:</strong> Continuous monitoring for unauthorized access or suspicious activities</li>
          <li><strong>Regular Backups:</strong> Automated backups to prevent data loss</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          While we implement robust security measures, no method of electronic storage or transmission is 100% secure. We encourage you to protect your account credentials and report any suspicious activity immediately.
        </p>
      </section>

      {/* 7. Data Retention */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. Data Retention Policy</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Active Account Data:</strong> Retained as long as your seller account remains active</li>
          <li><strong>Transaction Records:</strong> Retained for a minimum of 7 years as per Indian tax and accounting regulations</li>
          <li><strong>Order History:</strong> Retained for 3 years after order completion for dispute resolution and analytics</li>
          <li><strong>KYC Documents:</strong> Retained for the duration of your account plus 5 years after account closure</li>
          <li><strong>Communication Records:</strong> Retained for 2 years for quality and dispute resolution purposes</li>
          <li><strong>Post-Termination:</strong> Upon account termination, we retain data as required by law and delete other data within 90 days</li>
        </ul>
      </section>

      {/* 8. Seller Rights */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. Seller Rights</h2>
        
        <h3 className="text-lg font-medium mb-3">8.1 Right to Access</h3>
        <p className="text-muted-foreground mb-4">
          You have the right to request access to your personal data that we hold. You can view most of your data directly through the Seller App settings and profile sections.
        </p>

        <h3 className="text-lg font-medium mb-3">8.2 Right to Update</h3>
        <p className="text-muted-foreground mb-4">
          You can update your profile information, business details, bank details, and preferences through the Seller App. For changes to verified information (like GSTIN), additional verification may be required.
        </p>

        <h3 className="text-lg font-medium mb-3">8.3 Right to Deletion (with conditions)</h3>
        <p className="text-muted-foreground mb-4">
          You may request deletion of your account and personal data. However, please note:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>All pending orders must be fulfilled or cancelled</li>
          <li>All pending payouts must be settled</li>
          <li>Any outstanding disputes must be resolved</li>
          <li>We may retain certain data as required by law</li>
          <li>Transaction records may be retained for tax compliance</li>
          <li>Account deletion is irreversible</li>
        </ul>
      </section>

      {/* 9. Cookies & Tracking */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">9. Cookies & Tracking Technologies</h2>
        <p className="text-muted-foreground mb-4">
          The Seller App and associated web portals may use cookies and similar tracking technologies:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Essential Cookies:</strong> Required for app functionality, authentication, and security</li>
          <li><strong>Analytics Cookies:</strong> To understand app usage patterns and improve our services</li>
          <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
          <li><strong>Push Tokens:</strong> Device tokens for delivering push notifications</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          You can manage cookie preferences through your browser or device settings. Disabling essential cookies may affect app functionality.
        </p>
      </section>

      {/* 10. Changes to Privacy Policy */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
        <p className="text-muted-foreground mb-4">
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>We will notify you via email, push notification, or in-app notice</li>
          <li>We will update the "Last Updated" date at the top of this policy</li>
          <li>We may require you to accept the updated policy to continue using the Seller App</li>
          <li>Continued use of the Seller App after changes constitutes acceptance of the revised policy</li>
        </ul>
      </section>

      {/* 11. Contact Information */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">11. Contact Information</h2>
        <p className="text-muted-foreground mb-4">
          For any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
        </p>
        <ul className="list-none space-y-2 text-muted-foreground">
          <li><strong>Email:</strong> privacy@zaago.in</li>
          <li><strong>Grievance Officer:</strong> support@zaago.in</li>
          <li><strong>Response Time:</strong> We aim to respond to all requests within 30 days</li>
        </ul>
      </section>

      {/* 12. Governing Law */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">12. Governing Law</h2>
        <p className="text-muted-foreground">
          This Privacy Policy is governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with this Privacy Policy shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.
        </p>
      </section>
    </div>
  );
};

export const PRIVACY_POLICY_VERSION = POLICY_VERSION;
export const PRIVACY_POLICY_LAST_UPDATED = LAST_UPDATED;

export default PrivacyPolicyContent;
