import React from 'react';

const LAST_UPDATED = "December 27, 2024";
const VERSION = "1.0";

export const TermsConditionsContent = () => {
  return (
    <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
      <p className="text-sm text-muted-foreground mb-6">
        Last Updated: {LAST_UPDATED} | Version: {VERSION}
      </p>

      {/* 1. Seller Eligibility & Onboarding */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Seller Eligibility & Onboarding Rules</h2>
        <p className="text-muted-foreground mb-4">
          To register as a Seller on the Zaago Platform, you must meet the following eligibility criteria:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Be at least 18 years of age or the age of legal majority in your jurisdiction</li>
          <li>Have the legal capacity to enter into binding contracts</li>
          <li>Possess all necessary licenses, permits, and authorizations to sell products (including FSSAI license for food products, if applicable)</li>
          <li>Provide accurate and complete business information during registration</li>
          <li>Complete KYC (Know Your Customer) verification as required</li>
          <li>Have a valid bank account in India for receiving payments</li>
          <li>Accept and comply with these Terms and Conditions and the Privacy Policy</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Zaago reserves the right to approve, reject, or terminate any seller account at its sole discretion without providing reasons. Approval is subject to verification of submitted documents and compliance with platform guidelines.
        </p>
      </section>

      {/* 2. Seller Account Responsibilities */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Seller Account Responsibilities</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Maintain the confidentiality and security of your account credentials</li>
          <li>Ensure all information provided is accurate, current, and complete</li>
          <li>Promptly update any changes to your business information, contact details, or banking information</li>
          <li>Not share your account with third parties or allow unauthorized access</li>
          <li>Immediately notify Zaago of any unauthorized use of your account</li>
          <li>Be solely responsible for all activities that occur under your account</li>
          <li>Maintain professional conduct in all interactions with customers, delivery agents, and platform support</li>
        </ul>
      </section>

      {/* 3. Product Listing Rules */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Product Listing Rules</h2>
        
        <h3 className="text-lg font-medium mb-3">3.1 Accuracy Requirements</h3>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li><strong>Pricing:</strong> List accurate MRP, selling price, and any applicable discounts. Prices must include all taxes where applicable.</li>
          <li><strong>Stock/Inventory:</strong> Maintain accurate stock levels. Do not list products that are unavailable or out of stock.</li>
          <li><strong>Product Images:</strong> Use clear, accurate images that represent the actual product. Do not use misleading or stock images that don't represent your product.</li>
          <li><strong>Descriptions:</strong> Provide accurate product descriptions including ingredients, weight/quantity, manufacturing date, expiry date (for applicable products), and other relevant details.</li>
          <li><strong>Categories:</strong> List products in appropriate categories for easy customer discovery.</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">3.2 Prohibited Products</h3>
        <p className="text-muted-foreground mb-4">
          The following products are strictly prohibited on the Zaago Platform:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Illegal drugs, narcotics, or controlled substances</li>
          <li>Alcohol, tobacco, and related products (unless specifically permitted with valid licenses)</li>
          <li>Weapons, ammunition, and explosives</li>
          <li>Counterfeit, pirated, or trademark-infringing products</li>
          <li>Expired, adulterated, or unsafe food products</li>
          <li>Prescription medications without valid pharmacy license</li>
          <li>Products that violate any applicable law or regulation</li>
          <li>Adult content or age-restricted material</li>
          <li>Hazardous materials or chemicals</li>
          <li>Products promoting violence, hatred, or discrimination</li>
        </ul>
      </section>

      {/* 4. Order Management */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Order Management</h2>
        
        <h3 className="text-lg font-medium mb-3">4.1 Order Acceptance & Rejection</h3>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Accept or reject orders within the specified timeframe (typically 2-5 minutes for quick commerce)</li>
          <li>Orders not responded to within the deadline may be auto-cancelled or reassigned</li>
          <li>Rejection should be based on valid reasons (out of stock, store closed, unable to fulfill)</li>
          <li>Excessive or unjustified rejections may affect your seller rating and account standing</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">4.2 Order Fulfillment Timelines</h3>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
          <li>Prepare orders within the committed preparation time</li>
          <li>Ensure products are properly packed and ready for delivery agent pickup</li>
          <li>Maintain quality and hygiene standards during order preparation</li>
          <li>Communicate any delays proactively through the platform</li>
        </ul>

        <h3 className="text-lg font-medium mb-3">4.3 Cancellations & Refunds</h3>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Seller-initiated cancellations should be minimized and done only when absolutely necessary</li>
          <li>If you cancel an order after acceptance, you may be liable for customer refunds and applicable penalties</li>
          <li>Refund requests due to product quality issues, wrong items, or missing items will be investigated</li>
          <li>Sellers may be charged for refunds if the issue is attributable to the seller</li>
          <li>Repeat cancellations or quality issues may result in account suspension</li>
        </ul>
      </section>

      {/* 5. Commission & Payment Settlement */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Commission & Payment Settlement Terms</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Zaago charges a commission on each successful order as per the agreed rate (communicated during onboarding)</li>
          <li>Commission rates may vary by product category and may be revised with prior notice</li>
          <li>Payment settlement cycles are weekly or as otherwise specified</li>
          <li>Settlements are made to the registered bank account after deducting commissions, taxes, and any applicable charges</li>
          <li>A detailed settlement report is provided with each payout</li>
          <li>Disputes regarding settlements must be raised within 7 days of settlement date</li>
          <li>Zaago reserves the right to hold settlements in case of suspected fraud or policy violations</li>
        </ul>
      </section>

      {/* 6. Taxes & Compliance */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. Taxes & Compliance Responsibility</h2>
        <p className="text-muted-foreground mb-4">
          As a Seller on the Zaago Platform, you are solely responsible for:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Obtaining and maintaining all necessary business licenses, permits, and registrations</li>
          <li>GST registration and compliance (if applicable based on turnover thresholds)</li>
          <li>Filing accurate tax returns and paying applicable taxes</li>
          <li>Compliance with FSSAI regulations for food products</li>
          <li>Maintaining proper invoicing and accounting records</li>
          <li>Complying with all applicable local, state, and central laws and regulations</li>
          <li>Product labeling requirements as per Legal Metrology Act</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Zaago is not responsible for any tax liabilities, penalties, or legal consequences arising from your non-compliance.
        </p>
      </section>

      {/* 7. Seller Ratings & Performance */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. Seller Ratings & Performance Monitoring</h2>
        <p className="text-muted-foreground mb-4">
          Your seller performance is monitored based on the following metrics:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Order Acceptance Rate:</strong> Percentage of orders accepted within the specified timeframe</li>
          <li><strong>Order Fulfillment Rate:</strong> Percentage of accepted orders successfully fulfilled</li>
          <li><strong>Customer Ratings:</strong> Average rating from customer reviews</li>
          <li><strong>Cancellation Rate:</strong> Seller-initiated order cancellations</li>
          <li><strong>Response Time:</strong> Average time to accept/reject orders</li>
          <li><strong>Quality Issues:</strong> Complaints related to product quality, wrong items, or missing items</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Sellers with consistently poor performance may face reduced visibility, warning notices, temporary suspension, or permanent termination.
        </p>
      </section>

      {/* 8. Penalties, Suspension & Termination */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. Penalties, Suspension & Termination Rules</h2>
        <p className="text-muted-foreground mb-4">
          Zaago may take the following actions for violations:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Warning:</strong> First-time minor violations may result in a warning notice</li>
          <li><strong>Penalties:</strong> Financial penalties may be deducted from settlements for specific violations</li>
          <li><strong>Temporary Suspension:</strong> Account may be temporarily suspended for serious or repeated violations</li>
          <li><strong>Permanent Termination:</strong> Severe violations may result in immediate and permanent account termination</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Grounds for immediate termination include:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Fraudulent activities or misrepresentation</li>
          <li>Selling prohibited or illegal products</li>
          <li>Multiple instances of severe customer complaints</li>
          <li>Violation of any applicable law</li>
          <li>Breach of these Terms and Conditions</li>
        </ul>
      </section>

      {/* 9. Misuse, Fraud & Manipulation */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">9. Misuse, Fraud, Fake Orders & Price Manipulation</h2>
        <p className="text-muted-foreground mb-4">
          The following activities are strictly prohibited and may result in immediate termination and legal action:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Creating fake orders or self-purchasing to inflate sales metrics</li>
          <li>Price manipulation including bait-and-switch tactics</li>
          <li>Manipulating ratings through fake reviews or incentivized reviews</li>
          <li>Providing false or misleading information about products</li>
          <li>Circumventing platform fees or commission structures</li>
          <li>Colluding with delivery agents to manipulate delivery status</li>
          <li>Any form of money laundering or financial fraud</li>
          <li>Attempting to contact customers outside the platform for transactions</li>
        </ul>
      </section>

      {/* 10. Intellectual Property */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">10. Intellectual Property Ownership</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>All trademarks, logos, and branding elements of Zaago are the exclusive property of Zaago</li>
          <li>You retain ownership of your product content, images, and descriptions that you upload</li>
          <li>By uploading content, you grant Zaago a non-exclusive, royalty-free license to use, display, and distribute such content on the platform</li>
          <li>You warrant that your content does not infringe on any third-party intellectual property rights</li>
          <li>Zaago may remove content that violates intellectual property rights without notice</li>
        </ul>
      </section>

      {/* 11. Platform Rights */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">11. Platform Rights to Modify Services</h2>
        <p className="text-muted-foreground mb-4">
          Zaago reserves the right to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Modify, suspend, or discontinue any feature or service at any time</li>
          <li>Change commission rates with prior notice</li>
          <li>Update these Terms and Conditions</li>
          <li>Implement new policies or guidelines</li>
          <li>Restrict or limit seller visibility or features based on performance</li>
          <li>Conduct audits of seller accounts and transactions</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Material changes will be communicated with reasonable advance notice. Continued use of the platform constitutes acceptance of such changes.
        </p>
      </section>

      {/* 12. Limitation of Liability */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">12. Limitation of Liability</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Zaago provides the platform on an "as is" and "as available" basis</li>
          <li>We do not guarantee uninterrupted or error-free service</li>
          <li>Zaago is not liable for any indirect, incidental, special, consequential, or punitive damages</li>
          <li>Our total liability is limited to the commission earned from your account in the preceding 3 months</li>
          <li>Zaago is not responsible for delivery delays caused by delivery agents or external factors</li>
          <li>We are not liable for losses due to customer disputes, chargebacks, or refunds caused by seller issues</li>
        </ul>
      </section>

      {/* 13. Indemnification */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">13. Indemnification Clause</h2>
        <p className="text-muted-foreground mb-4">
          You agree to indemnify, defend, and hold harmless Zaago, its affiliates, officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including legal fees) arising out of or in connection with:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Your use of the Seller App</li>
          <li>Your products or services sold through the platform</li>
          <li>Your violation of these Terms and Conditions</li>
          <li>Your violation of any applicable law or regulation</li>
          <li>Your infringement of any third-party rights</li>
          <li>Any claims by customers related to your products</li>
        </ul>
      </section>

      {/* 14. Governing Law */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">14. Governing Law</h2>
        <p className="text-muted-foreground">
          These Terms and Conditions are governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India for any disputes arising out of or relating to these Terms.
        </p>
      </section>

      {/* 15. Dispute Resolution */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">15. Dispute Resolution</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Informal Resolution:</strong> Parties shall first attempt to resolve disputes through good faith negotiation</li>
          <li><strong>Mediation:</strong> If informal resolution fails, disputes shall be referred to mediation administered by a mutually agreed mediator</li>
          <li><strong>Arbitration:</strong> If mediation fails, disputes shall be resolved through binding arbitration under the Arbitration and Conciliation Act, 1996</li>
          <li><strong>Jurisdiction:</strong> The seat of arbitration shall be Bengaluru, Karnataka, India</li>
          <li><strong>Language:</strong> Proceedings shall be conducted in English</li>
        </ul>
      </section>

      {/* 16. Force Majeure */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">16. Force Majeure</h2>
        <p className="text-muted-foreground">
          Neither party shall be liable for any failure or delay in performing their obligations where such failure or delay results from Force Majeure events including but not limited to: natural disasters, epidemics, pandemics, war, terrorism, riots, government actions, internet or telecommunications failures, or any other events beyond the reasonable control of the affected party. The affected party must notify the other party promptly and make reasonable efforts to mitigate the impact.
        </p>
      </section>

      {/* 17. Updates to Terms */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">17. Updates to Terms</h2>
        <p className="text-muted-foreground mb-4">
          Zaago may update these Terms and Conditions from time to time. When we make material changes:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>We will notify you via email, push notification, or in-app notice at least 15 days before the changes take effect</li>
          <li>We will update the "Last Updated" date at the top of these Terms</li>
          <li>You may be required to accept the updated Terms to continue using the Seller App</li>
          <li>If you do not agree to the updated Terms, you must discontinue using the platform</li>
          <li>Continued use of the Seller App after changes take effect constitutes acceptance of the revised Terms</li>
        </ul>
      </section>

      {/* 18. Severability */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">18. Severability</h2>
        <p className="text-muted-foreground">
          If any provision of these Terms and Conditions is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity shall not affect the validity of the remaining provisions, which shall continue in full force and effect.
        </p>
      </section>

      {/* 19. Entire Agreement */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">19. Entire Agreement</h2>
        <p className="text-muted-foreground">
          These Terms and Conditions, together with the Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and Zaago regarding your use of the Seller App and supersede all prior agreements, understandings, or representations.
        </p>
      </section>

      {/* Contact */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
        <p className="text-muted-foreground mb-4">
          For any questions regarding these Terms and Conditions:
        </p>
        <ul className="list-none space-y-2 text-muted-foreground">
          <li><strong>Email:</strong> legal@zaago.in</li>
          <li><strong>Support:</strong> support@zaago.in</li>
        </ul>
      </section>
    </div>
  );
};

export const TERMS_VERSION = VERSION;
export const TERMS_LAST_UPDATED = LAST_UPDATED;

export default TermsConditionsContent;
